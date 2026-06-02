-- Độ ưu tiên hiển thị dịch vụ (kéo-thả ở màn dịch vụ; nhỏ = lên trên)
ALTER TABLE "Product" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Backfill: giữ nguyên thứ tự hiển thị hiện tại (createdAt desc -> sortOrder 0,1,2...)
WITH ranked AS (
  SELECT "id", (ROW_NUMBER() OVER (ORDER BY "createdAt" DESC) - 1) AS rn
  FROM "Product"
)
UPDATE "Product" p SET "sortOrder" = r.rn
FROM ranked r
WHERE p."id" = r."id";

-- Index phục vụ sắp xếp
CREATE INDEX "Product_sortOrder_idx" ON "Product"("sortOrder");
