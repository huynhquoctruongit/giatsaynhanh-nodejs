-- Ẩn dịch vụ nội bộ khỏi web đặt lịch
ALTER TABLE "Product" ADD COLUMN "hiddenFromBooking" BOOLEAN NOT NULL DEFAULT false;

-- Ngưỡng tổng đơn để miễn phí ship (đơn booking)
ALTER TABLE "ShopSettings" ADD COLUMN "freeShipThreshold" DECIMAL(12,2);
