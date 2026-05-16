import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { NotFoundError } from '../../helpers/utils/errors';
import type {
  CreateCustomerDebtInput,
  UpdateCustomerDebtInput,
  CreateSupplierDebtInput,
  UpdateSupplierDebtInput,
  PayDebtInput,
} from '../../helpers/validators/debt.schema';

export const debtService = {
  // ── Customer debts ──────────────────────────────────────────────────────────

  async listCustomerDebts(params: {
    customerId?: string;
    isPaid?: boolean;
    page: number;
    pageSize: number;
  }) {
    const { customerId, isPaid, page, pageSize } = params;
    const where: Prisma.CustomerDebtWhereInput = {
      ...(customerId ? { customerId } : {}),
      ...(isPaid !== undefined ? { isPaid } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.customerDebt.count({ where }),
      prisma.customerDebt.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { id: true, name: true, phone: true } } },
      }),
    ]);

    return { items, total, page, pageSize };
  },

  async getCustomerDebtById(id: string) {
    const debt = await prisma.customerDebt.findUnique({
      where: { id },
      include: { customer: { select: { id: true, name: true, phone: true } } },
    });
    if (!debt) throw new NotFoundError('Customer debt not found');
    return debt;
  },

  async createCustomerDebt(input: CreateCustomerDebtInput) {
    const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) throw new NotFoundError('Customer not found');
    return prisma.customerDebt.create({
      data: input,
      include: { customer: { select: { id: true, name: true, phone: true } } },
    });
  },

  async updateCustomerDebt(id: string, input: UpdateCustomerDebtInput) {
    await this.getCustomerDebtById(id);
    return prisma.customerDebt.update({
      where: { id },
      data: input,
      include: { customer: { select: { id: true, name: true, phone: true } } },
    });
  },

  async removeCustomerDebt(id: string) {
    await this.getCustomerDebtById(id);
    await prisma.customerDebt.delete({ where: { id } });
  },

  async payCustomerDebt(id: string, input: PayDebtInput) {
    await this.getCustomerDebtById(id);
    return prisma.customerDebt.update({
      where: { id },
      data: {
        isPaid: true,
        paidAt: new Date(),
        paidAmount: input.paidAmount,
      },
      include: { customer: { select: { id: true, name: true, phone: true } } },
    });
  },

  // ── Supplier debts ───────────────────────────────────────────────────────────

  async listSupplierDebts(params: {
    supplierId?: string;
    isPaid?: boolean;
    page: number;
    pageSize: number;
  }) {
    const { supplierId, isPaid, page, pageSize } = params;
    const where: Prisma.SupplierDebtWhereInput = {
      ...(supplierId ? { supplierId } : {}),
      ...(isPaid !== undefined ? { isPaid } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.supplierDebt.count({ where }),
      prisma.supplierDebt.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { supplier: { select: { id: true, name: true, phone: true } } },
      }),
    ]);

    return { items, total, page, pageSize };
  },

  async getSupplierDebtById(id: string) {
    const debt = await prisma.supplierDebt.findUnique({
      where: { id },
      include: { supplier: { select: { id: true, name: true, phone: true } } },
    });
    if (!debt) throw new NotFoundError('Supplier debt not found');
    return debt;
  },

  async createSupplierDebt(input: CreateSupplierDebtInput) {
    const supplier = await prisma.supplier.findUnique({ where: { id: input.supplierId } });
    if (!supplier) throw new NotFoundError('Supplier not found');
    return prisma.supplierDebt.create({
      data: input,
      include: { supplier: { select: { id: true, name: true, phone: true } } },
    });
  },

  async updateSupplierDebt(id: string, input: UpdateSupplierDebtInput) {
    await this.getSupplierDebtById(id);
    return prisma.supplierDebt.update({
      where: { id },
      data: input,
      include: { supplier: { select: { id: true, name: true, phone: true } } },
    });
  },

  async removeSupplierDebt(id: string) {
    await this.getSupplierDebtById(id);
    await prisma.supplierDebt.delete({ where: { id } });
  },

  async paySupplierDebt(id: string, input: PayDebtInput) {
    await this.getSupplierDebtById(id);
    return prisma.supplierDebt.update({
      where: { id },
      data: {
        isPaid: true,
        paidAt: new Date(),
        paidAmount: input.paidAmount,
      },
      include: { supplier: { select: { id: true, name: true, phone: true } } },
    });
  },

  // ── Summary ──────────────────────────────────────────────────────────────────

  async summary() {
    const [customerUnpaid, customerPaid, supplierUnpaid, supplierPaid] = await Promise.all([
      prisma.customerDebt.aggregate({ where: { isPaid: false }, _sum: { amount: true } }),
      prisma.customerDebt.aggregate({ where: { isPaid: true }, _sum: { paidAmount: true } }),
      prisma.supplierDebt.aggregate({ where: { isPaid: false }, _sum: { amount: true } }),
      prisma.supplierDebt.aggregate({ where: { isPaid: true }, _sum: { paidAmount: true } }),
    ]);

    return {
      customerDebtTotal: Number(customerUnpaid._sum.amount ?? 0),
      supplierDebtTotal: Number(supplierUnpaid._sum.amount ?? 0),
      customerPaidTotal: Number(customerPaid._sum.paidAmount ?? 0),
      supplierPaidTotal: Number(supplierPaid._sum.paidAmount ?? 0),
    };
  },
};
