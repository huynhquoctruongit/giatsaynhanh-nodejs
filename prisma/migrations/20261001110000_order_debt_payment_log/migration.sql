-- Đơn nợ: ghi lại ai bấm "Đơn nợ" / "Đã thanh toán" và lúc nào
ALTER TABLE "Order" ADD COLUMN "debtMarkedAt" TIMESTAMP(3),
ADD COLUMN "debtMarkedById" TEXT,
ADD COLUMN "paidById" TEXT;

ALTER TABLE "Order" ADD CONSTRAINT "Order_debtMarkedById_fkey" FOREIGN KEY ("debtMarkedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
