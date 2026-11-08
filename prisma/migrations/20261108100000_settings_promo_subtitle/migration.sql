-- Dòng phụ dưới tên tiệm trên hoá đơn + giảm giá toàn bộ dịch vụ theo khoảng ngày
ALTER TABLE "ShopSettings" ADD COLUMN "invoiceSubtitle" TEXT;
ALTER TABLE "ShopSettings" ADD COLUMN "promoEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ShopSettings" ADD COLUMN "promoType" TEXT NOT NULL DEFAULT 'PERCENT';
ALTER TABLE "ShopSettings" ADD COLUMN "promoValue" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "ShopSettings" ADD COLUMN "promoStartDate" TEXT;
ALTER TABLE "ShopSettings" ADD COLUMN "promoEndDate" TEXT;
ALTER TABLE "ShopSettings" ADD COLUMN "promoLabel" TEXT;
