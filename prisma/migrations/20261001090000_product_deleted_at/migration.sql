-- Xoá dịch vụ đã có trong đơn cũ = lưu trữ ẩn (deletedAt), khác với "Tạm ngưng" (isActive=false)
ALTER TABLE "Product" ADD COLUMN "deletedAt" TIMESTAMP(3);
