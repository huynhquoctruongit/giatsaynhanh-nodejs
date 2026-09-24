-- Phase 8: webhook GPM Pay riêng cho mỗi shop. ADDITIVE ONLY, cả 2 cột nullable
-- và không SET NOT NULL, không đổi gì trên dữ liệu hiện có. Shop hiện tại sẽ có
-- webhookToken/webhookSecret = NULL, route webhook cũ (không token) không đọc
-- 2 cột này nên không bị ảnh hưởng gì. An toàn để chạy trực tiếp lên production.

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN "webhookToken" TEXT,
ADD COLUMN "webhookSecret" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Shop_webhookToken_key" ON "Shop"("webhookToken");
