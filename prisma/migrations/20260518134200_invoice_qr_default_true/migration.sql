-- Đổi default cho cột invoiceShowQR thành true và bật cho tất cả ShopSettings hiện có
ALTER TABLE "ShopSettings" ALTER COLUMN "invoiceShowQR" SET DEFAULT true;
UPDATE "ShopSettings" SET "invoiceShowQR" = true;
