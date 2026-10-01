-- Gộp khách hàng "trùng" chỉ khác dấu cách thừa / chữ hoa-thường (vd "A. Nam" vs "A. Nam ",
-- "A/c Tuấn" vs "A/c tuấn") — nhân viên lỡ tạo trùng. Chạy atomic: lỗi bước nào là rollback hết.
-- Bản trùng KHÔNG bị xoá mà được ẩn (mergedIntoId) để QR đã in của bản đó vẫn trỏ về khách giữ lại.

-- 0) Cột đánh dấu bản đã gộp
ALTER TABLE "Customer" ADD COLUMN "mergedIntoId" TEXT;

-- 1) Khoá so khớp = tên bỏ dấu cách thừa + chữ thường, theo từng tiệm
CREATE TEMP TABLE _cust ON COMMIT DROP AS
SELECT c.id, c."shopId", c."createdAt",
       lower(regexp_replace(btrim(c.name), '\s+', ' ', 'g')) AS norm,
       (SELECT count(*) FROM "Order" o WHERE o."customerId" = c.id) AS order_count
FROM "Customer" c;

-- 2) Mỗi nhóm giữ bản có NHIỀU ĐƠN NHẤT (hoà thì bản cũ nhất)
CREATE TEMP TABLE _keep ON COMMIT DROP AS
SELECT DISTINCT ON ("shopId", norm) id AS keep_id, "shopId", norm
FROM _cust
ORDER BY "shopId", norm, order_count DESC, "createdAt" ASC, id ASC;

CREATE TEMP TABLE _map ON COMMIT DROP AS
SELECT c.id AS dup_id, k.keep_id
FROM _cust c
JOIN _keep k ON k."shopId" = c."shopId" AND k.norm = c.norm
WHERE c.id <> k.keep_id;

-- 3) Chuyển đơn hàng, lịch đặt, công nợ sang bản giữ lại
UPDATE "Order"        o SET "customerId" = m.keep_id FROM _map m WHERE o."customerId" = m.dup_id;
UPDATE "Booking"      b SET "customerId" = m.keep_id FROM _map m WHERE b."customerId" = m.dup_id;
UPDATE "CustomerDebt" d SET "customerId" = m.keep_id FROM _map m WHERE d."customerId" = m.dup_id;

-- 4) Bản giữ lại còn trống SĐT / địa chỉ / ghi chú → lấy từ bản trùng
UPDATE "Customer" k SET "phone" = sub.v
FROM (SELECT m.keep_id, MIN(c.phone) AS v FROM _map m JOIN "Customer" c ON c.id = m.dup_id
      WHERE c.phone IS NOT NULL AND c.phone <> '' GROUP BY m.keep_id) sub
WHERE k.id = sub.keep_id AND (k.phone IS NULL OR k.phone = '');

UPDATE "Customer" k SET "address" = sub.v
FROM (SELECT m.keep_id, MIN(c.address) AS v FROM _map m JOIN "Customer" c ON c.id = m.dup_id
      WHERE c.address IS NOT NULL AND c.address <> '' GROUP BY m.keep_id) sub
WHERE k.id = sub.keep_id AND (k.address IS NULL OR k.address = '');

UPDATE "Customer" k SET "note" = sub.v
FROM (SELECT m.keep_id, MIN(c.note) AS v FROM _map m JOIN "Customer" c ON c.id = m.dup_id
      WHERE c.note IS NOT NULL AND c.note <> '' GROUP BY m.keep_id) sub
WHERE k.id = sub.keep_id AND (k.note IS NULL OR k.note = '');

-- 5) Ẩn bản trùng: đánh dấu gộp + đổi tên (thêm hậu tố) để không vướng unique(shopId, name)
--    khi chuẩn hoá tên bản giữ lại ở bước 6.
UPDATE "Customer" c
SET "mergedIntoId" = m.keep_id,
    "name" = c.name || ' [đã gộp ' || left(c.id, 8) || ']'
FROM _map m WHERE c.id = m.dup_id;

-- 6) Chuẩn hoá tên bản giữ lại (bỏ dấu cách thừa)
UPDATE "Customer" c
SET "name" = regexp_replace(btrim(c.name), '\s+', ' ', 'g')
FROM _keep k
WHERE c.id = k.keep_id AND c.name <> regexp_replace(btrim(c.name), '\s+', ' ', 'g');

CREATE INDEX "Customer_mergedIntoId_idx" ON "Customer"("mergedIntoId");
