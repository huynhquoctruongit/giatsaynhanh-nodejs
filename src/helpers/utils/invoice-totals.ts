/**
 * Tổng tiền cần thu của 1 đơn — khớp calcInvoiceTotals ở web/app (= số tiền in trên QR hoá đơn):
 * tổng dịch vụ + phí ship (đơn từ đặt lịch, dưới ngưỡng freeship) − giảm giá.
 */
export function calcGrandTotal(
  order: { totalAmount: unknown; discountAmount?: unknown; fromBooking: boolean },
  settings: { bookingShippingFee?: unknown; freeShipThreshold?: unknown } | null,
): number {
  const subtotal = Number(order.totalAmount);
  const discount = Number(order.discountAmount ?? 0);
  let shipping = 0;
  if (order.fromBooking) {
    const fee = Number(settings?.bookingShippingFee ?? 0);
    const threshold = Number(settings?.freeShipThreshold ?? 0);
    if (fee > 0 && !(threshold > 0 && subtotal >= threshold)) shipping = fee;
  }
  return subtotal + shipping - discount;
}
