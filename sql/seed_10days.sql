-- =====================================================
-- DỮ LIỆU TEST 10 NGÀY GẦN NHẤT (13/06 - 22/06/2026)
-- Bao gồm: Bệnh nhân, Đợt điều trị, Đơn thuốc ngoại trú,
--           Y lệnh nội trú, Phiếu nhập kho, Biến động kho
-- Rerun-safe: xóa dữ liệu cũ trước khi chèn
-- =====================================================
USE hospital_medicine;
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- =====================================================
-- CLEANUP - Xóa dữ liệu cũ từ file này
-- =====================================================
-- Xóa chi phí BHYT liên quan
DELETE cp FROM chi_phi_bhyt cp
  JOIN dot_dieu_tri d ON cp.dot_dieu_tri_id = d.id
  JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
  WHERE bn.ma_benh_nhan LIKE 'BN100__';

-- Xóa chi tiết cấp phát
DELETE ccp FROM chi_tiet_cap_phat ccp
  JOIN don_thuoc dt ON ccp.don_thuoc_id = dt.id
  JOIN dot_dieu_tri d ON dt.dot_dieu_tri_id = d.id
  JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
  WHERE bn.ma_benh_nhan LIKE 'BN100__';

-- Xóa chi tiết đơn thuốc
DELETE ct FROM chi_tiet_don_thuoc ct
  JOIN don_thuoc dt ON ct.don_thuoc_id = dt.id
  JOIN dot_dieu_tri d ON dt.dot_dieu_tri_id = d.id
  JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
  WHERE bn.ma_benh_nhan LIKE 'BN100__';

-- Xóa đơn thuốc
DELETE dt FROM don_thuoc dt
  JOIN dot_dieu_tri d ON dt.dot_dieu_tri_id = d.id
  JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
  WHERE bn.ma_benh_nhan LIKE 'BN100__';

-- Xóa phiếu lĩnh y lệnh
DELETE ply FROM phieu_linh_y_lenh ply
  JOIN y_lenh yl ON ply.y_lenh_id = yl.id
  JOIN dot_dieu_tri d ON yl.dot_dieu_tri_id = d.id
  JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
  WHERE bn.ma_benh_nhan LIKE 'BN100__';

-- Xóa y lệnh
DELETE yl FROM y_lenh yl
  JOIN dot_dieu_tri d ON yl.dot_dieu_tri_id = d.id
  JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
  WHERE bn.ma_benh_nhan LIKE 'BN100__';

-- Xóa hàng chờ hoàn ứng
DELETE hc FROM hang_cho_hoan_ung hc
  JOIN dot_dieu_tri d ON hc.dot_dieu_tri_id = d.id
  JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
  WHERE bn.ma_benh_nhan LIKE 'BN100__';

-- Xóa đợt điều trị
DELETE d FROM dot_dieu_tri d
  JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
  WHERE bn.ma_benh_nhan LIKE 'BN100__';

-- Xóa bệnh nhân
DELETE FROM benh_nhan WHERE ma_benh_nhan LIKE 'BN100__';

-- Xóa biến động kho seed
DELETE FROM bien_dong_kho WHERE phieu_lien_quan LIKE 'SEED10D-%';

-- Xóa phiếu nhập seed
DELETE ct FROM chi_tiet_nhap_kho ct
  JOIN phieu_nhap_kho pn ON ct.phieu_nhap_id = pn.id
  WHERE pn.so_hoa_don LIKE 'SEED10D-%';
DELETE FROM phieu_nhap_kho WHERE so_hoa_don LIKE 'SEED10D-%';

-- Xóa phiếu điều chuyển seed
DELETE ct FROM chi_tiet_dieu_chuyen ct
  JOIN phieu_dieu_chuyen pdc ON ct.phieu_id = pdc.id
  WHERE pdc.ghi_chu LIKE '%SEED10D%';
DELETE FROM phieu_dieu_chuyen WHERE ghi_chu LIKE '%SEED10D%';

-- =====================================================
-- BỆNH NHÂN MỚI (20 bệnh nhân)
-- =====================================================
INSERT INTO benh_nhan (ma_benh_nhan, ho_ten, ngay_sinh, gioi_tinh, so_dinh_danh, so_the_bhyt, dia_chi, dien_thoai) VALUES
-- Ngoại trú
('BN10001', 'Nguyễn Văn Hải',    '1962-04-12', 'Nam', '001062001001', 'DN4951000001', '12 Lê Lợi, Q. Hải Châu, TP Đà Nẵng',           '0905111001'),
('BN10002', 'Trần Thị Ngọc Ánh', '1975-08-23', 'Nu',  '001075002002', 'DN4951000002', '89 Nguyễn Văn Linh, Q. Thanh Khê, TP Đà Nẵng',  '0905111002'),
('BN10003', 'Lê Quốc Trung',     '1988-01-15', 'Nam', '001088003003', 'DN4951000003', '45 Hàm Nghi, Q. Thanh Khê, TP Đà Nẵng',         '0905111003'),
('BN10004', 'Phạm Thị Thu Hà',   '1950-12-08', 'Nu',  '001050004004', 'DN4951000004', '67 Trưng Nữ Vương, Q. Hải Châu, TP Đà Nẵng',    '0905111004'),
('BN10005', 'Võ Đình Phúc',      '1993-06-30', 'Nam', '001093005005', '',             '23 Phan Đăng Lưu, Q. Hải Châu, TP Đà Nẵng',     '0905111005'),
('BN10006', 'Hoàng Thị Kim Liên','1968-03-17', 'Nu',  '001068006006', 'DN4951000006', '156 Điện Biên Phủ, Q. Thanh Khê, TP Đà Nẵng',   '0905111006'),
('BN10007', 'Đặng Minh Tân',     '1980-09-05', 'Nam', '001080007007', 'DN4951000007', '78 Lê Đình Dương, Q. Hải Châu, TP Đà Nẵng',     '0905111007'),
('BN10008', 'Bùi Thị Thanh Xuân','1972-11-22', 'Nu',  '001072008008', '',             '34 Hoàng Diệu, Q. Hải Châu, TP Đà Nẵng',        '0905111008'),
('BN10009', 'Ngô Văn Tài',       '1995-02-14', 'Nam', '001095009009', 'DN4951000009', '90 Ông Ích Khiêm, Q. Hải Châu, TP Đà Nẵng',     '0905111009'),
('BN10010', 'Dương Thị Hồng',    '1958-07-19', 'Nu',  '001058010010', 'DN4951000010', '112 Trần Cao Vân, Q. Thanh Khê, TP Đà Nẵng',    '0905111010'),
-- Nội trú
('BN10011', 'Trịnh Văn Long',    '1955-03-28', 'Nam', '001055011011', 'DN4951000011', '56 Núi Thành, Q. Hải Châu, TP Đà Nẵng',         '0905111011'),
('BN10012', 'Mai Thị Hương',     '1963-10-14', 'Nu',  '001063012012', 'DN4951000012', '29 Pasteur, Q. Hải Châu, TP Đà Nẵng',            '0905111012'),
('BN10013', 'Phan Quốc Việt',    '1978-05-06', 'Nam', '001078013013', 'DN4951000013', '167 Nguyễn Chí Thanh, Q. Hải Châu, TP Đà Nẵng', '0905111013'),
('BN10014', 'Lý Thị Bích Ngọc',  '1945-08-20', 'Nu',  '001045014014', 'DN4951000014', '43 Hùng Vương, Q. Hải Châu, TP Đà Nẵng',        '0905111014'),
('BN10015', 'Tô Văn Đức',        '1970-12-01', 'Nam', '001070015015', 'DN4951000015', '88 Hai Bà Trưng, Q. Hải Châu, TP Đà Nẵng',      '0905111015'),
('BN10016', 'Châu Thị Mỹ Dung',  '1982-04-25', 'Nu',  '001082016016', '',             '201 Lê Duẩn, Q. Hải Châu, TP Đà Nẵng',           '0905111016'),
('BN10017', 'Huỳnh Tấn Phát',    '1960-01-09', 'Nam', '001060017017', 'DN4951000017', '15 Bạch Đằng, Q. Hải Châu, TP Đà Nẵng',         '0905111017'),
('BN10018', 'Vũ Thị Lan Anh',    '1987-06-18', 'Nu',  '001087018018', 'DN4951000018', '72 Yên Bái, Q. Hải Châu, TP Đà Nẵng',            '0905111018'),
('BN10019', 'Đinh Công Sơn',     '1973-09-12', 'Nam', '001073019019', 'DN4951000019', '38 Thái Phiên, Q. Hải Châu, TP Đà Nẵng',        '0905111019'),
('BN10020', 'Lương Thị Thu Thủy','1966-02-28', 'Nu',  '001066020020', 'DN4951000020', '145 Phan Châu Trinh, Q. Hải Châu, TP Đà Nẵng',  '0905111020');

-- Lấy ID bệnh nhân
SET @p01 = (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN10001');
SET @p02 = (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN10002');
SET @p03 = (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN10003');
SET @p04 = (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN10004');
SET @p05 = (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN10005');
SET @p06 = (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN10006');
SET @p07 = (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN10007');
SET @p08 = (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN10008');
SET @p09 = (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN10009');
SET @p10 = (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN10010');
SET @p11 = (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN10011');
SET @p12 = (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN10012');
SET @p13 = (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN10013');
SET @p14 = (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN10014');
SET @p15 = (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN10015');
SET @p16 = (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN10016');
SET @p17 = (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN10017');
SET @p18 = (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN10018');
SET @p19 = (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN10019');
SET @p20 = (SELECT id FROM benh_nhan WHERE ma_benh_nhan = 'BN10020');

-- =====================================================
-- ĐỢT ĐIỀU TRỊ NGOẠI TRÚ (rải đều 10 ngày)
-- =====================================================
INSERT INTO dot_dieu_tri (benh_nhan_id, loai_hinh, khoa, ngay_vao, ngay_ra, ma_benh, chan_doan_lam_sang, muc_huong) VALUES
-- Ngày 13/06 (cách 9 ngày)
(@p01, 'ngoai_tru', NULL, '2026-06-13 08:30:00', '2026-06-13 11:00:00', 'I10',  'Tăng huyết áp vô căn - tái khám', 80),
(@p02, 'ngoai_tru', NULL, '2026-06-13 09:15:00', '2026-06-13 11:30:00', 'E11',  'Đái tháo đường typ 2 - tái khám', 100),
-- Ngày 14/06
(@p03, 'ngoai_tru', NULL, '2026-06-14 08:00:00', '2026-06-14 10:00:00', 'J45',  'Hen phế quản - kiểm soát kém', 80),
(@p04, 'ngoai_tru', NULL, '2026-06-14 10:30:00', '2026-06-14 12:00:00', 'I50',  'Suy tim mạn NYHA II - tái khám', 100),
-- Ngày 15/06
(@p05, 'ngoai_tru', NULL, '2026-06-15 08:45:00', '2026-06-15 10:30:00', 'K29',  'Viêm dạ dày mạn - đau thượng vị', 80),
(@p06, 'ngoai_tru', NULL, '2026-06-15 09:30:00', '2026-06-15 11:00:00', 'M10',  'Bệnh Gout - cơn cấp', 80),
-- Ngày 16/06
(@p07, 'ngoai_tru', NULL, '2026-06-16 08:15:00', '2026-06-16 10:00:00', 'I25',  'Bệnh tim thiếu máu cục bộ mạn', 95),
-- Ngày 17/06
(@p08, 'ngoai_tru', NULL, '2026-06-17 09:00:00', '2026-06-17 11:00:00', 'J44',  'COPD đợt cấp nhẹ', 80),
(@p09, 'ngoai_tru', NULL, '2026-06-17 10:00:00', '2026-06-17 11:30:00', 'E11',  'ĐTĐ typ 2 mới phát hiện', 80),
-- Ngày 18/06
(@p10, 'ngoai_tru', NULL, '2026-06-18 08:30:00', '2026-06-18 10:30:00', 'I10',  'THA + ĐTĐ typ 2 tái khám', 100),
-- Ngày 19/06
(@p01, 'ngoai_tru', NULL, '2026-06-19 08:00:00', '2026-06-19 10:00:00', 'I10',  'Tăng huyết áp - kiểm tra lại', 80),
-- Ngày 20/06
(@p05, 'ngoai_tru', NULL, '2026-06-20 09:00:00', '2026-06-20 10:30:00', 'K25',  'Loét dạ dày - tái khám', 80),
(@p09, 'ngoai_tru', NULL, '2026-06-20 10:00:00', '2026-06-20 11:30:00', 'E11',  'ĐTĐ typ 2 - tái khám 3 ngày', 80),
-- Ngày 21/06
(@p06, 'ngoai_tru', NULL, '2026-06-21 08:30:00', '2026-06-21 10:00:00', 'M10',  'Gout - tái khám sau cơn cấp', 80),
(@p02, 'ngoai_tru', NULL, '2026-06-21 09:00:00', '2026-06-21 11:00:00', 'E11',  'ĐTĐ typ 2 + biến chứng mắt', 100),
-- Ngày 22/06 (hôm nay)
(@p03, 'ngoai_tru', NULL, '2026-06-22 08:00:00', '2026-06-22 10:00:00', 'J45',  'Hen phế quản - tái khám', 80),
(@p10, 'ngoai_tru', NULL, '2026-06-22 09:30:00', NULL, 'I10', 'Tăng huyết áp - khám mới', 100);

-- =====================================================
-- ĐỢT ĐIỀU TRỊ NỘI TRÚ (rải đều 10 ngày)
-- =====================================================
INSERT INTO dot_dieu_tri (benh_nhan_id, loai_hinh, khoa, ngay_vao, ngay_ra, ma_benh, chan_doan_lam_sang, muc_huong) VALUES
-- Nhập viện 13/06 - đã ra viện
(@p11, 'noi_tru', 'Khoa Nội',    '2026-06-13 14:00:00', '2026-06-18 10:00:00', 'J18',   'Viêm phổi cộng đồng mức độ trung bình', 80),
-- Nhập viện 14/06 - đã ra viện
(@p12, 'noi_tru', 'Khoa Nội',    '2026-06-14 09:30:00', '2026-06-19 14:00:00', 'I50',   'Suy tim sung huyết NYHA III', 100),
-- Nhập viện 15/06 - đã ra viện
(@p13, 'noi_tru', 'Khoa Ngoại',  '2026-06-15 16:00:00', '2026-06-20 08:00:00', 'K25',   'Loét dạ dày - Xuất huyết tiêu hóa trên', 95),
-- Nhập viện 16/06 - đang điều trị
(@p14, 'noi_tru', 'Khoa Nội',    '2026-06-16 10:30:00', NULL, 'N18.5', 'Bệnh thận mạn giai đoạn 5 - lọc máu chu kỳ', 100),
-- Nhập viện 17/06 - đang điều trị
(@p15, 'noi_tru', 'Khoa Ngoại',  '2026-06-17 08:00:00', NULL, 'K26',   'Loét tá tràng biến chứng thủng', 80),
-- Nhập viện 18/06 - đang điều trị
(@p16, 'noi_tru', 'Khoa Nội',    '2026-06-18 15:00:00', NULL, 'J44',   'COPD đợt cấp nặng - suy hô hấp', 80),
-- Nhập viện 19/06 - đang điều trị
(@p17, 'noi_tru', 'Khoa Nội',    '2026-06-19 11:00:00', NULL, 'I63',   'Nhồi máu não cấp - liệt nửa người phải', 100),
-- Nhập viện 20/06 - đang điều trị
(@p18, 'noi_tru', 'Khoa Ngoại',  '2026-06-20 06:30:00', NULL, 'K25',   'Loét dạ dày - XH tiêu hóa tái phát', 95),
-- Nhập viện 21/06 - đang điều trị
(@p19, 'noi_tru', 'Khoa Nội',    '2026-06-21 14:30:00', NULL, 'E11.2', 'ĐTĐ typ 2 biến chứng thận - suy thận cấp', 100),
-- Nhập viện 22/06 (hôm nay) - đang điều trị
(@p20, 'noi_tru', 'Khoa Cấp cứu','2026-06-22 07:00:00', NULL, 'J18',  'Viêm phổi nặng - suy hô hấp cấp', 80);

-- =====================================================
-- ĐƠN THUỐC NGOẠI TRÚ (cho từng đợt điều trị ngoại trú)
-- =====================================================
-- Lấy ID đợt điều trị ngoại trú
SET @dot_nt01 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @p01 AND ngay_vao = '2026-06-13 08:30:00');
SET @dot_nt02 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @p02 AND ngay_vao = '2026-06-13 09:15:00');
SET @dot_nt03 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @p03 AND ngay_vao = '2026-06-14 08:00:00');
SET @dot_nt04 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @p04 AND ngay_vao = '2026-06-14 10:30:00');
SET @dot_nt05 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @p05 AND ngay_vao = '2026-06-15 08:45:00');
SET @dot_nt06 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @p06 AND ngay_vao = '2026-06-15 09:30:00');
SET @dot_nt07 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @p07 AND ngay_vao = '2026-06-16 08:15:00');
SET @dot_nt08 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @p08 AND ngay_vao = '2026-06-17 09:00:00');
SET @dot_nt09 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @p09 AND ngay_vao = '2026-06-17 10:00:00');
SET @dot_nt10 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @p10 AND ngay_vao = '2026-06-18 08:30:00');
SET @dot_nt11 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @p01 AND ngay_vao = '2026-06-19 08:00:00');
SET @dot_nt12 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @p05 AND ngay_vao = '2026-06-20 09:00:00');
SET @dot_nt13 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @p09 AND ngay_vao = '2026-06-20 10:00:00');
SET @dot_nt14 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @p06 AND ngay_vao = '2026-06-21 08:30:00');
SET @dot_nt15 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @p02 AND ngay_vao = '2026-06-21 09:00:00');
SET @dot_nt16 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @p03 AND ngay_vao = '2026-06-22 08:00:00');
SET @dot_nt17 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @p10 AND ngay_vao = '2026-06-22 09:30:00');

-- === ĐƠN 1: Nguyễn Văn Hải - THA (13/06) - ĐÃ CẤP PHÁT ===
INSERT INTO don_thuoc (dot_dieu_tri_id, bac_si_ke, ngay_ke, chan_doan, trang_thai)
  VALUES (@dot_nt01, 'BS. Trần Văn Nam', '2026-06-13 09:00:00', 'Tăng huyết áp vô căn', 'da_cap_phat');
SET @don1 = LAST_INSERT_ID();
INSERT INTO chi_tiet_don_thuoc (don_thuoc_id, thuoc_id, so_luong, lieu_dung) VALUES
  (@don1, 1, 30, '1 viên/ngày sáng'),
  (@don1, 2, 30, '1 viên/ngày tối'),
  (@don1, 4, 30, '1 viên/tối sau ăn');

-- === ĐƠN 2: Trần Thị Ngọc Ánh - ĐTĐ (13/06) - ĐÃ CẤP PHÁT ===
INSERT INTO don_thuoc (dot_dieu_tri_id, bac_si_ke, ngay_ke, chan_doan, trang_thai)
  VALUES (@dot_nt02, 'BS. Trần Văn Nam', '2026-06-13 09:30:00', 'ĐTĐ typ 2 ổn định', 'da_cap_phat');
SET @don2 = LAST_INSERT_ID();
INSERT INTO chi_tiet_don_thuoc (don_thuoc_id, thuoc_id, so_luong, lieu_dung) VALUES
  (@don2, 7, 60, '1 viên x 2 lần/ngày sau ăn'),
  (@don2, 8, 30, '1 viên/sáng trước ăn');

-- === ĐƠN 3: Lê Quốc Trung - Hen PQ (14/06) - ĐÃ CẤP PHÁT ===
INSERT INTO don_thuoc (dot_dieu_tri_id, bac_si_ke, ngay_ke, chan_doan, trang_thai)
  VALUES (@dot_nt03, 'BS. Trần Văn Nam', '2026-06-14 08:30:00', 'Hen phế quản kiểm soát kém', 'da_cap_phat');
SET @don3 = LAST_INSERT_ID();
INSERT INTO chi_tiet_don_thuoc (don_thuoc_id, thuoc_id, so_luong, lieu_dung) VALUES
  (@don3, 21, 90, '1 viên x 3 lần/ngày'),
  (@don3, 23, 30, '1 viên/tối'),
  (@don3, 29, 15, '1 viên/sáng x 15 ngày');

-- === ĐƠN 4: Phạm Thị Thu Hà - Suy tim (14/06) - ĐÃ CẤP PHÁT ===
INSERT INTO don_thuoc (dot_dieu_tri_id, bac_si_ke, ngay_ke, chan_doan, trang_thai)
  VALUES (@dot_nt04, 'BS. Trần Văn Nam', '2026-06-14 11:00:00', 'Suy tim mạn NYHA II', 'da_cap_phat');
SET @don4 = LAST_INSERT_ID();
INSERT INTO chi_tiet_don_thuoc (don_thuoc_id, thuoc_id, so_luong, lieu_dung) VALUES
  (@don4, 3, 30, '1 viên/sáng'),
  (@don4, 6, 30, '1 viên/sáng'),
  (@don4, 2, 30, '1 viên/tối'),
  (@don4, 5, 30, '1 viên/ngày');

-- === ĐƠN 5: Võ Đình Phúc - VDD (15/06) - ĐÃ CẤP PHÁT ===
INSERT INTO don_thuoc (dot_dieu_tri_id, bac_si_ke, ngay_ke, chan_doan, trang_thai)
  VALUES (@dot_nt05, 'BS. Trần Văn Nam', '2026-06-15 09:00:00', 'Viêm dạ dày mạn', 'da_cap_phat');
SET @don5 = LAST_INSERT_ID();
INSERT INTO chi_tiet_don_thuoc (don_thuoc_id, thuoc_id, so_luong, lieu_dung) VALUES
  (@don5, 18, 30, '1 viên/sáng trước ăn 30 phút'),
  (@don5, 20, 30, '1 viên x 3 lần/ngày trước ăn'),
  (@don5, 15, 10, '1 viên khi đau');

-- === ĐƠN 6: Hoàng Thị Kim Liên - Gout (15/06) - ĐÃ CẤP PHÁT ===
INSERT INTO don_thuoc (dot_dieu_tri_id, bac_si_ke, ngay_ke, chan_doan, trang_thai)
  VALUES (@dot_nt06, 'BS. Trần Văn Nam', '2026-06-15 10:00:00', 'Gout cấp', 'da_cap_phat');
SET @don6 = LAST_INSERT_ID();
INSERT INTO chi_tiet_don_thuoc (don_thuoc_id, thuoc_id, so_luong, lieu_dung) VALUES
  (@don6, 16, 21, '1 viên x 3 lần/ngày x 7 ngày'),
  (@don6, 15, 10, '1 viên khi đau');

-- === ĐƠN 7: Đặng Minh Tân - BTTMCB (16/06) - ĐÃ CẤP PHÁT ===
INSERT INTO don_thuoc (dot_dieu_tri_id, bac_si_ke, ngay_ke, chan_doan, trang_thai)
  VALUES (@dot_nt07, 'BS. Trần Văn Nam', '2026-06-16 08:45:00', 'Bệnh tim thiếu máu cục bộ mạn', 'da_cap_phat');
SET @don7 = LAST_INSERT_ID();
INSERT INTO chi_tiet_don_thuoc (don_thuoc_id, thuoc_id, so_luong, lieu_dung) VALUES
  (@don7, 5, 30, '1 viên/ngày sau ăn'),
  (@don7, 4, 30, '1 viên/tối'),
  (@don7, 3, 30, '1 viên/sáng'),
  (@don7, 1, 30, '1 viên/sáng');

-- === ĐƠN 8: Bùi Thị Thanh Xuân - COPD (17/06) - ĐÃ CẤP PHÁT ===
INSERT INTO don_thuoc (dot_dieu_tri_id, bac_si_ke, ngay_ke, chan_doan, trang_thai)
  VALUES (@dot_nt08, 'BS. Trần Văn Nam', '2026-06-17 09:30:00', 'COPD đợt cấp nhẹ', 'da_cap_phat');
SET @don8 = LAST_INSERT_ID();
INSERT INTO chi_tiet_don_thuoc (don_thuoc_id, thuoc_id, so_luong, lieu_dung) VALUES
  (@don8, 21, 60, '1 viên x 3 lần/ngày'),
  (@don8, 14, 3, '1 viên/ngày x 3 ngày'),
  (@don8, 18, 14, '1 viên/sáng x 14 ngày');

-- === ĐƠN 9: Ngô Văn Tài - ĐTĐ (17/06) - ĐÃ CẤP PHÁT ===
INSERT INTO don_thuoc (dot_dieu_tri_id, bac_si_ke, ngay_ke, chan_doan, trang_thai)
  VALUES (@dot_nt09, 'BS. Trần Văn Nam', '2026-06-17 10:30:00', 'ĐTĐ typ 2 mới phát hiện', 'da_cap_phat');
SET @don9 = LAST_INSERT_ID();
INSERT INTO chi_tiet_don_thuoc (don_thuoc_id, thuoc_id, so_luong, lieu_dung) VALUES
  (@don9, 7, 60, '1 viên x 2 lần/ngày sau ăn');

-- === ĐƠN 10: Dương Thị Hồng - THA+ĐTĐ (18/06) - ĐÃ CẤP PHÁT ===
INSERT INTO don_thuoc (dot_dieu_tri_id, bac_si_ke, ngay_ke, chan_doan, trang_thai)
  VALUES (@dot_nt10, 'BS. Trần Văn Nam', '2026-06-18 09:00:00', 'THA + ĐTĐ typ 2 tái khám', 'da_cap_phat');
SET @don10 = LAST_INSERT_ID();
INSERT INTO chi_tiet_don_thuoc (don_thuoc_id, thuoc_id, so_luong, lieu_dung) VALUES
  (@don10, 1, 30, '1 viên/sáng'),
  (@don10, 2, 30, '1 viên/tối'),
  (@don10, 7, 60, '1 viên x 2 lần/ngày sau ăn'),
  (@don10, 4, 30, '1 viên/tối');

-- === ĐƠN 11: Nguyễn Văn Hải - THA tái khám (19/06) - ĐÃ CẤP PHÁT ===
INSERT INTO don_thuoc (dot_dieu_tri_id, bac_si_ke, ngay_ke, chan_doan, trang_thai)
  VALUES (@dot_nt11, 'BS. Trần Văn Nam', '2026-06-19 08:30:00', 'THA - kiểm tra lại', 'da_cap_phat');
SET @don11 = LAST_INSERT_ID();
INSERT INTO chi_tiet_don_thuoc (don_thuoc_id, thuoc_id, so_luong, lieu_dung) VALUES
  (@don11, 1, 30, '1 viên/sáng'),
  (@don11, 2, 30, '1 viên/tối');

-- === ĐƠN 12: Võ Đình Phúc - Loét DD (20/06) - ĐÃ CẤP PHÁT ===
INSERT INTO don_thuoc (dot_dieu_tri_id, bac_si_ke, ngay_ke, chan_doan, trang_thai)
  VALUES (@dot_nt12, 'BS. Trần Văn Nam', '2026-06-20 09:30:00', 'Loét dạ dày tái khám', 'da_cap_phat');
SET @don12 = LAST_INSERT_ID();
INSERT INTO chi_tiet_don_thuoc (don_thuoc_id, thuoc_id, so_luong, lieu_dung) VALUES
  (@don12, 18, 30, '1 viên/sáng'),
  (@don12, 20, 30, '1 viên x 3 lần/ngày');

-- === ĐƠN 13: Ngô Văn Tài - ĐTĐ tái khám (20/06) - MỚI (chờ cấp phát) ===
INSERT INTO don_thuoc (dot_dieu_tri_id, bac_si_ke, ngay_ke, chan_doan, trang_thai)
  VALUES (@dot_nt13, 'BS. Trần Văn Nam', '2026-06-20 10:30:00', 'ĐTĐ typ 2 tái khám', 'moi');
SET @don13 = LAST_INSERT_ID();
INSERT INTO chi_tiet_don_thuoc (don_thuoc_id, thuoc_id, so_luong, lieu_dung) VALUES
  (@don13, 7, 60, '1 viên x 2 lần/ngày sau ăn'),
  (@don13, 8, 30, '1 viên/sáng');

-- === ĐƠN 14: Hoàng Thị Kim Liên - Gout tái khám (21/06) - MỚI ===
INSERT INTO don_thuoc (dot_dieu_tri_id, bac_si_ke, ngay_ke, chan_doan, trang_thai)
  VALUES (@dot_nt14, 'BS. Trần Văn Nam', '2026-06-21 09:00:00', 'Gout - tái khám', 'moi');
SET @don14 = LAST_INSERT_ID();
INSERT INTO chi_tiet_don_thuoc (don_thuoc_id, thuoc_id, so_luong, lieu_dung) VALUES
  (@don14, 16, 14, '1 viên x 2 lần/ngày x 7 ngày'),
  (@don14, 15, 10, '1 viên khi đau');

-- === ĐƠN 15: Trần Thị Ngọc Ánh - ĐTĐ+mắt (21/06) - MỚI ===
INSERT INTO don_thuoc (dot_dieu_tri_id, bac_si_ke, ngay_ke, chan_doan, trang_thai)
  VALUES (@dot_nt15, 'BS. Trần Văn Nam', '2026-06-21 09:30:00', 'ĐTĐ typ 2 + biến chứng mắt', 'moi');
SET @don15 = LAST_INSERT_ID();
INSERT INTO chi_tiet_don_thuoc (don_thuoc_id, thuoc_id, so_luong, lieu_dung) VALUES
  (@don15, 7, 60, '1 viên x 2 lần/ngày sau ăn'),
  (@don15, 8, 30, '1 viên/sáng'),
  (@don15, 4, 30, '1 viên/tối');

-- === ĐƠN 16: Lê Quốc Trung - Hen PQ (22/06 hôm nay) - MỚI ===
INSERT INTO don_thuoc (dot_dieu_tri_id, bac_si_ke, ngay_ke, chan_doan, trang_thai)
  VALUES (@dot_nt16, 'BS. Trần Văn Nam', '2026-06-22 08:30:00', 'Hen phế quản tái khám', 'moi');
SET @don16 = LAST_INSERT_ID();
INSERT INTO chi_tiet_don_thuoc (don_thuoc_id, thuoc_id, so_luong, lieu_dung) VALUES
  (@don16, 21, 90, '1 viên x 3 lần/ngày'),
  (@don16, 23, 30, '1 viên/tối');

-- === ĐƠN 17: Dương Thị Hồng - THA (22/06 hôm nay) - MỚI ===
INSERT INTO don_thuoc (dot_dieu_tri_id, bac_si_ke, ngay_ke, chan_doan, trang_thai)
  VALUES (@dot_nt17, 'BS. Trần Văn Nam', '2026-06-22 10:00:00', 'Tăng huyết áp khám mới', 'moi');
SET @don17 = LAST_INSERT_ID();
INSERT INTO chi_tiet_don_thuoc (don_thuoc_id, thuoc_id, so_luong, lieu_dung) VALUES
  (@don17, 1, 30, '1 viên/sáng'),
  (@don17, 2, 30, '1 viên/tối'),
  (@don17, 4, 30, '1 viên/tối sau ăn');

-- =====================================================
-- Y LỆNH NỘI TRÚ (rải theo nhiều ngày)
-- =====================================================
-- Lấy ID đợt điều trị nội trú
SET @dot_it01 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @p11 AND loai_hinh = 'noi_tru' AND ngay_vao = '2026-06-13 14:00:00');
SET @dot_it02 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @p12 AND loai_hinh = 'noi_tru' AND ngay_vao = '2026-06-14 09:30:00');
SET @dot_it03 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @p13 AND loai_hinh = 'noi_tru' AND ngay_vao = '2026-06-15 16:00:00');
SET @dot_it04 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @p14 AND loai_hinh = 'noi_tru' AND ngay_vao = '2026-06-16 10:30:00');
SET @dot_it05 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @p15 AND loai_hinh = 'noi_tru' AND ngay_vao = '2026-06-17 08:00:00');
SET @dot_it06 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @p16 AND loai_hinh = 'noi_tru' AND ngay_vao = '2026-06-18 15:00:00');
SET @dot_it07 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @p17 AND loai_hinh = 'noi_tru' AND ngay_vao = '2026-06-19 11:00:00');
SET @dot_it08 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @p18 AND loai_hinh = 'noi_tru' AND ngay_vao = '2026-06-20 06:30:00');
SET @dot_it09 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @p19 AND loai_hinh = 'noi_tru' AND ngay_vao = '2026-06-21 14:30:00');
SET @dot_it10 = (SELECT id FROM dot_dieu_tri WHERE benh_nhan_id = @p20 AND loai_hinh = 'noi_tru' AND ngay_vao = '2026-06-22 07:00:00');

-- --- Y lệnh đã lĩnh (các ngày trước) ---
INSERT INTO y_lenh (dot_dieu_tri_id, thuoc_id, so_luong, lieu_dung, ngay_y_lenh, buoi, bac_si_chi_dinh, trang_thai) VALUES
-- BN Trịnh Văn Long (@dot_it01) - Viêm phổi - Khoa Nội (13-17/06)
(@dot_it01, 12, 2, 'Ceftriaxon 1g x 2 lọ TM/ngày',            '2026-06-13', 'sang',  'BS. Trần Văn Nam', 'da_linh'),
(@dot_it01, 15, 2, 'Paracetamol 500mg x 2 viên khi sốt',      '2026-06-13', 'sang',  'BS. Trần Văn Nam', 'da_linh'),
(@dot_it01, 24, 2, 'NaCl 0.9% 500ml x 2 chai truyền',         '2026-06-13', 'sang',  'BS. Trần Văn Nam', 'da_linh'),
(@dot_it01, 12, 2, 'Ceftriaxon 1g x 2 lọ TM/ngày',            '2026-06-14', 'sang',  'BS. Trần Văn Nam', 'da_linh'),
(@dot_it01, 15, 2, 'Paracetamol 500mg khi sốt',               '2026-06-14', 'chieu', 'BS. Trần Văn Nam', 'da_linh'),
(@dot_it01, 12, 2, 'Ceftriaxon 1g x 2 lọ TM/ngày',            '2026-06-15', 'sang',  'BS. Trần Văn Nam', 'da_linh'),
(@dot_it01, 24, 1, 'NaCl 0.9% 500ml truyền TM',               '2026-06-15', 'sang',  'BS. Trần Văn Nam', 'da_linh'),
(@dot_it01, 12, 2, 'Ceftriaxon 1g x 2 lọ TM/ngày',            '2026-06-16', 'sang',  'BS. Trần Văn Nam', 'da_linh'),
(@dot_it01, 12, 2, 'Ceftriaxon 1g x 2 lọ TM/ngày',            '2026-06-17', 'sang',  'BS. Trần Văn Nam', 'da_linh'),

-- BN Mai Thị Hương (@dot_it02) - Suy tim - Khoa Nội (14-18/06)
(@dot_it02, 6,  2, 'Furosemid 40mg x 2 viên sáng',            '2026-06-14', 'sang',  'BS. Trần Văn Nam', 'da_linh'),
(@dot_it02, 3,  1, 'Bisoprolol 5mg x 1 viên sáng',            '2026-06-14', 'sang',  'BS. Trần Văn Nam', 'da_linh'),
(@dot_it02, 2,  1, 'Losartan 50mg x 1 viên tối',              '2026-06-14', 'toi',   'BS. Trần Văn Nam', 'da_linh'),
(@dot_it02, 6,  2, 'Furosemid 40mg x 2 viên sáng',            '2026-06-15', 'sang',  'BS. Trần Văn Nam', 'da_linh'),
(@dot_it02, 3,  1, 'Bisoprolol 5mg x 1 viên sáng',            '2026-06-15', 'sang',  'BS. Trần Văn Nam', 'da_linh'),
(@dot_it02, 6,  2, 'Furosemid 40mg x 2 viên sáng',            '2026-06-16', 'sang',  'BS. Trần Văn Nam', 'da_linh'),
(@dot_it02, 3,  1, 'Bisoprolol 5mg x 1 viên sáng',            '2026-06-16', 'sang',  'BS. Trần Văn Nam', 'da_linh'),
(@dot_it02, 6,  2, 'Furosemid 40mg x 2 viên sáng',            '2026-06-17', 'sang',  'BS. Trần Văn Nam', 'da_linh'),
(@dot_it02, 6,  2, 'Furosemid 40mg x 2 viên sáng',            '2026-06-18', 'sang',  'BS. Trần Văn Nam', 'da_linh'),

-- BN Phan Quốc Việt (@dot_it03) - Loét DD XHTH - Khoa Ngoại (15-19/06)
(@dot_it03, 19, 2, 'Esomeprazol 40mg TM x 2 lọ/ngày',         '2026-06-15', 'sang',  'BS. Trần Văn Nam', 'da_linh'),
(@dot_it03, 24, 2, 'NaCl 0.9% 500ml x 2 chai',                '2026-06-15', 'sang',  'BS. Trần Văn Nam', 'da_linh'),
(@dot_it03, 26, 1, 'Ringer Lactat 500ml x 1 chai',             '2026-06-15', 'sang',  'BS. Trần Văn Nam', 'da_linh'),
(@dot_it03, 19, 2, 'Esomeprazol 40mg TM x 2 lọ/ngày',         '2026-06-16', 'sang',  'BS. Trần Văn Nam', 'da_linh'),
(@dot_it03, 24, 2, 'NaCl 0.9% 500ml x 2 chai',                '2026-06-16', 'sang',  'BS. Trần Văn Nam', 'da_linh'),
(@dot_it03, 19, 2, 'Esomeprazol 40mg TM x 2 lọ/ngày',         '2026-06-17', 'sang',  'BS. Trần Văn Nam', 'da_linh'),
(@dot_it03, 19, 2, 'Esomeprazol 40mg TM x 2 lọ/ngày',         '2026-06-18', 'sang',  'BS. Trần Văn Nam', 'da_linh'),
(@dot_it03, 18, 1, 'Omeprazol 20mg x 1 viên (chuyển uống)',    '2026-06-19', 'sang',  'BS. Trần Văn Nam', 'da_linh');

-- --- Y lệnh đang chờ lĩnh (các ngày gần đây + hôm nay) ---
INSERT INTO y_lenh (dot_dieu_tri_id, thuoc_id, so_luong, lieu_dung, ngay_y_lenh, buoi, bac_si_chi_dinh, trang_thai) VALUES
-- BN Lý Thị Bích Ngọc (@dot_it04) - Bệnh thận mạn - Khoa Nội
(@dot_it04, 24, 3, 'NaCl 0.9% 500ml x 3 chai truyền',         CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),
(@dot_it04, 25, 1, 'Glucose 5% 500ml x 1 chai',               CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),
(@dot_it04, 1,  1, 'Amlodipine 5mg x 1 viên sáng',            CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),
(@dot_it04, 6,  2, 'Furosemid 40mg x 2 viên sáng',            CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),

-- BN Tô Văn Đức (@dot_it05) - Loét tá tràng thủng - Khoa Ngoại
(@dot_it05, 19, 2, 'Esomeprazol 40mg TM x 2 lọ/ngày',         CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),
(@dot_it05, 12, 2, 'Ceftriaxon 1g x 2 lọ TM/ngày',            CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),
(@dot_it05, 24, 2, 'NaCl 0.9% 500ml x 2 chai truyền',         CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),
(@dot_it05, 26, 1, 'Ringer Lactat 500ml x 1 chai',             CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),
(@dot_it05, 17, 1, 'Tramadol 50mg khi đau nhiều',              CURDATE(), 'chieu', 'BS. Trần Văn Nam', 'chua_linh'),

-- BN Châu Thị Mỹ Dung (@dot_it06) - COPD nặng - Khoa Nội
(@dot_it06, 21, 3, 'Salbutamol 2mg x 3 viên/ngày',            CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),
(@dot_it06, 22, 2, 'Salbutamol KD 5mg/2.5ml x 2 ống',         CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),
(@dot_it06, 29, 2, 'Methylprednisolon 16mg x 2 viên sáng',    CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),
(@dot_it06, 13, 1, 'Levofloxacin 500mg x 1 viên/ngày',        CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),
(@dot_it06, 24, 2, 'NaCl 0.9% 500ml x 2 chai truyền TM',     CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),
(@dot_it06, 18, 1, 'Omeprazol 20mg x 1 viên sáng',            CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),

-- BN Huỳnh Tấn Phát (@dot_it07) - Nhồi máu não - Khoa Nội
(@dot_it07, 5,  1, 'Clopidogrel 75mg x 1 viên/ngày',          CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),
(@dot_it07, 4,  1, 'Atorvastatin 20mg x 1 viên tối',          CURDATE(), 'toi',   'BS. Trần Văn Nam', 'chua_linh'),
(@dot_it07, 1,  1, 'Amlodipine 5mg x 1 viên sáng',            CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),
(@dot_it07, 24, 2, 'NaCl 0.9% 500ml x 2 chai truyền',         CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),
(@dot_it07, 15, 2, 'Paracetamol 500mg khi sốt',               CURDATE(), 'chieu', 'BS. Trần Văn Nam', 'chua_linh'),

-- BN Vũ Thị Lan Anh (@dot_it08) - XH tiêu hóa tái phát - Khoa Ngoại
(@dot_it08, 19, 2, 'Esomeprazol 40mg TM x 2 lọ/ngày',         CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),
(@dot_it08, 19, 2, 'Esomeprazol 40mg TM x 2 lọ/ngày',         CURDATE(), 'chieu', 'BS. Trần Văn Nam', 'chua_linh'),
(@dot_it08, 24, 2, 'NaCl 0.9% 500ml x 2 chai truyền',         CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),
(@dot_it08, 26, 1, 'Ringer Lactat 500ml x 1 chai',             CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),
(@dot_it08, 12, 1, 'Ceftriaxon 1g x 1 lọ TM (dự phòng)',      CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),

-- BN Đinh Công Sơn (@dot_it09) - ĐTĐ biến chứng thận - Khoa Nội
(@dot_it09, 24, 2, 'NaCl 0.9% 500ml x 2 chai truyền',         CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),
(@dot_it09, 25, 2, 'Glucose 5% 500ml x 2 chai truyền',        CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),
(@dot_it09, 9,  1, 'Insulin Mixtard 30 tiêm dưới da',          CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),
(@dot_it09, 1,  1, 'Amlodipine 5mg x 1 viên sáng',            CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),
(@dot_it09, 6,  1, 'Furosemid 40mg x 1 viên sáng',            CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),

-- BN Lương Thị Thu Thủy (@dot_it10) - Viêm phổi nặng cấp cứu - Khoa Cấp cứu (hôm nay)
(@dot_it10, 12, 2, 'Ceftriaxon 1g x 2 lọ TM/ngày',            CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),
(@dot_it10, 13, 1, 'Levofloxacin 500mg x 1 viên/ngày',        CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),
(@dot_it10, 24, 3, 'NaCl 0.9% 500ml x 3 chai truyền',         CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),
(@dot_it10, 15, 3, 'Paracetamol 500mg x 3 viên khi sốt',      CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),
(@dot_it10, 30, 1, 'Dexamethason 4mg TM x 1 ống',             CURDATE(), 'sang',  'BS. Trần Văn Nam', 'chua_linh'),
(@dot_it10, 22, 2, 'Salbutamol KD 5mg/2.5ml x 2 ống',         CURDATE(), 'chieu', 'BS. Trần Văn Nam', 'chua_linh');

-- =====================================================
-- PHIẾU NHẬP KHO (3 phiếu trong 10 ngày)
-- =====================================================
-- Phiếu nhập 1: 14/06 - Nhập từ DHG Pharma vào Kho Tổng
INSERT INTO phieu_nhap_kho (so_hoa_don, nha_cung_cap_id, kho_id, nguoi_lap_id, ngay_lap, tong_tien, ghi_chu)
  VALUES ('SEED10D-HD001', 1, 1, 1, '2026-06-14 10:00:00', 0, 'Nhập thuốc tim mạch + giảm đau');
SET @pn1 = LAST_INSERT_ID();
INSERT INTO chi_tiet_nhap_kho (phieu_nhap_id, thuoc_id, so_lo, han_dung, so_luong, don_gia, thue_vat) VALUES
  (@pn1, 1,  'AML2026B01', '2028-06-30', 3000, 320.00, 5),
  (@pn1, 2,  'LOS2026B02', '2028-09-15', 2000, 540.00, 5),
  (@pn1, 4,  'ATO2026B01', '2028-12-31', 2500, 920.00, 5),
  (@pn1, 15, 'PAR2026B01', '2028-08-31', 10000, 160.00, 5),
  (@pn1, 16, 'IBU2026B01', '2028-07-31', 3000, 320.00, 5);

-- Phiếu nhập 2: 17/06 - Nhập từ Imexpharm vào Kho Tổng
INSERT INTO phieu_nhap_kho (so_hoa_don, nha_cung_cap_id, kho_id, nguoi_lap_id, ngay_lap, tong_tien, ghi_chu)
  VALUES ('SEED10D-HD002', 2, 1, 1, '2026-06-17 14:00:00', 0, 'Nhập kháng sinh + dịch truyền');
SET @pn2 = LAST_INSERT_ID();
INSERT INTO chi_tiet_nhap_kho (phieu_nhap_id, thuoc_id, so_lo, han_dung, so_luong, don_gia, thue_vat) VALUES
  (@pn2, 10, 'AMO2026C01', '2028-05-30', 5000, 420.00, 5),
  (@pn2, 11, 'CEF2026C01', '2028-10-31', 2000, 3000.00, 5),
  (@pn2, 12, 'CTR2026C01', '2028-11-30', 800, 14500.00, 5),
  (@pn2, 24, 'NAC2026C01', '2028-12-31', 500, 8000.00, 5),
  (@pn2, 25, 'GLU2026C01', '2028-12-31', 400, 8700.00, 5);

-- Phiếu nhập 3: 20/06 - Nhập từ Zuellig Pharma vào Kho Tổng
INSERT INTO phieu_nhap_kho (so_hoa_don, nha_cung_cap_id, kho_id, nguoi_lap_id, ngay_lap, tong_tien, ghi_chu)
  VALUES ('SEED10D-HD003', 4, 1, 1, '2026-06-20 09:00:00', 0, 'Nhập nội tiết + hô hấp + corticoid');
SET @pn3 = LAST_INSERT_ID();
INSERT INTO chi_tiet_nhap_kho (phieu_nhap_id, thuoc_id, so_lo, han_dung, so_luong, don_gia, thue_vat) VALUES
  (@pn3, 7,  'MET2026D01', '2028-11-30', 5000, 290.00, 5),
  (@pn3, 8,  'GLI2026D01', '2028-08-28', 1000, 1400.00, 5),
  (@pn3, 21, 'SAL2026D01', '2028-10-15', 2000, 200.00, 5),
  (@pn3, 29, 'MEP2026D01', '2028-09-20', 500, 2050.00, 5),
  (@pn3, 19, 'ESO2026D01', '2028-07-15', 300, 30000.00, 5);

-- =====================================================
-- BIẾN ĐỘNG KHO (nhập kho - log)
-- =====================================================
INSERT INTO bien_dong_kho (kho_id, thuoc_id, loai_bien_dong, so_luong, so_luong_truoc, so_luong_sau, phieu_lien_quan, nguoi_thuc_hien_id, ngay_bien_dong) VALUES
-- Nhập 14/06
(1, 1,  'nhap', 3000,  5000,  8000,  'SEED10D-HD001', 1, '2026-06-14 10:00:00'),
(1, 2,  'nhap', 2000,  3000,  5000,  'SEED10D-HD001', 1, '2026-06-14 10:00:00'),
(1, 4,  'nhap', 2500,  4000,  6500,  'SEED10D-HD001', 1, '2026-06-14 10:00:00'),
(1, 15, 'nhap', 10000, 20000, 30000, 'SEED10D-HD001', 1, '2026-06-14 10:00:00'),
(1, 16, 'nhap', 3000,  5000,  8000,  'SEED10D-HD001', 1, '2026-06-14 10:00:00'),
-- Nhập 17/06
(1, 10, 'nhap', 5000,  10000, 15000, 'SEED10D-HD002', 1, '2026-06-17 14:00:00'),
(1, 11, 'nhap', 2000,  3000,  5000,  'SEED10D-HD002', 1, '2026-06-17 14:00:00'),
(1, 12, 'nhap', 800,   1000,  1800,  'SEED10D-HD002', 1, '2026-06-17 14:00:00'),
(1, 24, 'nhap', 500,   1000,  1500,  'SEED10D-HD002', 1, '2026-06-17 14:00:00'),
(1, 25, 'nhap', 400,   800,   1200,  'SEED10D-HD002', 1, '2026-06-17 14:00:00'),
-- Nhập 20/06
(1, 7,  'nhap', 5000,  8000,  13000, 'SEED10D-HD003', 1, '2026-06-20 09:00:00'),
(1, 8,  'nhap', 1000,  2000,  3000,  'SEED10D-HD003', 1, '2026-06-20 09:00:00'),
(1, 21, 'nhap', 2000,  3000,  5000,  'SEED10D-HD003', 1, '2026-06-20 09:00:00'),
(1, 29, 'nhap', 500,   1000,  1500,  'SEED10D-HD003', 1, '2026-06-20 09:00:00'),
(1, 19, 'nhap', 300,   200,   500,   'SEED10D-HD003', 1, '2026-06-20 09:00:00'),

-- Xuất cấp phát ngoại trú (ví dụ một số ngày)
(2, 1,  'xuat_cap_phat', 30, 500, 470, 'SEED10D-CP-13', 2, '2026-06-13 10:00:00'),
(2, 2,  'xuat_cap_phat', 30, 300, 270, 'SEED10D-CP-13', 2, '2026-06-13 10:00:00'),
(2, 7,  'xuat_cap_phat', 60, 1000, 940,'SEED10D-CP-13', 2, '2026-06-13 10:30:00'),
(2, 18, 'xuat_cap_phat', 30, 800, 770, 'SEED10D-CP-15', 2, '2026-06-15 09:30:00'),
(2, 16, 'xuat_cap_phat', 21, 500, 479, 'SEED10D-CP-15', 2, '2026-06-15 10:30:00'),

-- Xuất cấp phát nội trú
(3, 12, 'xuat_cap_phat', 4, 500, 496, 'SEED10D-CP-NT-13', 3, '2026-06-13 15:00:00'),
(3, 24, 'xuat_cap_phat', 2, 500, 498, 'SEED10D-CP-NT-13', 3, '2026-06-13 15:00:00'),
(3, 6,  'xuat_cap_phat', 2, 500, 498, 'SEED10D-CP-NT-14', 3, '2026-06-14 10:00:00'),
(3, 19, 'xuat_cap_phat', 2, 500, 498, 'SEED10D-CP-NT-15', 3, '2026-06-15 17:00:00');

-- =====================================================
-- PHIẾU ĐIỀU CHUYỂN (Kho Tổng -> Kho Lẻ, 2 phiếu)
-- =====================================================
-- Điều chuyển 16/06: Kho Tổng -> Kho Lẻ Ngoại trú
INSERT INTO phieu_dieu_chuyen (loai_phieu, kho_xuat_id, kho_nhan_id, nguoi_lap_id, nguoi_duyet_id, ngay_lap, ngay_duyet, trang_thai, ghi_chu)
  VALUES ('DIEU_CHUYEN', 1, 2, 1, 1, '2026-06-16 08:00:00', '2026-06-16 09:00:00', 'hoan_thanh', 'Bổ sung kho lẻ ngoại trú - SEED10D');
SET @pdc1 = LAST_INSERT_ID();
INSERT INTO chi_tiet_dieu_chuyen (phieu_id, thuoc_id, so_lo, han_dung, so_luong_yeu_cau, so_luong_thuc_xuat) VALUES
  (@pdc1, 1,  'AML2026B01', '2028-06-30', 500, 500),
  (@pdc1, 7,  'MET2024G01', '2027-05-31', 500, 500),
  (@pdc1, 18, 'OME2024R01', '2027-06-15', 300, 300),
  (@pdc1, 15, 'PAR2026B01', '2028-08-31', 1000, 1000);

-- Điều chuyển 19/06: Kho Tổng -> Kho Lẻ Nội trú
INSERT INTO phieu_dieu_chuyen (loai_phieu, kho_xuat_id, kho_nhan_id, nguoi_lap_id, nguoi_duyet_id, ngay_lap, ngay_duyet, trang_thai, ghi_chu)
  VALUES ('DIEU_CHUYEN', 1, 3, 1, 1, '2026-06-19 08:00:00', '2026-06-19 09:00:00', 'hoan_thanh', 'Bổ sung kho lẻ nội trú - SEED10D');
SET @pdc2 = LAST_INSERT_ID();
INSERT INTO chi_tiet_dieu_chuyen (phieu_id, thuoc_id, so_lo, han_dung, so_luong_yeu_cau, so_luong_thuc_xuat) VALUES
  (@pdc2, 12, 'CTR2026C01', '2028-11-30', 200, 200),
  (@pdc2, 19, 'ESO2026D01', '2028-07-15', 100, 100),
  (@pdc2, 24, 'NAC2026C01', '2028-12-31', 200, 200),
  (@pdc2, 25, 'GLU2026C01', '2028-12-31', 100, 100);

-- Biến động kho điều chuyển
INSERT INTO bien_dong_kho (kho_id, thuoc_id, loai_bien_dong, so_luong, so_luong_truoc, so_luong_sau, phieu_lien_quan, nguoi_thuc_hien_id, ngay_bien_dong) VALUES
(1, 1,  'xuat_dieu_chuyen', 500,  8000, 7500,  'SEED10D-DC-16', 1, '2026-06-16 09:00:00'),
(2, 1,  'nhap_dieu_chuyen', 500,  470,  970,   'SEED10D-DC-16', 1, '2026-06-16 09:00:00'),
(1, 12, 'xuat_dieu_chuyen', 200,  1800, 1600,  'SEED10D-DC-19', 1, '2026-06-19 09:00:00'),
(3, 12, 'nhap_dieu_chuyen', 200,  496,  696,   'SEED10D-DC-19', 1, '2026-06-19 09:00:00');

-- =====================================================
-- CHI PHÍ BHYT (cho các đợt đã cấp phát)
-- =====================================================
INSERT INTO chi_phi_bhyt (dot_dieu_tri_id, thuoc_id, so_luong, don_gia, ty_le_tt, muc_huong, tien_bhyt, tien_bn_cung_tra, tien_bn_tu_tuc, nguon, ngay_ghi_nhan) VALUES
-- BN Nguyễn Văn Hải - THA (13/06) - mức hưởng 80%
(@dot_nt01, 1, 30, 350.00, 100, 80, 8400.00, 2100.00, 0, 'ngoai_tru', '2026-06-13 10:00:00'),
(@dot_nt01, 2, 30, 580.00, 100, 80, 13920.00, 3480.00, 0, 'ngoai_tru', '2026-06-13 10:00:00'),
(@dot_nt01, 4, 30, 980.00, 100, 80, 23520.00, 5880.00, 0, 'ngoai_tru', '2026-06-13 10:00:00'),

-- BN Trần Thị Ngọc Ánh - ĐTĐ (13/06) - mức hưởng 100%
(@dot_nt02, 7, 60, 320.00, 100, 100, 19200.00, 0, 0, 'ngoai_tru', '2026-06-13 10:30:00'),
(@dot_nt02, 8, 30, 1500.00, 100, 100, 45000.00, 0, 0, 'ngoai_tru', '2026-06-13 10:30:00'),

-- BN Phạm Thị Thu Hà - Suy tim (14/06) - mức hưởng 100%
(@dot_nt04, 3, 30, 420.00, 100, 100, 12600.00, 0, 0, 'ngoai_tru', '2026-06-14 11:30:00'),
(@dot_nt04, 6, 30, 250.00, 100, 100, 7500.00, 0, 0, 'ngoai_tru', '2026-06-14 11:30:00'),
(@dot_nt04, 2, 30, 580.00, 100, 100, 17400.00, 0, 0, 'ngoai_tru', '2026-06-14 11:30:00'),
(@dot_nt04, 5, 30, 1200.00, 100, 100, 36000.00, 0, 0, 'ngoai_tru', '2026-06-14 11:30:00'),

-- Nội trú - BN Trịnh Văn Long - Viêm phổi (13-18/06) - mức hưởng 80%
(@dot_it01, 12, 10, 15500.00, 100, 80, 124000.00, 31000.00, 0, 'noi_tru', '2026-06-18 10:00:00'),
(@dot_it01, 15, 4,  180.00, 100, 80, 576.00, 144.00, 0, 'noi_tru', '2026-06-18 10:00:00'),
(@dot_it01, 24, 3,  8500.00, 100, 80, 20400.00, 5100.00, 0, 'noi_tru', '2026-06-18 10:00:00'),

-- Nội trú - BN Mai Thị Hương - Suy tim (14-19/06) - mức hưởng 100%
(@dot_it02, 6, 10, 250.00, 100, 100, 2500.00, 0, 0, 'noi_tru', '2026-06-19 14:00:00'),
(@dot_it02, 3, 5,  420.00, 100, 100, 2100.00, 0, 0, 'noi_tru', '2026-06-19 14:00:00');

-- =====================================================
-- VERIFY
-- =====================================================
SELECT '=== TỔNG HỢP DỮ LIỆU SEED 10 NGÀY ===' AS '';

SELECT 'Bệnh nhân mới (BN100xx)' AS category, COUNT(*) AS total
  FROM benh_nhan WHERE ma_benh_nhan LIKE 'BN100__'
UNION ALL
SELECT 'Đợt điều trị ngoại trú', COUNT(*)
  FROM dot_dieu_tri d JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
  WHERE bn.ma_benh_nhan LIKE 'BN100__' AND d.loai_hinh = 'ngoai_tru'
UNION ALL
SELECT 'Đợt điều trị nội trú', COUNT(*)
  FROM dot_dieu_tri d JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
  WHERE bn.ma_benh_nhan LIKE 'BN100__' AND d.loai_hinh = 'noi_tru'
UNION ALL
SELECT 'Đơn thuốc ngoại trú (MỚI - chờ cấp phát)', COUNT(*)
  FROM don_thuoc dt JOIN dot_dieu_tri d ON dt.dot_dieu_tri_id = d.id
  JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
  WHERE bn.ma_benh_nhan LIKE 'BN100__' AND dt.trang_thai = 'moi'
UNION ALL
SELECT 'Đơn thuốc ngoại trú (ĐÃ cấp phát)', COUNT(*)
  FROM don_thuoc dt JOIN dot_dieu_tri d ON dt.dot_dieu_tri_id = d.id
  JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
  WHERE bn.ma_benh_nhan LIKE 'BN100__' AND dt.trang_thai = 'da_cap_phat'
UNION ALL
SELECT 'Y lệnh nội trú (chưa lĩnh)', COUNT(*)
  FROM y_lenh yl JOIN dot_dieu_tri d ON yl.dot_dieu_tri_id = d.id
  JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
  WHERE bn.ma_benh_nhan LIKE 'BN100__' AND yl.trang_thai = 'chua_linh'
UNION ALL
SELECT 'Y lệnh nội trú (đã lĩnh)', COUNT(*)
  FROM y_lenh yl JOIN dot_dieu_tri d ON yl.dot_dieu_tri_id = d.id
  JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
  WHERE bn.ma_benh_nhan LIKE 'BN100__' AND yl.trang_thai = 'da_linh'
UNION ALL
SELECT 'Phiếu nhập kho', COUNT(*)
  FROM phieu_nhap_kho WHERE so_hoa_don LIKE 'SEED10D-%'
UNION ALL
SELECT 'Phiếu điều chuyển', COUNT(*)
  FROM phieu_dieu_chuyen WHERE ghi_chu LIKE '%SEED10D%'
UNION ALL
SELECT 'Biến động kho', COUNT(*)
  FROM bien_dong_kho WHERE phieu_lien_quan LIKE 'SEED10D-%'
UNION ALL
SELECT 'Chi phí BHYT', COUNT(*)
  FROM chi_phi_bhyt cp
  JOIN dot_dieu_tri d ON cp.dot_dieu_tri_id = d.id
  JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
  WHERE bn.ma_benh_nhan LIKE 'BN100__';
