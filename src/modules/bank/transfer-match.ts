import { prismaUnscoped } from '../../config/prisma';
import { sendPush } from '../../lib/firebase';
import { fmtMoney, fmtVNTime } from '../../helpers/utils/notify-format';
import { calcGrandTotal } from '../../helpers/utils/invoice-totals';

/**
 * Mã đơn trong nội dung CK. QR hoá đơn gửi addInfo = mã đơn "LD-20260929-A55LH",
 * ngân hàng thường bỏ dấu "-" → "LD20260929A55LH" (có thể kẹp giữa chuỗi khác).
 */
const ORDER_CODE_RE = /(?:^|[^A-Z0-9])LD-?(\d{8})-?([A-Z0-9]{5})(?![A-Z0-9])/;

export function extractOrderCode(content: string | null | undefined): string | null {
  if (!content) return null;
  const m = content.toUpperCase().match(ORDER_CODE_RE);
  return m ? `LD-${m[1]}-${m[2]}` : null;
}

async function grandTotalOf(order: {
  shopId: string;
  totalAmount: unknown;
  discountAmount: unknown;
  bookingFromConvert: { id: string } | null;
}) {
  const settings = order.bookingFromConvert
    ? await prismaUnscoped.shopSettings.findUnique({
        where: { shopId: order.shopId },
        select: { bookingShippingFee: true, freeShipThreshold: true },
      })
    : null;
  return calcGrandTotal({ ...order, fromBooking: !!order.bookingFromConvert }, settings);
}

/**
 * Khớp 1 giao dịch tiền vào với đơn theo mã đơn trong nội dung:
 *  - gắn giao dịch vào đơn, cộng dồn Order.transferredAmount
 *  - đủ tiền (>= tổng cần thu) mà đơn chưa thanh toán → tự đánh dấu paidAt = giờ CK
 *  - `notify` (giao dịch mới) → báo "đã nhận tiền" tới máy POS quầy như loa
 * Dùng prismaUnscoped vì webhook không có tenant context — luôn lọc shopId thủ công.
 */
export async function matchTransferToOrder(
  tx: {
    id: string;
    shopId: string | null;
    orderId: string | null;
    direction: string;
    amount: unknown;
    content: string | null;
    transactionAt: Date;
  },
  notify: boolean,
) {
  if (tx.direction !== 'IN' || !tx.shopId || tx.orderId) return;
  const code = extractOrderCode(tx.content);
  if (!code) return;

  const order = await prismaUnscoped.order.findFirst({
    where: { shopId: tx.shopId, code },
    select: {
      id: true,
      code: true,
      shopId: true,
      totalAmount: true,
      discountAmount: true,
      paidAt: true,
      status: true,
      customer: { select: { name: true } },
      bookingFromConvert: { select: { id: true } },
    },
  });
  if (!order || order.status === 'CANCELLED') return;

  await prismaUnscoped.bankTransaction.update({ where: { id: tx.id }, data: { orderId: order.id } });
  const sum = await prismaUnscoped.bankTransaction.aggregate({
    where: { orderId: order.id, direction: 'IN' },
    _sum: { amount: true },
  });
  const transferred = Number(sum._sum.amount ?? 0);
  const due = await grandTotalOf(order);
  const fullyPaid = transferred >= due;

  await prismaUnscoped.order.update({
    where: { id: order.id },
    data: {
      transferredAmount: transferred,
      ...(fullyPaid && !order.paidAt ? { paidAt: tx.transactionAt } : {}),
    },
  });

  if (!notify) return;
  const settings = await prismaUnscoped.shopSettings.findUnique({
    where: { shopId: order.shopId },
    select: { posFcmTokens: true },
  });
  const tokens = settings?.posFcmTokens ?? [];
  if (!tokens.length) return;
  const short = order.code.split('-').pop();
  const status = fullyPaid ? 'đã thanh toán đủ' : `còn thiếu ${fmtMoney(due - transferred)}`;
  await sendPush(
    tokens,
    `💰 Đã nhận ${fmtMoney(Number(tx.amount))}`,
    `Đơn ${short} · ${order.customer?.name ?? 'Khách'} — ${status} · ${fmtVNTime(tx.transactionAt)}`,
    {
      type: 'BANK_PAYMENT',
      orderId: order.id,
      amount: String(Number(tx.amount)),
      fullyPaid: fullyPaid ? '1' : '0',
    },
  );
}
