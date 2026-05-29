-- Add FCM token field to User for push notifications
ALTER TABLE "User" ADD COLUMN "fcmToken" TEXT;
