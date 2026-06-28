-- =====================================================
-- SAMPLE INVENTORY - ĐẢM BẢO TẤT CẢ THUỐC CÓ TỒN KHO
-- Stocks every drug (1–30) in ALL warehouses:
--   kho_id=1  (Kho Tổng Dược)       5000 units each
--   kho_id=2  (Kho Lẻ Ngoại Trú)    1000 units each
--   kho_id=3  (Kho Lẻ Nội Trú)      1000 units each
--   kho_id=4–7 (Tủ trực khoa)       ALL drugs, 50 units each
-- Tất cả lô thuốc hạn dùng 2028-12-31 (còn rất lâu)
-- Rerun-safe: wipes any prior rows this file created.
-- =====================================================
USE hospital_medicine;

-- Clean slate for rows created by this seed (marked via so_lo prefix)
DELETE FROM lo_thuoc WHERE so_lo LIKE 'TEST-%';
DELETE FROM ton_kho_tu_truc WHERE kho_id BETWEEN 4 AND 7;

-- =====================================================
-- Kho Tổng Dược (kho_id = 1)
-- 5000 units mỗi thuốc, hạn dùng 2028-12-31
-- =====================================================
INSERT INTO lo_thuoc (thuoc_id, so_lo, han_dung, gia_nhap, thue_vat, kho_id, so_luong_ton)
SELECT t.id, CONCAT('TEST-KT-', LPAD(t.id, 2, '0')), '2028-12-31', t.don_gia_thau, 5, 1, 5000
FROM thuoc t WHERE t.trang_thai = 1;

-- =====================================================
-- Kho Lẻ Ngoại Trú (kho_id = 2)
-- 1000 units mỗi thuốc, hạn dùng 2028-12-31
-- =====================================================
INSERT INTO lo_thuoc (thuoc_id, so_lo, han_dung, gia_nhap, thue_vat, kho_id, so_luong_ton)
SELECT t.id, CONCAT('TEST-OT-', LPAD(t.id, 2, '0')), '2028-12-31', t.don_gia_thau, 5, 2, 1000
FROM thuoc t WHERE t.trang_thai = 1;

-- =====================================================
-- Kho Lẻ Nội Trú (kho_id = 3)
-- 1000 units mỗi thuốc, hạn dùng 2028-12-31
-- =====================================================
INSERT INTO lo_thuoc (thuoc_id, so_lo, han_dung, gia_nhap, thue_vat, kho_id, so_luong_ton)
SELECT t.id, CONCAT('TEST-IP-', LPAD(t.id, 2, '0')), '2028-12-31', t.don_gia_thau, 5, 3, 1000
FROM thuoc t WHERE t.trang_thai = 1;

-- =====================================================
-- Tủ trực các khoa (kho_id 4–7) - TẤT CẢ thuốc
-- 4: Khoa Nội, 5: Khoa Ngoại, 6: Khoa Sản, 7: Khoa Cấp cứu
-- 50 units mỗi thuốc, hạn dùng 2028-12-31
-- =====================================================
INSERT INTO ton_kho_tu_truc (kho_id, thuoc_id, so_luong_ton, co_so_tran)
SELECT k.id, t.id, 50, 100
FROM kho k
CROSS JOIN thuoc t
WHERE k.loai_kho = 'tu_truc'
  AND t.trang_thai = 1;

-- =====================================================
-- VERIFY
-- =====================================================
SELECT '=== TỒN KHO SAU SEED ===' AS '';

SELECT 'Kho Tổng Dược (kho_id=1)' AS warehouse, COUNT(DISTINCT thuoc_id) AS drugs, SUM(so_luong_ton) AS units
  FROM lo_thuoc WHERE kho_id = 1 AND so_luong_ton > 0
UNION ALL
SELECT 'Kho Lẻ Ngoại Trú (kho_id=2)', COUNT(DISTINCT thuoc_id), SUM(so_luong_ton)
  FROM lo_thuoc WHERE kho_id = 2 AND so_luong_ton > 0
UNION ALL
SELECT 'Kho Lẻ Nội Trú (kho_id=3)', COUNT(DISTINCT thuoc_id), SUM(so_luong_ton)
  FROM lo_thuoc WHERE kho_id = 3 AND so_luong_ton > 0
UNION ALL
SELECT CONCAT('Tủ trực kho_id=', k.id, ' (', k.ten_kho, ')'), COUNT(DISTINCT tk.thuoc_id), SUM(tk.so_luong_ton)
  FROM kho k LEFT JOIN ton_kho_tu_truc tk ON tk.kho_id = k.id
  WHERE k.loai_kho = 'tu_truc'
  GROUP BY k.id, k.ten_kho
  ORDER BY 1;

-- Kiểm tra thuốc nào bị hết hàng ở bất kỳ kho nào
SELECT '=== THUỐC BỊ HẾT HÀNG (nếu có) ===' AS '';
SELECT t.ten_thuoc, k.ten_kho, COALESCE(SUM(lt.so_luong_ton), 0) AS ton_kho
FROM thuoc t
CROSS JOIN kho k
LEFT JOIN lo_thuoc lt ON lt.thuoc_id = t.id AND lt.kho_id = k.id AND lt.so_luong_ton > 0
WHERE t.trang_thai = 1 AND k.loai_kho IN ('kho_tong', 'kho_le_ngoai_tru', 'kho_le_noi_tru')
GROUP BY t.id, t.ten_thuoc, k.id, k.ten_kho
HAVING ton_kho = 0
ORDER BY k.ten_kho, t.ten_thuoc;
