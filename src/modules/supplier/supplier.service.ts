import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { NotFoundError } from '../../helpers/utils/errors';
import type {
  CreateSupplierInput,
  UpdateSupplierInput,
} from '../../helpers/validators/supplier.schema';

export const supplierService = {
  async list(params: {
    search?: string;
    isActive?: boolean;
    page: number;
    pageSize: number;
  }) {
    const { search, isActive, page, pageSize } = params;
    const where: Prisma.SupplierWhereInput = {
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { phone: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { debts: true } },
        },
      }),
    ]);

    return { items, total, page, pageSize };
  },

  async getById(id: string) {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: { select: { debts: true } },
        debts: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!supplier) throw new NotFoundError('Supplier not found');
    return supplier;
  },

  async create(input: CreateSupplierInput) {
    return prisma.supplier.create({ data: input });
  },

  async update(id: string, input: UpdateSupplierInput) {
    await this.getById(id);
    return prisma.supplier.update({ where: { id }, data: input });
  },

  async softDelete(id: string) {
    await this.getById(id);
    return prisma.supplier.update({ where: { id }, data: { isActive: false } });
  },
};
