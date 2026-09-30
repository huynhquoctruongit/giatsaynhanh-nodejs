-- Giờ đóng cửa: trước 10 phút nút chốt két rung + kêu nhắc nhân viên
ALTER TABLE "ShopSettings" ADD COLUMN "closeTime" TEXT NOT NULL DEFAULT '21:30';
