export const UserRole = {
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const OrderStatus = {
  CREATED: 'CREATED',
  RECEIVED: 'RECEIVED',
  WASHING: 'WASHING',
  READY: 'READY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const ScanAction = {
  VIEW: 'VIEW',
  UPDATE_STATUS: 'UPDATE_STATUS',
  MARK_DEBT: 'MARK_DEBT', // nhân viên bấm "Đơn nợ"
  MARK_PAID: 'MARK_PAID', // nhân viên bấm "Đã thanh toán" (thu nợ)
} as const;
export type ScanAction = (typeof ScanAction)[keyof typeof ScanAction];

export const BookingStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  CONVERTED: 'CONVERTED',
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const ORDER_STATUS_FLOW = [
  'CREATED',
  'RECEIVED',
  'WASHING',
  'READY',
  'DELIVERED',
] as const;

export * from './permissions';
