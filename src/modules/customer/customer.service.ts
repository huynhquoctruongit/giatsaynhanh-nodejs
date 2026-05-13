import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { NotFoundError } from '../../helpers/utils/errors';
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
} from '../../helpers/validators/customer.schema';

export const customerService = {
  async list(params: { search?: string; page: number; pageSize: number }) {
    const { search, page, pageSize } = params;
    const where: Prisma.CustomerWhereInput = search
      ? {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
          ],
        }
      : {};

    const [total, items] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { items, total, page, pageSize };
  },

  async getById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { orders: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
    if (!customer) throw new NotFoundError('Customer not found');
    return customer;
  },

  async create(input: CreateCustomerInput) {
    return prisma.customer.create({ data: input });
  },

  async update(id: string, input: UpdateCustomerInput) {
    await this.getById(id);
    return prisma.customer.update({ where: { id }, data: input });
  },

  async remove(id: string) {
    await this.getById(id);
    await prisma.customer.delete({ where: { id } });
  },
};
