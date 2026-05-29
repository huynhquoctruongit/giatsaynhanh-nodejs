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
        orderBy: { createdAt: 'desc' },
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
    return prisma.product.create({
      data: { ...rest, wholesaleTiers: toJsonField(wholesaleTiers) },
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
};
