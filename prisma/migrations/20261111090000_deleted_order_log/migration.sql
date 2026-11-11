-- CreateTable
CREATE TABLE "DeletedOrder" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "totalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "orderCreatedAt" TIMESTAMP(3) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "deletedById" TEXT,
    "deletedByName" TEXT,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shopId" TEXT NOT NULL,

    CONSTRAINT "DeletedOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeletedOrder_shopId_deletedAt_idx" ON "DeletedOrder"("shopId", "deletedAt");
