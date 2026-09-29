import { prisma } from '../../config/prisma';
import { monthRangeVN } from '../../helpers/utils/timesheet';

// Thành tiền 1 dòng — khớp order.service: có cân thì cân × đơn giá × SL.
const lineTotal = (i: { quantity: number; unitPrice: unknown; weight: unknown }) => {
  const price = Number(i.unitPrice ?? 0);
  const weight = Number(i.weight ?? 0);
  return weight > 0 ? weight * price * (i.quantity || 1) : i.quantity * price;
};

function prevMonth(month: string) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// Gom theo dịch vụ: có productId thì theo sản phẩm (đổi tên vẫn gộp), không thì theo tên dòng.
const serviceKey = (i: { productId: string | null; name: string }) =>
  i.productId ?? `name:${i.name.trim().toLowerCase()}`;

function itemsInMonth(month: string) {
  const { from, to } = monthRangeVN(month);
  return prisma.orderItem.findMany({
    where: { order: { createdAt: { gte: from, lt: to }, status: { not: 'CANCELLED' } } },
    select: {
      productId: true,
      name: true,
      quantity: true,
      weight: true,
      unitPrice: true,
      product: { select: { name: true, unit: true } },
      order: {
        select: {
          id: true,
          createdAt: true,
          customerId: true,
          customer: { select: { name: true, phone: true } },
        },
      },
    },
  });
}

interface CustomerAgg {
  customerId: string;
  name: string;
  phone: string | null;
  revenue: number;
  orderIds: Set<string>;
  quantity: number;
  weight: number;
  lastAt: Date;
}

interface ServiceAgg {
  key: string;
  productId: string | null;
  name: string;
  unit: string | null;
  revenue: number;
  orderIds: Set<string>;
  quantity: number;
  weight: number;
  customers: Map<string, CustomerAgg>;
}

/**
 * Thống kê theo dịch vụ trong 1 tháng (giờ VN): doanh thu (theo thành tiền từng dòng,
 * trước giảm giá cấp đơn), số đơn, số khách, SL/kg, so với tháng trước, top 10 khách.
 * Tính theo ngày tạo đơn, bỏ đơn đã huỷ.
 */
export async function serviceStats(month: string) {
  const prev = prevMonth(month);
  const [items, prevItems] = await Promise.all([itemsInMonth(month), itemsInMonth(prev)]);

  const prevRevenue = new Map<string, number>();
  for (const i of prevItems) {
    const k = serviceKey(i);
    prevRevenue.set(k, (prevRevenue.get(k) ?? 0) + lineTotal(i));
  }

  const services = new Map<string, ServiceAgg>();
  const allOrders = new Set<string>();
  const allCustomers = new Set<string>();

  for (const i of items) {
    const k = serviceKey(i);
    const amount = lineTotal(i);
    const weight = Number(i.weight ?? 0);
    let s = services.get(k);
    if (!s) {
      s = {
        key: k,
        productId: i.productId,
        name: i.product?.name ?? i.name,
        unit: i.product?.unit ?? null,
        revenue: 0,
        orderIds: new Set(),
        quantity: 0,
        weight: 0,
        customers: new Map(),
      };
      services.set(k, s);
    }
    s.revenue += amount;
    s.orderIds.add(i.order.id);
    s.quantity += i.quantity;
    s.weight += weight > 0 ? weight * (i.quantity || 1) : 0;

    let c = s.customers.get(i.order.customerId);
    if (!c) {
      c = {
        customerId: i.order.customerId,
        name: i.order.customer.name,
        phone: i.order.customer.phone,
        revenue: 0,
        orderIds: new Set(),
        quantity: 0,
        weight: 0,
        lastAt: i.order.createdAt,
      };
      s.customers.set(i.order.customerId, c);
    }
    c.revenue += amount;
    c.orderIds.add(i.order.id);
    c.quantity += i.quantity;
    c.weight += weight > 0 ? weight * (i.quantity || 1) : 0;
    if (i.order.createdAt > c.lastAt) c.lastAt = i.order.createdAt;

    allOrders.add(i.order.id);
    allCustomers.add(i.order.customerId);
  }

  const totalRevenue = [...services.values()].reduce((sum, s) => sum + s.revenue, 0);
  const prevTotalRevenue = [...prevRevenue.values()].reduce((sum, v) => sum + v, 0);
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const growth = (cur: number, before: number) =>
    before > 0 ? Math.round(((cur - before) / before) * 1000) / 10 : null;

  const list = [...services.values()]
    .map((s) => {
      const before = prevRevenue.get(s.key) ?? 0;
      const topCustomers = [...s.customers.values()]
        .sort((a, b) => b.revenue - a.revenue || b.orderIds.size - a.orderIds.size)
        .slice(0, 10)
        .map((c) => ({
          customerId: c.customerId,
          name: c.name,
          phone: c.phone,
          revenue: c.revenue,
          orderCount: c.orderIds.size,
          quantity: c.quantity,
          weight: round(c.weight),
          lastAt: c.lastAt,
        }));
      return {
        key: s.key,
        productId: s.productId,
        name: s.name,
        unit: s.unit,
        revenue: s.revenue,
        share: totalRevenue > 0 ? Math.round((s.revenue / totalRevenue) * 1000) / 10 : 0,
        orderCount: s.orderIds.size,
        customerCount: s.customers.size,
        quantity: s.quantity,
        weight: round(s.weight),
        avgPerOrder: s.orderIds.size > 0 ? Math.round(s.revenue / s.orderIds.size) : 0,
        prevRevenue: before,
        growth: growth(s.revenue, before),
        topCustomers,
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.orderCount - a.orderCount);

  return {
    month,
    prevMonth: prev,
    totalRevenue,
    prevTotalRevenue,
    growth: growth(totalRevenue, prevTotalRevenue),
    totalOrders: allOrders.size,
    totalCustomers: allCustomers.size,
    serviceCount: list.length,
    services: list,
  };
}
