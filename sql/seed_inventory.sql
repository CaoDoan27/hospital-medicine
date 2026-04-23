-- =====================================================
-- SAMPLE INVENTORY FOR TESTING DISPENSE & REIMBURSEMENT
-- Stocks every drug (1–30) in:
--   kho_id=2  (Kho Lẻ Ngoại Trú)   500 units each
--   kho_id=3  (Kho Lẻ Nội Trú)     500 units each
--   kho_id=4–7 (Tủ trực khoa)     common emergency meds
-- Rerun-safe: wipes any prior rows this file created.
-- =====================================================
USE hospital_medicine;

-- Clean slate for rows created by this seed (marked via so_lo prefix)
DELETE FROM lo_thuoc WHERE so_lo LIKE 'TEST-%';
DELETE FROM ton_kho_tu_truc WHERE kho_id BETWEEN 4 AND 7;

-- =====================================================
-- Kho Lẻ Ngoại Trú (kho_id = 2)
-- One lot per drug, 500 units, expires 2028-12-31
-- =====================================================
INSERT INTO lo_thuoc (thuoc_id, so_lo, han_dung, gia_nhap, thue_vat, kho_id, so_luong_ton)
SELECT t.id, CONCAT('TEST-OT-', LPAD(t.id, 2, '0')), '2028-12-31', t.don_gia_thau, 0, 2, 500
FROM thuoc t WHERE t.trang_thai = 1;

-- =====================================================
-- Kho Lẻ Nội Trú (kho_id = 3)
-- =====================================================
INSERT INTO lo_thuoc (thuoc_id, so_lo, han_dung, gia_nhap, thue_vat, kho_id, so_luong_ton)
SELECT t.id, CONCAT('TEST-IP-', LPAD(t.id, 2, '0')), '2028-12-31', t.don_gia_thau, 0, 3, 500
FROM thuoc t WHERE t.trang_thai = 1;

-- =====================================================
-- Tủ trực các khoa (kho_id 4–7)
-- Emergency/ward-staple drugs only
-- 4: Khoa Nội, 5: Khoa Ngoại, 6: Khoa Sản, 7: Khoa Cấp cứu
-- =====================================================
-- Drugs commonly stocked in ward cabinets:
--   15 Paracetamol, 16 Ibuprofen, 18 Omeprazol, 19 Esomeprazol(inj),
--   22 Salbutamol khí dung, 24 NaCl 0.9%, 25 Glucose 5%, 26 Ringer Lactat,
--   27 Diazepam, 30 Dexamethason(inj)
INSERT INTO ton_kho_tu_truc (kho_id, thuoc_id, so_luong_ton, co_so_tran)
SELECT k.id, t.id, 50, 10
FROM kho k
CROSS JOIN thuoc t
WHERE k.loai_kho = 'tu_truc'
  AND t.id IN (15, 16, 18, 19, 22, 24, 25, 26, 27, 30)
  AND t.trang_thai = 1;

-- =====================================================
-- VERIFY
-- =====================================================
SELECT 'Kho Lẻ Ngoại Trú (kho_id=2)' AS warehouse, COUNT(DISTINCT thuoc_id) AS drugs, SUM(so_luong_ton) AS units
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
