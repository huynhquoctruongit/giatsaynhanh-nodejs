-- SĐT khách hàng không còn bắt buộc
ALTER TABLE "Customer" ALTER COLUMN "phone" DROP NOT NULL;
