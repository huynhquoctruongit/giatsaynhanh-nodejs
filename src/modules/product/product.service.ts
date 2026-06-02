import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { NotFoundError } from '../../helpers/utils/errors';
import type {
  CreateProductInput,
  UpdateProductInput,
} from '../../helpers/validators/product.schema';

/** Chuyển null → Prisma.JsonNull để Prisma lưu JSON nullable đúng cách */
function toJsonField(v: unknown[] | null | undefined): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (v === null) return Prisma.JsonNull;
  if (v === undefined) return undefined;
  return v as Prisma.InputJsonValue;
}

export const productService = {
  async list(params: {
    search?: string;
    isActive?: boolean;
    page: number;
    pageSize: number;
  }) {
    const { search, isActive, page, pageSize } = params;
    const where: Prisma.ProductWhereInput = {
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search ? { name: { contains: search } } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { items, total, page, pageSize };
  },

  async getById(id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError('Product not found');
    return product;
  },

  async create(input: CreateProductInput) {
    const { wholesaleTiers, ...rest } = input;
    // Dịch vụ mới xếp xuống cuối danh sách ưu tiên
    const max = await prisma.product.aggregate({ _max: { sortOrder: true } });
    const sortOrder = (max._max.sortOrder ?? -1) + 1;
    return prisma.product.create({
      data: { ...rest, sortOrder, wholesaleTiers: toJsonField(wholesaleTiers) },
    });
  },

  async update(id: string, input: UpdateProductInput) {
    await this.getById(id);
    const { wholesaleTiers, ...rest } = input;
    return prisma.product.update({
      where: { id },
      data: { ...rest, ...(wholesaleTiers !== undefined ? { wholesaleTiers: toJsonField(wholesaleTiers) } : {}) },
    });
  },

  async remove(id: string) {
    await this.getById(id);
    return prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  },

  /** Cập nhật độ ưu tiên hiển thị: index trong mảng id = sortOrder (0 lên đầu). */
  async reorder(ids: string[]) {
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.product.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );
    return { success: true };
  },
};
