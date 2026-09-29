-- AlterTable
ALTER TABLE "ShopSettings" ADD COLUMN "openingCash" DECIMAL(12,2) NOT NULL DEFAULT 750000;

-- CreateTable
CREATE TABLE "CashClosing" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "openingCash" DECIMAL(14,2) NOT NULL,
    "collected" DECIMAL(14,2) NOT NULL,
    "transfers" DECIMAL(14,2) NOT NULL,
    "expenses" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "expenseNote" TEXT,
    "expectedCash" DECIMAL(14,2) NOT NULL,
    "countedCash" DECIMAL(14,2) NOT NULL,
    "difference" DECIMAL(14,2) NOT NULL,
    "denominations" JSONB NOT NULL,
    "note" TEXT,
    "closedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shopId" TEXT NOT NULL,

    CONSTRAINT "CashClosing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CashClosing_shopId_date_key" ON "CashClosing"("shopId", "date");

-- CreateIndex
CREATE INDEX "CashClosing_shopId_idx" ON "CashClosing"("shopId");

-- AddForeignKey
ALTER TABLE "CashClosing" ADD CONSTRAINT "CashClosing_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashClosing" ADD CONSTRAINT "CashClosing_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
