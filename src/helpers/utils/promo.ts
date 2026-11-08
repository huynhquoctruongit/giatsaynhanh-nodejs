/**
 * Giảm giá toàn bộ dịch vụ theo khoảng ngày (ShopSettings.promo*), vd khai trương.
 * Ngày so theo giờ VN, gồm cả ngày bắt đầu và ngày kết thúc. Qua ngày kết thúc
 * thì tự hết giảm — không cần cron vì chỉ tính lúc tạo/sửa đơn.
 */
export interface PromoSettings {
  promoEnabled?: boolean | null;
  promoType?: string | null;
  promoValue?: unknown;
  promoStartDate?: string | null;
  promoEndDate?: string | null;
}

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
export const vnDateStr = (d: Date = new Date()) =>
  new Date(d.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);

export function isPromoActive(s: PromoSettings | null | undefined, at: Date = new Date()): boolean {
  if (!s?.promoEnabled || !(Number(s.promoValue ?? 0) > 0)) return false;
  const day = vnDateStr(at);
  if (s.promoStartDate && day < s.promoStartDate) return false;
  if (s.promoEndDate && day > s.promoEndDate) return false;
  return true;
}

/** Số tiền giảm cho 1 đơn có tổng dịch vụ `subtotal` (0 nếu không trong đợt giảm). */
export function calcPromoDiscount(
  s: PromoSettings | null | undefined,
  subtotal: number,
  at: Date = new Date(),
): number {
  if (!isPromoActive(s, at) || subtotal <= 0) return 0;
  const value = Number(s!.promoValue);
  const raw = s!.promoType === 'AMOUNT' ? value : (subtotal * Math.min(value, 100)) / 100;
  // Làm tròn xuống 1.000đ cho dễ thu tiền mặt, không vượt tổng đơn
  return Math.min(subtotal, Math.floor(raw / 1000) * 1000);
}
