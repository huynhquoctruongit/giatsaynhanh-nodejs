-- CreateTable
CREATE TABLE "SubscriptionPlanConfig" (
    "plan" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "price" INTEGER NOT NULL,
    "features" TEXT[],
    "popular" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlanConfig_pkey" PRIMARY KEY ("plan")
);

-- Seed: giá/lợi ích đang hiển thị ở bảng giá landing page.
INSERT INTO "SubscriptionPlanConfig" ("plan", "name", "period", "description", "price", "features", "popular", "sortOrder", "updatedAt") VALUES
('SIX_MONTHS', 'Gói 6 tháng', '/6 tháng', 'Bắt đầu số hoá quy trình cho tiệm.', 990000,
  ARRAY['Quản lý đơn hàng & khách hàng', 'Tặng máy quét đơn'], false, 1, now()),
('ONE_YEAR', 'Gói 1 năm', '/năm', 'Đầy đủ tính năng đặt lịch & thanh toán.', 2490000,
  ARRAY['Quản lý đơn hàng & khách hàng', 'Đặt giao nhận qua quét mã QR', 'Hiển thị mã QR chuyển khoản tự động theo số tiền trên đơn', 'Hiển thị số tiền đã chuyển khoản mỗi ngày trên app', 'Tặng máy quét đơn'], true, 2, now()),
('THREE_YEARS', 'Gói 3 năm', '/3 năm', 'Trọn gói lâu dài, tặng kèm máy POS.', 5990000,
  ARRAY['Tất cả lợi ích của gói 6 tháng & 1 năm', 'Tặng máy POS bán hàng SUNMI T2'], false, 3, now());
