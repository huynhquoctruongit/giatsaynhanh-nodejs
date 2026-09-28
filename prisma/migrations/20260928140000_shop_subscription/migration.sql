-- AlterTable
ALTER TABLE "Shop" ADD COLUMN "subscriptionEndsAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
ADD COLUMN "currentPlan" TEXT NOT NULL DEFAULT 'TRIAL';

-- Backfill: tiệm đã tồn tại trước tính năng này được gia hạn 1 năm kể từ hôm nay
-- để không bị khoá đột ngột — platform admin gán gói thật cho từng tiệm sau.
UPDATE "Shop" SET "subscriptionEndsAt" = now() + interval '1 year', "currentPlan" = 'LEGACY';
