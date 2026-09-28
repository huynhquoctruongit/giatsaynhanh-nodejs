-- Gói setup trọn đời. Giá 0 = chưa đặt giá, landing hiển thị "Liên hệ báo giá";
-- platform admin nhập giá thật ở /platform/plans.
INSERT INTO "SubscriptionPlanConfig" ("plan", "name", "period", "description", "price", "features", "popular", "sortOrder", "updatedAt") VALUES
('LIFETIME', 'Gói Setup trọn đời', '/trọn đời', 'Setup mọi thứ để tiệm vận hành trơn tru ngay từ ngày đầu.', 0,
  ARRAY['Sử dụng phần mềm trọn đời, không cần gia hạn', 'Tặng máy POS bán hàng SUNMI T2', 'Tặng máy quét đơn', 'Hướng dẫn vận hành tiệm giặt sấy cho tiệm mới mở'], false, 4, now())
ON CONFLICT ("plan") DO NOTHING;
