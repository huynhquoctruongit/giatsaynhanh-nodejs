/** Lương theo giờ (VNĐ) — chủ nhật cao hơn ngày thường. */
export const HOURLY_RATE_WEEKDAY = 25_000;
export const HOURLY_RATE_SUNDAY = 27_000;

const SLOT_MS = 30 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
// Việt Nam cố định UTC+7, không có giờ mùa hè.
const VN_OFFSET_MS = 7 * HOUR_MS;

/**
 * Làm tròn về mốc 30 phút gần nhất: vào ca 13:01 → 13:00, 13:16 → 13:30.
 * Offset VN là số giờ chẵn nên làm tròn theo UTC cho kết quả y hệt giờ VN.
 */
export function roundToSlot(date: Date): Date {
  return new Date(Math.round(date.getTime() / SLOT_MS) * SLOT_MS);
}

/** Chủ nhật theo giờ VN (tính theo giờ vào ca). */
export function isSundayVN(date: Date): boolean {
  return new Date(date.getTime() + VN_OFFSET_MS).getUTCDay() === 0;
}

/** Khoảng [from, to) của 1 tháng theo giờ VN. `month` dạng "YYYY-MM". */
export function monthRangeVN(month: string): { from: Date; to: Date } {
  const [y, m] = month.split('-').map(Number);
  return {
    from: new Date(Date.UTC(y, m - 1, 1) - VN_OFFSET_MS),
    to: new Date(Date.UTC(y, m, 1) - VN_OFFSET_MS),
  };
}

export function calcEntryPay(checkIn: Date, checkOut: Date | null) {
  const roundedIn = roundToSlot(checkIn);
  const roundedOut = checkOut ? roundToSlot(checkOut) : null;
  const hours = roundedOut
    ? Math.max(0, (roundedOut.getTime() - roundedIn.getTime()) / HOUR_MS)
    : 0;
  const sunday = isSundayVN(checkIn);
  const rate = sunday ? HOURLY_RATE_SUNDAY : HOURLY_RATE_WEEKDAY;
  return { roundedIn, roundedOut, hours, isSunday: sunday, rate, amount: hours * rate };
}
