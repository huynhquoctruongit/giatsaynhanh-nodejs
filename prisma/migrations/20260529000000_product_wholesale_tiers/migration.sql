-- AlterTable
ALTER TABLE "Product" ADD COLUMN "wholesaleEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN "wholesaleTiers" JSONB;
