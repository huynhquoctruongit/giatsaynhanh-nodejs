-- AlterTable
ALTER TABLE "User" ADD COLUMN     "orderViewTimeLimit" TEXT NOT NULL DEFAULT 'unlimited',
ADD COLUMN     "permissions" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "phone" TEXT;
