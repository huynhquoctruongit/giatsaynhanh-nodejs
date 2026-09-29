-- AlterTable
ALTER TABLE "ShopSettings" ADD COLUMN "smallOrderNote" TEXT;

-- Thông báo đơn tối thiểu cho tiệm Giặt Sấy Nhanh (sửa/xoá được ở Cài đặt → Hoá đơn).
UPDATE "ShopSettings" SET "smallOrderNote" = 'Từ ngày 01/10, tiệm áp dụng giá tối thiểu 30.000đ/đơn cho đơn dưới 3kg. Cảm ơn quý khách đã thông cảm, tiệm mong tiếp tục được phục vụ quý khách!'
WHERE "shopId" IN (SELECT "id" FROM "Shop" WHERE "slug" = 'giat-say-nhanh');
