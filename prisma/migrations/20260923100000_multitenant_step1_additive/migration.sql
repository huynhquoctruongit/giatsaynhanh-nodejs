-- Multi-tenant STEP 1: ADDITIVE ONLY. An toàn tuyệt đối cho dữ liệu hiện có —
-- không xoá, không đổi kiểu, không SET NOT NULL, không đổi/xoá unique constraint
-- nào đang có. Chỉ tạo bảng mới + thêm cột shopId (nullable) + FK (chấp nhận NULL)
-- + index. Có thể chạy trực tiếp lên production bất kỳ lúc nào.

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Shop_slug_key" ON "Shop"("slug");

-- CreateTable
CREATE TABLE "PlatformAdmin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAdmin_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlatformAdmin_email_key" ON "PlatformAdmin"("email");

-- CreateTable
CREATE TABLE "BankAccountShopMapping" (
    "id" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,

    CONSTRAINT "BankAccountShopMapping_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BankAccountShopMapping_accountNumber_key" ON "BankAccountShopMapping"("accountNumber");
ALTER TABLE "BankAccountShopMapping" ADD CONSTRAINT "BankAccountShopMapping_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddColumn: shopId (nullable) trên toàn bộ bảng nghiệp vụ hiện có
ALTER TABLE "User" ADD COLUMN "shopId" TEXT;
ALTER TABLE "Customer" ADD COLUMN "shopId" TEXT;
ALTER TABLE "Product" ADD COLUMN "shopId" TEXT;
ALTER TABLE "Order" ADD COLUMN "shopId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "shopId" TEXT;
ALTER TABLE "BookingItem" ADD COLUMN "shopId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "shopId" TEXT;
ALTER TABLE "ScanHistory" ADD COLUMN "shopId" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "shopId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "shopId" TEXT;
ALTER TABLE "CustomerDebt" ADD COLUMN "shopId" TEXT;
ALTER TABLE "SupplierDebt" ADD COLUMN "shopId" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN "shopId" TEXT;
ALTER TABLE "InventoryLog" ADD COLUMN "shopId" TEXT;
ALTER TABLE "Shift" ADD COLUMN "shopId" TEXT;
ALTER TABLE "ShiftAttendance" ADD COLUMN "shopId" TEXT;
ALTER TABLE "ShopSettings" ADD COLUMN "shopId" TEXT;
ALTER TABLE "BankTransaction" ADD COLUMN "shopId" TEXT;

-- AddForeignKey (nullable FK — không chặn insert/update khi shopId chưa có)
ALTER TABLE "User" ADD CONSTRAINT "User_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookingItem" ADD CONSTRAINT "BookingItem_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScanHistory" ADD CONSTRAINT "ScanHistory_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerDebt" ADD CONSTRAINT "CustomerDebt_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierDebt" ADD CONSTRAINT "SupplierDebt_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryLog" ADD CONSTRAINT "InventoryLog_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShiftAttendance" ADD CONSTRAINT "ShiftAttendance_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShopSettings" ADD CONSTRAINT "ShopSettings_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "User_shopId_idx" ON "User"("shopId");
CREATE INDEX "Customer_shopId_idx" ON "Customer"("shopId");
CREATE INDEX "Product_shopId_idx" ON "Product"("shopId");
CREATE INDEX "Order_shopId_idx" ON "Order"("shopId");
CREATE INDEX "Booking_shopId_idx" ON "Booking"("shopId");
CREATE INDEX "BookingItem_shopId_idx" ON "BookingItem"("shopId");
CREATE INDEX "OrderItem_shopId_idx" ON "OrderItem"("shopId");
CREATE INDEX "ScanHistory_shopId_idx" ON "ScanHistory"("shopId");
CREATE INDEX "Supplier_shopId_idx" ON "Supplier"("shopId");
CREATE INDEX "Transaction_shopId_idx" ON "Transaction"("shopId");
CREATE INDEX "CustomerDebt_shopId_idx" ON "CustomerDebt"("shopId");
CREATE INDEX "SupplierDebt_shopId_idx" ON "SupplierDebt"("shopId");
CREATE INDEX "InventoryItem_shopId_idx" ON "InventoryItem"("shopId");
CREATE INDEX "InventoryLog_shopId_idx" ON "InventoryLog"("shopId");
CREATE INDEX "Shift_shopId_idx" ON "Shift"("shopId");
CREATE INDEX "ShiftAttendance_shopId_idx" ON "ShiftAttendance"("shopId");
CREATE INDEX "BankTransaction_shopId_idx" ON "BankTransaction"("shopId");
