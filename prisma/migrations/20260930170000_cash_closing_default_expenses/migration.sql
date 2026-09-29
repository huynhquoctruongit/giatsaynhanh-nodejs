-- Chi phí mặc định khi chốt két (đá, cà phê ông Địa…) — sửa trong Cài đặt từng tiệm
ALTER TABLE "ShopSettings" ADD COLUMN "defaultExpenses" DECIMAL(12,2) NOT NULL DEFAULT 25000;

-- Chốt két giờ nhập thẳng số tiền đếm được (bỏ đếm theo mệnh giá)
ALTER TABLE "CashClosing" ALTER COLUMN "denominations" DROP NOT NULL;
