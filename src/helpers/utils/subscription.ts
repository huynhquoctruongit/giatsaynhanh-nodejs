import { ForbiddenError } from './errors';

export const TRIAL_DAYS = 30;

export const SUBSCRIPTION_PLAN_DAYS = {
  TRIAL: TRIAL_DAYS,
  SIX_MONTHS: 182,
  ONE_YEAR: 365,
  THREE_YEARS: 1095,
} as const;

/** Gói trọn đời: hạn dùng đặt ở mốc rất xa thay vì null để mọi phép so sánh hạn giữ nguyên. */
export const LIFETIME_ENDS_AT = new Date('9999-12-31T00:00:00.000Z');

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLAN_DAYS | 'LIFETIME';

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function trialEndsAt(from: Date = new Date()): Date {
  return addDays(from, TRIAL_DAYS);
}

/** Cộng nối tiếp: gói mới bắt đầu tính từ hạn còn lại (nếu chưa hết hạn) hoặc từ hiện tại. */
export function extendSubscription(currentEndsAt: Date, plan: SubscriptionPlan): Date {
  if (plan === 'LIFETIME') return new Date(LIFETIME_ENDS_AT);
  const now = new Date();
  const base = currentEndsAt > now ? currentEndsAt : now;
  return addDays(base, SUBSCRIPTION_PLAN_DAYS[plan]);
}

export function daysRemaining(endsAt: Date): number {
  const ms = endsAt.getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

/** Chặn tạo đơn hàng mới khi tiệm đã hết hạn dùng thử/gói — dữ liệu cũ vẫn xem được bình thường. */
export function assertSubscriptionActive(subscriptionEndsAt: Date) {
  if (subscriptionEndsAt.getTime() < Date.now()) {
    throw new ForbiddenError(
      'Tiệm đã hết hạn sử dụng. Vui lòng liên hệ để gia hạn gói dịch vụ trước khi tạo đơn mới.',
    );
  }
}
