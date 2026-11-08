-- Liên kết tài khoản ADMIN giữa nhiều tiệm để đổi tiệm không cần đăng nhập lại
ALTER TABLE "User" ADD COLUMN "accountGroupId" TEXT;
CREATE INDEX "User_accountGroupId_idx" ON "User"("accountGroupId");
