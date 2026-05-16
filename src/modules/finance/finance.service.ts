import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { NotFoundError } from '../../helpers/utils/errors';
import type {
  CreateTransactionInput,
  UpdateTransactionInput,
} from '../../helpers/validators/transaction.schema';

export const financeService = {
  async list(params: {
    type?: 'INCOME' | 'EXPENSE';
    from?: Date;
    to?: Date;
    page: number;
    pageSize: number;
  }) {
    const { type, from, to, page, pageSize } = params;
    const where: Prisma.TransactionWhereInput = {
      ...(type ? { type } : {}),
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { date: 'desc' },
        include: { createdBy: { select: { id: true, name: true } } },
      }),
    ]);

    return { items, total, page, pageSize };
  },

  async getById(id: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    if (!transaction) throw new NotFoundError('Transaction not found');
    return transaction;
  },

  async create(input: CreateTransactionInput, createdById: string) {
    return prisma.transaction.create({
      data: {
        ...input,
        createdById,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });
  },

  async update(id: string, input: UpdateTransactionInput) {
    await this.getById(id);
    return prisma.transaction.update({
      where: { id },
      data: input,
      include: { createdBy: { select: { id: true, name: true } } },
    });
  },

  async remove(id: string) {
    await this.getById(id);
    await prisma.transaction.delete({ where: { id } });
  },

  async summary(params: { from?: Date; to?: Date }) {
    const { from, to } = params;
    const dateFilter: Prisma.TransactionWhereInput = from || to
      ? {
          date: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {};

    const [incomeResult, expenseResult, byCategory] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ...dateFilter, type: 'INCOME' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { ...dateFilter, type: 'EXPENSE' },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ['category', 'type'],
        where: dateFilter,
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
    ]);

    const totalIncome = Number(incomeResult._sum.amount ?? 0);
    const totalExpense = Number(expenseResult._sum.amount ?? 0);
    const balance = totalIncome - totalExpense;

    return {
      totalIncome,
      totalExpense,
      balance,
      byCategory: byCategory.map((r) => ({
        category: r.category,
        type: r.type,
        total: Number(r._sum.amount ?? 0),
      })),
    };
  },
};
