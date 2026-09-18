-- Gộp khách hàng TRÙNG TÊN CHÍNH XÁC rồi khoá không cho trùng tên nữa.
-- Chạy atomic trong 1 migration: nếu bất kỳ bước nào lỗi, toàn bộ rollback.
-- "Trùng chính xác" = so khớp nguyên văn cột name (phân biệt hoa/thường & khoảng trắng).

-- 1) Chọn bản GIỮ LẠI cho mỗi tên = bản ghi CŨ NHẤT (createdAt nhỏ nhất, tie-break theo id)
CREATE TEMP TABLE _keep ON COMMIT DROP AS
SELECT DISTINCT ON (name) id AS keep_id, name
FROM "Customer"
ORDER BY name, "createdAt" ASC, id ASC;

-- 2) Bảng ánh xạ bản-trùng -> bản-giữ
CREATE TEMP TABLE _map ON COMMIT DROP AS
SELECT c.id AS dup_id, k.keep_id
FROM "Customer" c
JOIN _keep k ON k.name = c.name
WHERE c.id <> k.keep_id;

-- 3) Chuyển toàn bộ quan hệ (đơn hàng, lịch đặt, công nợ) sang bản giữ
UPDATE "Order"        o SET "customerId" = m.keep_id FROM _map m WHERE o."customerId" = m.dup_id;
UPDATE "Booking"      b SET "customerId" = m.keep_id FROM _map m WHERE b."customerId" = m.dup_id;
UPDATE "CustomerDebt" d SET "customerId" = m.keep_id FROM _map m WHERE d."customerId" = m.dup_id;

-- 4) Bổ sung address/note/phone cho bản giữ nếu đang trống (lấy từ bản trùng có dữ liệu)
UPDATE "Customer" k SET "address" = sub.v
FROM (
  SELECT m.keep_id, MIN(c.address) AS v
  FROM _map m JOIN "Customer" c ON c.id = m.dup_id
  WHERE c.address IS NOT NULL AND c.address <> ''
  GROUP BY m.keep_id
) sub
WHERE k.id = sub.keep_id AND (k.address IS NULL OR k.address = '');

UPDATE "Customer" k SET "note" = sub.v
FROM (
  SELECT m.keep_id, MIN(c.note) AS v
  FROM _map m JOIN "Customer" c ON c.id = m.dup_id
  WHERE c.note IS NOT NULL AND c.note <> ''
  GROUP BY m.keep_id
) sub
WHERE k.id = sub.keep_id AND (k.note IS NULL OR k.note = '');

UPDATE "Customer" k SET "phone" = sub.v
FROM (
  SELECT m.keep_id, MIN(c.phone) AS v
  FROM _map m JOIN "Customer" c ON c.id = m.dup_id
  WHERE c.phone IS NOT NULL AND c.phone <> ''
  GROUP BY m.keep_id
) sub
WHERE k.id = sub.keep_id AND (k.phone IS NULL OR k.phone = '');

-- 5) Xoá các bản trùng
DELETE FROM "Customer" c USING _map m WHERE c.id = m.dup_id;

-- 6) Khoá: không cho trùng tên nữa
CREATE UNIQUE INDEX "Customer_name_key" ON "Customer"("name");
