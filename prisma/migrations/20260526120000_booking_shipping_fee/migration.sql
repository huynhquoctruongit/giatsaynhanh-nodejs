-- Phí ship cộng trên hoá đơn cho đơn chuyển từ booking (giao nhận QR)
ALTER TABLE "ShopSettings" ADD COLUMN "bookingShippingFee" DECIMAL(10, 2);
