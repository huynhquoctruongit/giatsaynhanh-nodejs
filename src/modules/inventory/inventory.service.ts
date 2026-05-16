import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { BadRequestError, NotFoundError } from '../../helpers/utils/errors';
import type {
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
  CreateInventoryLogInput,
} from '../../helpers/validators/inventory.schema';

export const inventoryService = {
  // ── Items ─────────────────────────────────────────────────────────────────

  async listItems(params: {
    search?: string;
    isActive?: boolean;
    page: number;
    pageSize: number;
  }) {
    const { search, isActive, page, pageSize } = params;
    const where: Prisma.InventoryItemWhereInput = {
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search ? { name: { contains: search } } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.inventoryItem.count({ where }),
      prisma.inventoryItem.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { items, total, page, pageSize };
  },

  async getItemById(id: string) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { createdBy: { select: { id: true, name: true } } },
        },
      },
    });
    if (!item) throw new NotFoundError('Inventory item not found');
    return item;
  },

  async createItem(input: CreateInventoryItemInput) {
    return prisma.inventoryItem.create({ data: input });
  },

  async updateItem(id: string, input: UpdateInventoryItemInput) {
    await this.getItemById(id);
    return prisma.inventoryItem.update({ where: { id }, data: input });
  },

  async softDeleteItem(id: string) {
    await this.getItemById(id);
    return prisma.inventoryItem.update({ where: { id }, data: { isActive: false } });
  },

  async getLowStockItems() {
    const items = await prisma.inventoryItem.findMany({
      where: {
        isActive: true,
        minQuantity: { not: null },
      },
    });
    return items.filter(
      (item) => item.minQuantity !== null && Number(item.quantity) <= Number(item.minQuantity),
    );
  },

  // ── Logs ──────────────────────────────────────────────────────────────────

  async createLog(input: CreateInventoryLogInput, createdById: string) {
    const item = await prisma.inventoryItem.findUnique({ where: { id: input.itemId } });
    if (!item) throw new NotFoundError('Inventory item not found');

    return prisma.$transaction(async (tx) => {
      const currentQty = Number(item.quantity);
      let newQuantity: number;
      if (input.type === 'IMPORT') {
        newQuantity = currentQty + input.quantity;
      } else if (input.type === 'EXPORT') {
        newQuantity = currentQty - input.quantity;
        if (newQuantity < 0) {
          throw new BadRequestError('Insufficient quantity for export');
        }
      } else {
        // ADJUST
        newQuantity = input.quantity;
      }

      await tx.inventoryItem.update({
        where: { id: input.itemId },
        data: { quantity: newQuantity },
      });

      return tx.inventoryLog.create({
        data: {
          itemId: input.itemId,
          type: input.type,
          quantity: input.quantity,
          unitPrice: input.unitPrice,
          note: input.note,
          createdById,
        },
        include: {
          item: { select: { id: true, name: true, unit: true, quantity: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });
    });
  },

  async listLogs(params: {
    itemId?: string;
    type?: 'IMPORT' | 'EXPORT' | 'ADJUST';
    from?: Date;
    to?: Date;
    page: number;
    pageSize: number;
  }) {
    const { itemId, type, from, to, page, pageSize } = params;
    const where: Prisma.InventoryLogWhereInput = {
      ...(itemId ? { itemId } : {}),
      ...(type ? { type } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.inventoryLog.count({ where }),
      prisma.inventoryLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          item: { select: { id: true, name: true, unit: true } },
          createdBy: { select: { id: true, name: true } },
        },
      }),
    ]);

    return { items, total, page, pageSize };
  },
};
