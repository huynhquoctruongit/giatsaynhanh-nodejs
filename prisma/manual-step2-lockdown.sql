-- Multi-tenant STEP 2: LOCKDOWN.
-- CHỈ chạy sau khi backfill-shop.ts báo "Backfill complete." (không còn row
-- nào shopId IS NULL, trừ BankTransaction — nullable theo thiết kế).
-- Chạy tay qua psql (không phải migration.sql trong prisma/migrations/, để
-- tránh `prisma migrate deploy` tự động chạy nối tiếp step1 trước khi backfill
-- xong). Chạy: psql "$DIRECT_URL" -f prisma/manual-step2-lockdown.sql
-- Bọc trong 1 transaction — lỗi ở đâu thì rollback toàn bộ, không có nửa vời.

BEGIN;

-- 1) SET NOT NULL (sẽ lỗi ngay nếu còn sót row NULL — an toàn, không im lặng bỏ qua)
ALTER TABLE "User" ALTER COLUMN "shopId" SET NOT NULL;
ALTER TABLE "Customer" ALTER COLUMN "shopId" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "shopId" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "shopId" SET NOT NULL;
ALTER TABLE "Booking" ALTER COLUMN "shopId" SET NOT NULL;
ALTER TABLE "BookingItem" ALTER COLUMN "shopId" SET NOT NULL;
ALTER TABLE "OrderItem" ALTER COLUMN "shopId" SET NOT NULL;
ALTER TABLE "ScanHistory" ALTER COLUMN "shopId" SET NOT NULL;
ALTER TABLE "Supplier" ALTER COLUMN "shopId" SET NOT NULL;
ALTER TABLE "Transaction" ALTER COLUMN "shopId" SET NOT NULL;
ALTER TABLE "CustomerDebt" ALTER COLUMN "shopId" SET NOT NULL;
ALTER TABLE "SupplierDebt" ALTER COLUMN "shopId" SET NOT NULL;
ALTER TABLE "InventoryItem" ALTER COLUMN "shopId" SET NOT NULL;
ALTER TABLE "InventoryLog" ALTER COLUMN "shopId" SET NOT NULL;
ALTER TABLE "Shift" ALTER COLUMN "shopId" SET NOT NULL;
ALTER TABLE "ShiftAttendance" ALTER COLUMN "shopId" SET NOT NULL;
ALTER TABLE "ShopSettings" ALTER COLUMN "shopId" SET NOT NULL;
-- BankTransaction.shopId giữ nguyên nullable — đúng thiết kế (schema.prisma: shopId String?)

-- 2) Đổi unique constraint từ global -> theo tiệm
DROP INDEX "User_email_key";
CREATE UNIQUE INDEX "User_shopId_email_key" ON "User"("shopId", "email");

DROP INDEX "Customer_name_key";
CREATE UNIQUE INDEX "Customer_shopId_name_key" ON "Customer"("shopId", "name");

DROP INDEX "Order_code_key";
CREATE UNIQUE INDEX "Order_shopId_code_key" ON "Order"("shopId", "code");

DROP INDEX "Booking_code_key";
CREATE UNIQUE INDEX "Booking_shopId_code_key" ON "Booking"("shopId", "code");

-- 3) ShopSettings: 1 tiệm chỉ có đúng 1 dòng settings
CREATE UNIQUE INDEX "ShopSettings_shopId_key" ON "ShopSettings"("shopId");

COMMIT;
