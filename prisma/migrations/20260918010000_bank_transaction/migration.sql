-- Bảng giao dịch ngân hàng nhận từ GPM Pay (webhook + đối soát REST).
-- Chỉ tạo bảng mới — không đụng dữ liệu cũ.
CREATE TABLE "BankTransaction" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "gateway" TEXT,
    "accountNumber" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "direction" TEXT NOT NULL,
    "content" TEXT,
    "counterName" TEXT,
    "counterAccount" TEXT,
    "referenceCode" TEXT,
    "source" TEXT,
    "transactionAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- Chống trùng giao dịch (webhook + REST cùng upsert theo externalId)
CREATE UNIQUE INDEX "BankTransaction_externalId_key" ON "BankTransaction"("externalId");
CREATE INDEX "BankTransaction_transactionAt_idx" ON "BankTransaction"("transactionAt");
CREATE INDEX "BankTransaction_direction_idx" ON "BankTransaction"("direction");
