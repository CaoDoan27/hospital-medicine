-- =====================================================
-- DỮ LIỆU MẪU - Y LỆNH NỘI TRÚ & CẤP PHÁT NỘI TRÚ
-- Tạo y lệnh cho bệnh nhân nội trú đang điều trị
-- Ngày y lệnh: hôm nay (dùng CURDATE())
-- Rerun-safe: xóa dữ liệu cũ trước khi chèn
-- =====================================================
USE hospital_medicine;
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Xóa dữ liệu cũ từ file này (nếu chạy lại)
-- Dùng LIKE '%seed%' để bắt cả dữ liệu bị lỗi encoding
DELETE ply FROM phieu_linh_y_lenh ply
  JOIN y_lenh yl ON ply.y_lenh_id = yl.id
  WHERE yl.bac_si_chi_dinh LIKE '%seed%';
DELETE FROM y_lenh WHERE bac_si_chi_dinh LIKE '%seed%';

-- Xóa y_lenh liên kết với BN300xx trước khi xóa dot_dieu_tri
DELETE ply FROM phieu_linh_y_lenh ply
  JOIN y_lenh yl ON ply.y_lenh_id = yl.id
  JOIN dot_dieu_tri d ON yl.dot_dieu_tri_id = d.id
  JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
  WHERE bn.ma_benh_nhan LIKE 'BN300__';
DELETE yl FROM y_lenh yl
  JOIN dot_dieu_tri d ON yl.dot_dieu_tri_id = d.id
  JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
  WHERE bn.ma_benh_nhan LIKE 'BN300__';

-- Xóa bệnh nhân nội trú mẫu mới
DELETE ct FROM chi_tiet_phieu_linh ct
  JOIN phieu_linh pl ON ct.phieu_linh_id = pl.id
  WHERE pl.khoa IN ('Khoa Nội','Khoa Ngoại','Khoa Cấp cứu');
DELETE ply FROM phieu_linh_y_lenh ply
  JOIN phieu_linh pl ON ply.phieu_linh_id = pl.id
  WHERE pl.khoa IN ('Khoa Nội','Khoa Ngoại','Khoa Cấp cứu');

DELETE d FROM dot_dieu_tri d
  JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
  WHERE bn.ma_benh_nhan LIKE 'BN300__' AND d.loai_hinh = 'noi_tru';
DELETE FROM benh_nhan WHERE ma_benh_nhan LIKE 'BN300__';

-- =====================================================
-- THÊM BỆNH NHÂN NỘI TRÚ MỚI
-- =====================================================
INSERT INTO benh_nhan (ma_benh_nhan, ho_ten, ngay_sinh, gioi_tinh, so_dinh_danh, so_the_bhyt, dia_chi) VALUES
('BN30001', 'Trần Văn Minh',   '1958-05-12', 'Nam', '001058011111', 'DN4950300011', '56 Lê Lợi, Q. Hải Châu, TP Đà Nẵng'),
('BN30002', 'Nguyễn Thị Hồng', '1970-09-28', 'Nu',  '001070022222', 'DN4950300022', '78 Bạch Đằng, Q. Hải Châu, TP Đà Nẵng'),
('BN30003', 'Phan Văn Đức',    '1982-02-14', 'Nam', '001082033333', 'DN4950300033', '120 Nguyễn Tri Phương, Q. Thanh Khê, TP Đà Nẵng'),
('BN30004', 'Lê Thị Thanh',    '1963-11-03', 'Nu',  '001063044444', 'DN4950300044', '45 Hùng Vương, Q. Hải Châu, TP Đà Nẵng'),
('BN30005', 'Đỗ Quốc Bảo',     '1975-07-19', 'Nam', '001075055555', '',             '89 Ông Ích Khiêm, Q. Hải Châu, TP Đà Nẵng');

-- =====================================================
-- ĐỢT ĐIỀU TRỊ NỘI TRÚ MỚI
-- =====================================================
-- Lấy ID bệnh nhân vừa thêm
SET @bn1 = (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN30001');
SET @bn2 = (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN30002');
SET @bn3 = (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN30003');
SET @bn4 = (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN30004');
SET @bn5 = (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN30005');

INSERT INTO dot_dieu_tri (benh_nhan_id, loai_hinh, khoa, ngay_vao, ngay_ra, ma_benh, chan_doan_lam_sang, muc_huong) VALUES
(@bn1, 'noi_tru', 'Khoa Nội',    DATE_SUB(CURDATE(), INTERVAL 3 DAY), NULL, 'I10',   'Tăng huyết áp cấp cứu - Tổn thương cơ quan đích', 80),
(@bn2, 'noi_tru', 'Khoa Nội',    DATE_SUB(CURDATE(), INTERVAL 2 DAY), NULL, 'E11',   'Đái tháo đường typ 2 - Hạ đường huyết nặng', 100),
(@bn3, 'noi_tru', 'Khoa Ngoại',  DATE_SUB(CURDATE(), INTERVAL 1 DAY), NULL, 'K26',   'Loét tá tràng - Xuất huyết tiêu hóa trên', 80),
(@bn4, 'noi_tru', 'Khoa Nội',    DATE_SUB(CURDATE(), INTERVAL 5 DAY), NULL, 'J44',   'Bệnh phổi tắc nghẽn mạn tính đợt cấp', 95),
(@bn5, 'noi_tru', 'Khoa Cấp cứu', CURDATE(), NULL, 'J18', 'Viêm phổi nặng cộng đồng', 80);

SET @dot1 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @bn1 AND loai_hinh = 'noi_tru' ORDER BY id DESC LIMIT 1);
SET @dot2 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @bn2 AND loai_hinh = 'noi_tru' ORDER BY id DESC LIMIT 1);
SET @dot3 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @bn3 AND loai_hinh = 'noi_tru' ORDER BY id DESC LIMIT 1);
SET @dot4 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @bn4 AND loai_hinh = 'noi_tru' ORDER BY id DESC LIMIT 1);
SET @dot5 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @bn5 AND loai_hinh = 'noi_tru' ORDER BY id DESC LIMIT 1);

-- Lấy ID đợt điều trị cũ (bệnh nhân đã có từ seed.sql)
-- dot_dieu_tri ID 4: Lê Hoàng Nam - Khoa Nội - Viêm phổi
-- dot_dieu_tri ID 5: Võ Minh Tuấn - Khoa Ngoại - Loét dạ dày
-- dot_dieu_tri ID 6: Hoàng Thị Hoa - Khoa Nội - Suy tim
-- dot_dieu_tri ID 7: Bùi Thị Ngọc - Khoa Nội - Bệnh thận mạn

-- =====================================================
-- Y LỆNH HÔM NAY - KHOA NỘI (nhiều bệnh nhân)
-- =====================================================
INSERT INTO y_lenh (dot_dieu_tri_id, thuoc_id, so_luong, lieu_dung, ngay_y_lenh, buoi, bac_si_chi_dinh, trang_thai) VALUES
-- BN Lê Hoàng Nam (dot 4) - Viêm phổi cộng đồng
(4, 12, 2, 'Ceftriaxon 1g x 2 lọ TM/ngày',            CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),
(4, 12, 2, 'Ceftriaxon 1g x 2 lọ TM/ngày',            CURDATE(), 'chieu', 'BS. Trần Văn Nam (seed)', 'chua_linh'),
(4, 15, 2, 'Paracetamol 500mg x 2 viên khi sốt >38.5', CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),
(4, 24, 2, 'NaCl 0.9% 500ml x 2 chai truyền TM',       CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),

-- BN Hoàng Thị Hoa (dot 6) - Suy tim sung huyết
(6, 6,  2, 'Furosemid 40mg x 2 viên sáng',             CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),
(6, 3,  1, 'Bisoprolol 5mg x 1 viên sáng',             CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),
(6, 2,  1, 'Losartan 50mg x 1 viên tối',               CURDATE(), 'toi',   'BS. Trần Văn Nam (seed)', 'chua_linh'),
(6, 4,  1, 'Atorvastatin 20mg x 1 viên tối',           CURDATE(), 'toi',   'BS. Trần Văn Nam (seed)', 'chua_linh'),

-- BN Bùi Thị Ngọc (dot 7) - Bệnh thận mạn gđ5
(7, 24, 3, 'NaCl 0.9% 500ml x 3 chai truyền',          CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),
(7, 25, 1, 'Glucose 5% 500ml x 1 chai truyền',         CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),
(7, 1,  1, 'Amlodipine 5mg x 1 viên sáng',             CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),
(7, 15, 2, 'Paracetamol 500mg khi đau',                 CURDATE(), 'chieu', 'BS. Trần Văn Nam (seed)', 'chua_linh'),

-- BN Trần Văn Minh (@dot1) - THA cấp cứu
(@dot1, 1,  2, 'Amlodipine 5mg x 2 viên sáng',          CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),
(@dot1, 2,  1, 'Losartan 50mg x 1 viên sáng',           CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),
(@dot1, 3,  1, 'Bisoprolol 5mg x 1 viên sáng',          CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),
(@dot1, 6,  1, 'Furosemid 40mg x 1 viên sáng',          CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),
(@dot1, 24, 1, 'NaCl 0.9% 500ml truyền TM chậm',        CURDATE(), 'chieu', 'BS. Trần Văn Nam (seed)', 'chua_linh'),

-- BN Nguyễn Thị Hồng (@dot2) - ĐTĐ typ2 hạ ĐH nặng
(@dot2, 25, 3, 'Glucose 5% 500ml x 3 chai truyền',      CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),
(@dot2, 7,  1, 'Metformin 850mg x 1 viên trưa sau ăn',  CURDATE(), 'chieu', 'BS. Trần Văn Nam (seed)', 'chua_linh'),
(@dot2, 15, 2, 'Paracetamol 500mg khi sốt',             CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),

-- BN Lê Thị Thanh (@dot4) - COPD đợt cấp
(@dot4, 21, 3, 'Salbutamol 2mg x 3 viên/ngày',          CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),
(@dot4, 22, 2, 'Salbutamol KD 5mg/2.5ml x 2 ống',       CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),
(@dot4, 29, 1, 'Methylprednisolon 16mg x 1 viên sáng',  CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),
(@dot4, 13, 1, 'Levofloxacin 500mg x 1 viên/ngày',      CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),
(@dot4, 18, 1, 'Omeprazol 20mg x 1 viên sáng',          CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),
(@dot4, 24, 1, 'NaCl 0.9% 500ml truyền TM',             CURDATE(), 'chieu', 'BS. Trần Văn Nam (seed)', 'chua_linh');

-- =====================================================
-- Y LỆNH HÔM NAY - KHOA NGOẠI
-- =====================================================
INSERT INTO y_lenh (dot_dieu_tri_id, thuoc_id, so_luong, lieu_dung, ngay_y_lenh, buoi, bac_si_chi_dinh, trang_thai) VALUES
-- BN Võ Minh Tuấn (dot 5) - Loét dạ dày XH tiêu hóa
(5, 19, 2, 'Esomeprazol 40mg TM x 2 lọ/ngày',          CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),
(5, 19, 2, 'Esomeprazol 40mg TM x 2 lọ/ngày',          CURDATE(), 'chieu', 'BS. Trần Văn Nam (seed)', 'chua_linh'),
(5, 24, 2, 'NaCl 0.9% 500ml x 2 chai truyền',          CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),
(5, 26, 1, 'Ringer Lactat 500ml x 1 chai',              CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),
(5, 15, 2, 'Paracetamol 500mg khi đau',                 CURDATE(), 'chieu', 'BS. Trần Văn Nam (seed)', 'chua_linh'),
(5, 12, 1, 'Ceftriaxon 1g x 1 lọ TM (dự phòng)',       CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),

-- BN Phan Văn Đức (@dot3) - Loét tá tràng XH
(@dot3, 19, 2, 'Esomeprazol 40mg TM x 2 lọ/ngày',      CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),
(@dot3, 24, 2, 'NaCl 0.9% 500ml x 2 chai truyền',      CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),
(@dot3, 26, 1, 'Ringer Lactat 500ml x 1 chai',          CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),
(@dot3, 17, 1, 'Tramadol 50mg khi đau nhiều',           CURDATE(), 'chieu', 'BS. Trần Văn Nam (seed)', 'chua_linh'),
(@dot3, 30, 1, 'Dexamethason 4mg TM x 1 ống',           CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh');

-- =====================================================
-- Y LỆNH HÔM NAY - KHOA CẤP CỨU
-- =====================================================
INSERT INTO y_lenh (dot_dieu_tri_id, thuoc_id, so_luong, lieu_dung, ngay_y_lenh, buoi, bac_si_chi_dinh, trang_thai) VALUES
-- BN Đỗ Quốc Bảo (@dot5) - Viêm phổi nặng
(@dot5, 12, 2, 'Ceftriaxon 1g x 2 lọ TM/ngày',          CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),
(@dot5, 13, 1, 'Levofloxacin 500mg x 1 viên/ngày',      CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),
(@dot5, 24, 3, 'NaCl 0.9% 500ml x 3 chai truyền',       CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),
(@dot5, 15, 3, 'Paracetamol 500mg x 3 viên khi sốt',    CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),
(@dot5, 30, 1, 'Dexamethason 4mg TM x 1 ống',            CURDATE(), 'sang',  'BS. Trần Văn Nam (seed)', 'chua_linh'),
(@dot5, 22, 2, 'Salbutamol KD 5mg/2.5ml x 2 ống',        CURDATE(), 'chieu', 'BS. Trần Văn Nam (seed)', 'chua_linh');

-- =====================================================
-- VERIFY
-- =====================================================
SELECT 'TỔNG Y LỆNH THEO KHOA' AS '';
SELECT d.khoa, COUNT(*) as so_y_lenh, COUNT(DISTINCT d.benh_nhan_id) as so_benh_nhan
FROM y_lenh yl
JOIN dot_dieu_tri d ON yl.dot_dieu_tri_id = d.id
WHERE yl.trang_thai = 'chua_linh' AND yl.ngay_y_lenh = CURDATE()
GROUP BY d.khoa;
