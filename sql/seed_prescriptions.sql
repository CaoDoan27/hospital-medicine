-- =====================================================
-- SAMPLE OUTPATIENT PRESCRIPTIONS AWAITING DISPENSING
-- 8 BHYT-insured patients + 4 self-pay (non-BHYT) patients
-- Rerun-safe: wipes any prior rows created by this file
-- =====================================================
USE hospital_medicine;

-- Clean up any previous run of this file (idempotency)
DELETE ct FROM chi_tiet_don_thuoc ct
  JOIN don_thuoc dt ON ct.don_thuoc_id = dt.id
  JOIN dot_dieu_tri d ON dt.dot_dieu_tri_id = d.id
  JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
  WHERE bn.ma_benh_nhan LIKE 'BN200__';
DELETE dt FROM don_thuoc dt
  JOIN dot_dieu_tri d ON dt.dot_dieu_tri_id = d.id
  JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
  WHERE bn.ma_benh_nhan LIKE 'BN200__';
DELETE d FROM dot_dieu_tri d
  JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
  WHERE bn.ma_benh_nhan LIKE 'BN200__';
DELETE FROM benh_nhan WHERE ma_benh_nhan LIKE 'BN2000%';

-- Helper procedure: insert one full outpatient prescription
DROP PROCEDURE IF EXISTS seed_one_rx;
DELIMITER $$
CREATE PROCEDURE seed_one_rx(
  IN p_ma_bn VARCHAR(20), IN p_ho_ten VARCHAR(100), IN p_ngay_sinh DATE,
  IN p_gioi_tinh ENUM('Nam','Nu'), IN p_bhyt VARCHAR(15), IN p_dia_chi VARCHAR(500),
  IN p_ma_benh VARCHAR(10), IN p_chan_doan VARCHAR(500), IN p_muc_huong INT,
  IN p_items JSON
)
BEGIN
  DECLARE v_bn INT; DECLARE v_dot INT; DECLARE v_don INT;
  DECLARE v_i INT DEFAULT 0; DECLARE v_n INT;

  INSERT INTO benh_nhan (ma_benh_nhan, ho_ten, ngay_sinh, gioi_tinh, so_the_bhyt, dia_chi, dien_thoai)
    VALUES (p_ma_bn, p_ho_ten, p_ngay_sinh, p_gioi_tinh, p_bhyt, p_dia_chi, '0901234567');
  SET v_bn = LAST_INSERT_ID();

  INSERT INTO dot_dieu_tri (benh_nhan_id, loai_hinh, ngay_vao, ma_benh, chan_doan_lam_sang, muc_huong)
    VALUES (v_bn, 'ngoai_tru', NOW(), p_ma_benh, p_chan_doan, p_muc_huong);
  SET v_dot = LAST_INSERT_ID();

  INSERT INTO don_thuoc (dot_dieu_tri_id, bac_si_ke, ngay_ke, chan_doan, trang_thai)
    VALUES (v_dot, 'BS. Trần Văn Nam', NOW(), p_chan_doan, 'moi');
  SET v_don = LAST_INSERT_ID();

  SET v_n = JSON_LENGTH(p_items);
  WHILE v_i < v_n DO
    INSERT INTO chi_tiet_don_thuoc (don_thuoc_id, thuoc_id, so_luong, lieu_dung)
      VALUES (v_don,
        JSON_EXTRACT(p_items, CONCAT('$[', v_i, '].thuoc_id')),
        JSON_EXTRACT(p_items, CONCAT('$[', v_i, '].so_luong')),
        JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[', v_i, '].lieu_dung'))));
    SET v_i = v_i + 1;
  END WHILE;
END$$
DELIMITER ;

-- =====================================================
-- GROUP A: BHYT-insured patients (8)
-- =====================================================
CALL seed_one_rx('BN20001', 'Nguyễn Văn An', '1960-03-15', 'Nam', 'HN4010012345678', 'Hà Nội',
  'I10', 'Tăng huyết áp vô căn', 80,
  JSON_ARRAY(
    JSON_OBJECT('thuoc_id', 1, 'so_luong', 30, 'lieu_dung', '1 viên/ngày sáng'),
    JSON_OBJECT('thuoc_id', 2, 'so_luong', 30, 'lieu_dung', '1 viên/ngày tối'),
    JSON_OBJECT('thuoc_id', 4, 'so_luong', 30, 'lieu_dung', '1 viên/tối')
  ));

CALL seed_one_rx('BN20002', 'Trần Thị Bình', '1955-07-22', 'Nu', 'HN4010023456789', 'Hà Nội',
  'E11', 'Đái tháo đường typ 2 ổn định', 80,
  JSON_ARRAY(
    JSON_OBJECT('thuoc_id', 7, 'so_luong', 60, 'lieu_dung', '1 viên x 2 lần sau ăn'),
    JSON_OBJECT('thuoc_id', 8, 'so_luong', 30, 'lieu_dung', '1 viên/sáng')
  ));

CALL seed_one_rx('BN20003', 'Lê Văn Cường', '1972-11-10', 'Nam', 'HN4010034567890', 'Hà Nội',
  'J18', 'Viêm phổi cộng đồng mức độ nhẹ', 80,
  JSON_ARRAY(
    JSON_OBJECT('thuoc_id', 13, 'so_luong', 7, 'lieu_dung', '1 viên/ngày x 7 ngày'),
    JSON_OBJECT('thuoc_id', 15, 'so_luong', 20, 'lieu_dung', '1 viên x 3 lần/ngày khi sốt')
  ));

CALL seed_one_rx('BN20004', 'Phạm Thị Dung', '1948-04-05', 'Nu', 'HN4010045678901', 'Hà Nội',
  'I50', 'Suy tim mạn tính NYHA II', 95,
  JSON_ARRAY(
    JSON_OBJECT('thuoc_id', 3, 'so_luong', 30, 'lieu_dung', '1 viên/sáng'),
    JSON_OBJECT('thuoc_id', 6, 'so_luong', 30, 'lieu_dung', '1 viên/sáng'),
    JSON_OBJECT('thuoc_id', 5, 'so_luong', 30, 'lieu_dung', '1 viên/tối')
  ));

CALL seed_one_rx('BN20005', 'Hoàng Văn Em', '1985-09-18', 'Nam', 'HN4010056789012', 'Hà Nội',
  'K29', 'Viêm dạ dày mạn, đợt cấp', 80,
  JSON_ARRAY(
    JSON_OBJECT('thuoc_id', 18, 'so_luong', 30, 'lieu_dung', '1 viên/sáng trước ăn'),
    JSON_OBJECT('thuoc_id', 20, 'so_luong', 30, 'lieu_dung', '1 viên x 3 lần/ngày')
  ));

CALL seed_one_rx('BN20006', 'Võ Thị Phương', '1990-01-30', 'Nu', 'HN4010067890123', 'Hà Nội',
  'J45', 'Hen phế quản, cơn nhẹ', 80,
  JSON_ARRAY(
    JSON_OBJECT('thuoc_id', 21, 'so_luong', 60, 'lieu_dung', '1 viên x 3 lần/ngày'),
    JSON_OBJECT('thuoc_id', 23, 'so_luong', 30, 'lieu_dung', '1 viên/tối')
  ));

CALL seed_one_rx('BN20007', 'Đặng Văn Giang', '1965-08-25', 'Nam', 'HN4010078901234', 'Hà Nội',
  'M10', 'Gout cấp', 80,
  JSON_ARRAY(
    JSON_OBJECT('thuoc_id', 16, 'so_luong', 20, 'lieu_dung', '1 viên x 3 lần/ngày x 5 ngày')
  ));

CALL seed_one_rx('BN20008', 'Bùi Thị Hương', '1942-12-12', 'Nu', 'HN4010089012345', 'Hà Nội',
  'I11', 'Bệnh tim do tăng huyết áp', 100,
  JSON_ARRAY(
    JSON_OBJECT('thuoc_id', 1, 'so_luong', 30, 'lieu_dung', '1 viên/sáng'),
    JSON_OBJECT('thuoc_id', 3, 'so_luong', 30, 'lieu_dung', '1 viên/sáng'),
    JSON_OBJECT('thuoc_id', 4, 'so_luong', 30, 'lieu_dung', '1 viên/tối')
  ));

-- =====================================================
-- GROUP B: Self-pay patients (no BHYT card, 4)
-- =====================================================
CALL seed_one_rx('BN20009', 'Nguyễn Minh Quang', '1998-06-08', 'Nam', NULL, 'Bắc Ninh',
  'K25', 'Loét dạ dày, đau thượng vị', 80,
  JSON_ARRAY(
    JSON_OBJECT('thuoc_id', 18, 'so_luong', 30, 'lieu_dung', '1 viên/sáng trước ăn'),
    JSON_OBJECT('thuoc_id', 15, 'so_luong', 20, 'lieu_dung', '1 viên khi đau')
  ));

CALL seed_one_rx('BN20010', 'Trần Văn Long', '2000-10-20', 'Nam', NULL, 'Nam Định',
  'K29', 'Viêm dạ dày cấp sau NSAID', 80,
  JSON_ARRAY(
    JSON_OBJECT('thuoc_id', 10, 'so_luong', 21, 'lieu_dung', '1 viên x 3 lần/ngày x 7 ngày'),
    JSON_OBJECT('thuoc_id', 18, 'so_luong', 14, 'lieu_dung', '1 viên/sáng')
  ));

CALL seed_one_rx('BN20011', 'Lê Thị Mai', '1995-02-14', 'Nu', NULL, 'Hải Dương',
  'M10', 'Cơn gout cấp khớp ngón chân cái', 80,
  JSON_ARRAY(
    JSON_OBJECT('thuoc_id', 16, 'so_luong', 20, 'lieu_dung', '1 viên x 3 lần/ngày x 5 ngày'),
    JSON_OBJECT('thuoc_id', 15, 'so_luong', 15, 'lieu_dung', '1 viên khi đau')
  ));

CALL seed_one_rx('BN20012', 'Phạm Thanh Tùng', '1988-05-05', 'Nam', NULL, 'Vĩnh Phúc',
  'G40', 'Động kinh đang điều trị', 80,
  JSON_ARRAY(
    JSON_OBJECT('thuoc_id', 28, 'so_luong', 60, 'lieu_dung', '1 viên x 2 lần/ngày')
  ));

DROP PROCEDURE seed_one_rx;

-- =====================================================
-- VERIFY
-- =====================================================
SELECT CONCAT('Inserted: ', COUNT(*)) AS status
FROM don_thuoc dt
JOIN dot_dieu_tri d ON dt.dot_dieu_tri_id = d.id
JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
WHERE bn.ma_benh_nhan LIKE 'BN200__' AND dt.trang_thai = 'moi';
