-- AlterTable
ALTER TABLE "BankTransaction" ADD COLUMN "orderId" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "transferredAmount" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ShopSettings" ADD COLUMN "posFcmTokens" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "BankTransaction_orderId_idx" ON "BankTransaction"("orderId");

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
