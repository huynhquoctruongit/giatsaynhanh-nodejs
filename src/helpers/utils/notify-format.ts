/** Định dạng nội dung cho thông báo push: tiền VND + giờ Việt Nam. */

/** 150000 → "150.000đ" */
export function fmtMoney(v: number | string | { toString(): string }): string {
  return Number(v).toLocaleString('vi-VN') + 'đ';
}

/**
 * Date → "HH:mm DD/MM" theo giờ Việt Nam.
 * Server chạy UTC (Render) nên phải ép timeZone, không dùng giờ máy.
 */
export function fmtVNTime(d: Date): string {
  const parts = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('hour')}:${get('minute')} ${get('day')}/${get('month')}`;
}
