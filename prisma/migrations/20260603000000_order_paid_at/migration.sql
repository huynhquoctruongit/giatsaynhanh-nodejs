-- Mốc thu tiền cho đơn. Lợi nhuận tính theo paidAt (đơn nợ = paidAt NULL → treo).
ALTER TABLE "Order" ADD COLUMN "paidAt" TIMESTAMP(3);

-- Backfill: đơn ĐÃ GIAO trước đây coi như đã thu tiền tại thời điểm giao
UPDATE "Order"
SET "paidAt" = "deliveredAt"
WHERE "status" = 'DELIVERED' AND "deliveredAt" IS NOT NULL;

-- Index phục vụ tính lợi nhuận theo ngày thu tiền
CREATE INDEX "Order_paidAt_idx" ON "Order"("paidAt");
