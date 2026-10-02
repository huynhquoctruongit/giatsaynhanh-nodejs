-- Rà soát kệ cuối ngày: lưu đơn đã quét theo ngày, đồng bộ giữa nhiều máy quét
CREATE TABLE "OrderAudit" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "result" TEXT NOT NULL DEFAULT 'VERIFIED',
    "orderId" TEXT NOT NULL,
    "auditedById" TEXT NOT NULL,
    "auditedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shopId" TEXT NOT NULL,

    CONSTRAINT "OrderAudit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderAudit_orderId_date_key" ON "OrderAudit"("orderId", "date");
CREATE INDEX "OrderAudit_shopId_date_idx" ON "OrderAudit"("shopId", "date");

ALTER TABLE "OrderAudit" ADD CONSTRAINT "OrderAudit_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderAudit" ADD CONSTRAINT "OrderAudit_auditedById_fkey" FOREIGN KEY ("auditedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderAudit" ADD CONSTRAINT "OrderAudit_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
