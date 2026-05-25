-- Add permanent customer-level QR token
-- Step 1: add nullable column
ALTER TABLE "Customer" ADD COLUMN "qrToken" TEXT;

-- Step 2: populate existing rows with unique UUIDs
UPDATE "Customer" SET "qrToken" = gen_random_uuid()::text WHERE "qrToken" IS NULL;

-- Step 3: enforce NOT NULL + UNIQUE
ALTER TABLE "Customer" ALTER COLUMN "qrToken" SET NOT NULL;
CREATE UNIQUE INDEX "Customer_qrToken_key" ON "Customer"("qrToken");
CREATE INDEX "Customer_qrToken_idx" ON "Customer"("qrToken");
