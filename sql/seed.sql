-- =====================================================
-- DỮ LIỆU MẪU - HỆ THỐNG QUẢN LÝ THUỐC BỆNH VIỆN
-- =====================================================
USE hospital_medicine;

-- =====================================================
-- NGƯỜI DÙNG (mật khẩu: 123456 - bcrypt hash)
-- =====================================================
INSERT INTO nguoi_dung (ten_dang_nhap, mat_khau, ho_ten, vai_tro) VALUES
('ds.tong', '$2a$10$pKsJPDgFJdhBDRAsifZpTuu6vbPwnt45kEnm1PdOccyJJxZzg16.6', 'DS. Nguyễn Văn An', 'duoc_si_tong'),
('ds.khole', '$2a$10$pKsJPDgFJdhBDRAsifZpTuu6vbPwnt45kEnm1PdOccyJJxZzg16.6', 'DS. Trần Thị Bình', 'duoc_si_kho_le'),
('dd.noi', '$2a$10$pKsJPDgFJdhBDRAsifZpTuu6vbPwnt45kEnm1PdOccyJJxZzg16.6', 'ĐD. Lê Thị Cúc', 'dieu_duong'),
('kt.vien', '$2a$10$pKsJPDgFJdhBDRAsifZpTuu6vbPwnt45kEnm1PdOccyJJxZzg16.6', 'KT. Phạm Văn Dũng', 'ke_toan');

-- =====================================================
-- KHO
-- =====================================================
INSERT INTO kho (ten_kho, loai_kho, khoa) VALUES
('Kho Tổng Dược', 'kho_tong', NULL),
('Kho Lẻ Ngoại Trú', 'kho_le_ngoai_tru', NULL),
('Kho Lẻ Nội Trú', 'kho_le_noi_tru', NULL),
('Tủ Trực Khoa Nội', 'tu_truc', 'Khoa Nội'),
('Tủ Trực Khoa Ngoại', 'tu_truc', 'Khoa Ngoại'),
('Tủ Trực Khoa Sản', 'tu_truc', 'Khoa Sản'),
('Tủ Trực Khoa Cấp cứu', 'tu_truc', 'Khoa Cấp cứu');

-- =====================================================
-- NHÀ CUNG CẤP
-- =====================================================
INSERT INTO nha_cung_cap (ten_nha_cung_cap, dia_chi, ma_so_thue) VALUES
('Công ty CP Dược phẩm Hậu Giang (DHG Pharma)', '288 Bis Nguyễn Văn Cừ, P. An Hòa, Q. Ninh Kiều, TP. Cần Thơ', '1800156801'),
('Công ty CP Dược phẩm Imexpharm', '04 Đường 30/4, P.1, TX Sa Đéc, Đồng Tháp', '1400434026'),
('Công ty CP Pymepharco', '166-168 Nguyễn Huệ, TP Tuy Hòa, Phú Yên', '4400193066'),
('Công ty TNHH Zuellig Pharma Việt Nam', 'Lô CN2, KCN Đồng An, P. Bình Hòa, TP Thuận An, Bình Dương', '3700613694'),
('Công ty CP Dược phẩm Trung Ương 2 (Dopharma)', '9 Trần Thánh Tông, Q. Hai Bà Trưng, Hà Nội', '0100105928');

-- =====================================================
-- DANH MỤC ICD-10 (mẫu thực tế)
-- =====================================================
INSERT INTO danh_muc_icd10 (ma_benh, ten_benh, thuoc_phu_luc_2) VALUES
('A15', 'Lao hô hấp, có xác nhận về vi khuẩn học và mô học', 1),
('A16', 'Lao hô hấp, không xác nhận về vi khuẩn học hoặc mô học', 1),
('A30', 'Phong [Hansen]', 1),
('B18', 'Viêm gan virus mạn tính', 1),
('B20', 'HIV dẫn đến bệnh nhiễm khuẩn và ký sinh trùng', 1),
('C34', 'U ác tính phế quản và phổi', 1),
('C50', 'U ác tính vú', 1),
('C61', 'U ác tính tuyến tiền liệt', 1),
('C73', 'U ác tính tuyến giáp', 1),
('D56', 'Thalassemia', 1),
('D66', 'Thiếu yếu tố VIII di truyền (Hemophilia A)', 1),
('E03', 'Suy giáp khác', 1),
('E05', 'Nhiễm độc giáp [Cường giáp]', 1),
('E10', 'Đái tháo đường typ 1', 1),
('E11', 'Đái tháo đường typ 2', 1),
('E11.2', 'ĐTĐ typ 2 có biến chứng thận', 1),
('E11.3', 'ĐTĐ typ 2 có biến chứng mắt', 1),
('E11.5', 'ĐTĐ typ 2 có biến chứng mạch máu ngoại biên', 1),
('G20', 'Bệnh Parkinson', 1),
('G35', 'Xơ cứng rải rác (Multiple sclerosis)', 1),
('G40', 'Động kinh', 1),
('I10', 'Tăng huyết áp vô căn', 0),
('I11', 'Bệnh tim do tăng huyết áp', 0),
('I20', 'Đau thắt ngực', 0),
('I25', 'Bệnh tim thiếu máu cục bộ mạn', 1),
('I48', 'Rung và cuồng nhĩ', 0),
('I50', 'Suy tim', 1),
('I63', 'Nhồi máu não', 1),
('J18', 'Viêm phổi, không xác định tác nhân', 0),
('J44', 'Bệnh phổi tắc nghẽn mạn tính', 1),
('J45', 'Hen phế quản', 1),
('K25', 'Loét dạ dày', 0),
('K26', 'Loét tá tràng', 0),
('K29', 'Viêm dạ dày và viêm tá tràng', 0),
('K70', 'Bệnh gan do rượu', 0),
('K74', 'Xơ gan', 1),
('M05', 'Viêm khớp dạng thấp huyết thanh dương tính', 1),
('M06', 'Viêm khớp dạng thấp khác', 1),
('M10', 'Bệnh Gout', 0),
('M81', 'Loãng xương không có gãy xương bệnh lý', 0),
('N18', 'Bệnh thận mạn', 1),
('N18.5', 'Bệnh thận mạn giai đoạn 5', 1);

-- =====================================================
-- THUỐC (Danh mục thực tế theo BHYT)
-- =====================================================
INSERT INTO thuoc (ma_bhyt, ten_thuoc, hoat_chat, ham_luong, don_vi_tinh, duong_dung, don_gia_thau, ty_le_thanh_toan, nhom_thuoc, dinh_muc_toi_thieu) VALUES
-- Thuốc tim mạch
('101010100100101', 'Amlodipine 5mg', 'Amlodipine besylate', '5mg', 'Viên', 'Uống', 350.00, 100, 'Tim mạch', 200),
('101010100100201', 'Losartan 50mg', 'Losartan kali', '50mg', 'Viên', 'Uống', 580.00, 100, 'Tim mạch', 200),
('101010100100301', 'Bisoprolol 5mg', 'Bisoprolol fumarat', '5mg', 'Viên', 'Uống', 420.00, 100, 'Tim mạch', 150),
('101010100100401', 'Atorvastatin 20mg', 'Atorvastatin calcium', '20mg', 'Viên', 'Uống', 980.00, 100, 'Tim mạch', 200),
('101010100100501', 'Clopidogrel 75mg', 'Clopidogrel bisulfat', '75mg', 'Viên', 'Uống', 1200.00, 100, 'Tim mạch', 150),
('101010100100601', 'Furosemid 40mg', 'Furosemid', '40mg', 'Viên', 'Uống', 250.00, 100, 'Tim mạch', 100),
-- Thuốc nội tiết - ĐTĐ
('102020200200101', 'Metformin 850mg', 'Metformin hydrochloride', '850mg', 'Viên', 'Uống', 320.00, 100, 'Nội tiết', 300),
('102020200200201', 'Gliclazid MR 60mg', 'Gliclazid', '60mg', 'Viên', 'Uống', 1500.00, 100, 'Nội tiết', 150),
('102020200200301', 'Insulin Mixtard 30 100IU/ml', 'Insulin người', '100IU/ml 10ml', 'Lọ', 'Tiêm dưới da', 125000.00, 100, 'Nội tiết', 20),
-- Kháng sinh
('103030300300101', 'Amoxicillin 500mg', 'Amoxicillin trihydrat', '500mg', 'Viên', 'Uống', 450.00, 100, 'Kháng sinh', 500),
('103030300300201', 'Cefuroxim 500mg', 'Cefuroxim axetil', '500mg', 'Viên', 'Uống', 3200.00, 100, 'Kháng sinh', 200),
('103030300300301', 'Ceftriaxon 1g (TM)', 'Ceftriaxon natri', '1g', 'Lọ', 'Tiêm tĩnh mạch', 15500.00, 100, 'Kháng sinh', 100),
('103030300300401', 'Levofloxacin 500mg', 'Levofloxacin hemihydrat', '500mg', 'Viên', 'Uống', 2800.00, 100, 'Kháng sinh', 100),
('103030300300501', 'Azithromycin 500mg', 'Azithromycin dihydrat', '500mg', 'Viên', 'Uống', 4500.00, 100, 'Kháng sinh', 100),
-- Giảm đau - Hạ sốt
('104040400400101', 'Paracetamol 500mg', 'Paracetamol', '500mg', 'Viên', 'Uống', 180.00, 100, 'Giảm đau', 1000),
('104040400400201', 'Ibuprofen 400mg', 'Ibuprofen', '400mg', 'Viên', 'Uống', 350.00, 100, 'Giảm đau', 300),
('104040400400301', 'Tramadol 50mg', 'Tramadol hydrochloride', '50mg', 'Viên', 'Uống', 800.00, 50, 'Giảm đau', 50),
-- Thuốc tiêu hóa
('105050500500101', 'Omeprazol 20mg', 'Omeprazol', '20mg', 'Viên', 'Uống', 650.00, 100, 'Tiêu hóa', 300),
('105050500500201', 'Esomeprazol 40mg (TM)', 'Esomeprazol natri', '40mg', 'Lọ', 'Tiêm tĩnh mạch', 32000.00, 100, 'Tiêu hóa', 50),
('105050500500301', 'Domperidon 10mg', 'Domperidon', '10mg', 'Viên', 'Uống', 280.00, 100, 'Tiêu hóa', 200),
-- Thuốc hô hấp
('106060600600101', 'Salbutamol 2mg', 'Salbutamol sulfat', '2mg', 'Viên', 'Uống', 220.00, 100, 'Hô hấp', 200),
('106060600600201', 'Salbutamol khí dung 5mg/2.5ml', 'Salbutamol sulfat', '5mg/2.5ml', 'Ống', 'Hít', 3500.00, 100, 'Hô hấp', 100),
('106060600600301', 'Theophylline 100mg', 'Theophylline', '100mg', 'Viên', 'Uống', 350.00, 100, 'Hô hấp', 100),
-- Dịch truyền
('107070700700101', 'NaCl 0.9% 500ml', 'Natri chloride', '0.9% 500ml', 'Chai', 'Truyền tĩnh mạch', 8500.00, 100, 'Dịch truyền', 100),
('107070700700201', 'Glucose 5% 500ml', 'Glucose', '5% 500ml', 'Chai', 'Truyền tĩnh mạch', 9200.00, 100, 'Dịch truyền', 100),
('107070700700301', 'Ringer Lactat 500ml', 'Ringer Lactat', '500ml', 'Chai', 'Truyền tĩnh mạch', 9800.00, 100, 'Dịch truyền', 50),
-- Thần kinh
('108080800800101', 'Diazepam 5mg', 'Diazepam', '5mg', 'Viên', 'Uống', 180.00, 100, 'Thần kinh', 50),
('108080800800201', 'Gabapentin 300mg', 'Gabapentin', '300mg', 'Viên', 'Uống', 1800.00, 100, 'Thần kinh', 100),
-- Corticoid
('109090900900101', 'Methylprednisolon 16mg', 'Methylprednisolon', '16mg', 'Viên', 'Uống', 2200.00, 100, 'Corticoid', 100),
('109090900900201', 'Dexamethason 4mg (TM)', 'Dexamethason natri phosphat', '4mg/ml', 'Ống', 'Tiêm', 3500.00, 100, 'Corticoid', 50);

-- =====================================================
-- LÔ THUỐC tại KHO TỔNG (ID=1)
-- =====================================================
INSERT INTO lo_thuoc (thuoc_id, so_lo, han_dung, gia_nhap, thue_vat, kho_id, so_luong_ton) VALUES
(1, 'AML2024A01', '2026-12-31', 320.00, 5, 1, 5000),
(2, 'LOS2024B02', '2027-03-15', 540.00, 5, 1, 3000),
(3, 'BIS2024C01', '2026-09-30', 390.00, 5, 1, 2000),
(4, 'ATO2024D01', '2027-06-30', 920.00, 5, 1, 4000),
(5, 'CLO2024E01', '2027-01-31', 1100.00, 5, 1, 2000),
(6, 'FUR2024F01', '2026-08-31', 230.00, 5, 1, 3000),
(7, 'MET2024G01', '2027-05-31', 290.00, 5, 1, 8000),
(8, 'GLI2024H01', '2027-02-28', 1400.00, 5, 1, 2000),
(9, 'INS2024I01', '2026-10-31', 118000.00, 5, 1, 50),
(10, 'AMO2024J01', '2026-11-30', 420.00, 5, 1, 10000),
(11, 'CEF2024K01', '2027-04-30', 3000.00, 5, 1, 3000),
(12, 'CTR2024L01', '2027-07-31', 14500.00, 5, 1, 1000),
(13, 'LEV2024M01', '2027-01-15', 2600.00, 5, 1, 1500),
(14, 'AZI2024N01', '2026-12-15', 4200.00, 5, 1, 1000),
(15, 'PAR2024O01', '2027-08-31', 160.00, 5, 1, 20000),
(16, 'IBU2024P01', '2027-03-31', 320.00, 5, 1, 5000),
(17, 'TRA2024Q01', '2026-09-15', 750.00, 5, 1, 500),
(18, 'OME2024R01', '2027-06-15', 600.00, 5, 1, 6000),
(19, 'ESO2024S01', '2026-11-15', 30000.00, 5, 1, 200),
(20, 'DOM2024T01', '2027-04-15', 260.00, 5, 1, 4000),
(21, 'SAL2024U01', '2027-02-15', 200.00, 5, 1, 3000),
(22, 'SAK2024V01', '2026-10-15', 3300.00, 5, 1, 500),
(23, 'THE2024W01', '2027-01-20', 320.00, 5, 1, 2000),
(24, 'NAC2024X01', '2027-09-30', 8000.00, 5, 1, 1000),
(25, 'GLU2024Y01', '2027-08-15', 8700.00, 5, 1, 800),
(26, 'RIN2024Z01', '2027-07-20', 9200.00, 5, 1, 500),
(27, 'DIA2024AA1', '2026-12-20', 170.00, 5, 1, 300),
(28, 'GAB2024AB1', '2027-05-15', 1700.00, 5, 1, 1500),
(29, 'MEP2024AC1', '2027-03-20', 2050.00, 5, 1, 1000),
(30, 'DEX2024AD1', '2027-06-20', 3300.00, 5, 1, 500);

-- Lô thuốc tại Kho lẻ Ngoại trú (ID=2)
INSERT INTO lo_thuoc (thuoc_id, so_lo, han_dung, gia_nhap, thue_vat, kho_id, so_luong_ton) VALUES
(1, 'AML2024A01', '2026-12-31', 320.00, 5, 2, 500),
(2, 'LOS2024B02', '2027-03-15', 540.00, 5, 2, 300),
(4, 'ATO2024D01', '2027-06-30', 920.00, 5, 2, 400),
(7, 'MET2024G01', '2027-05-31', 290.00, 5, 2, 1000),
(10, 'AMO2024J01', '2026-11-30', 420.00, 5, 2, 1000),
(15, 'PAR2024O01', '2027-08-31', 160.00, 5, 2, 3000),
(18, 'OME2024R01', '2027-06-15', 600.00, 5, 2, 800);

-- =====================================================
-- BỆNH NHÂN
-- =====================================================
INSERT INTO benh_nhan (ma_benh_nhan, ho_ten, ngay_sinh, gioi_tinh, so_dinh_danh, so_the_bhyt, dia_chi) VALUES
('BN000001', 'Nguyễn Văn Hùng', '1965-03-15', 'Nam', '001065012345', 'DN4950100001', 'Số 12 Trần Phú, P. Hải Châu 1, Q. Hải Châu, TP Đà Nẵng'),
('BN000002', 'Trần Thị Mai', '1978-07-22', 'Nu', '001078067890', 'DN4950200002', 'Số 45 Lê Duẩn, P. Hòa Thuận, Q. Hải Châu, TP Đà Nẵng'),
('BN000003', 'Lê Hoàng Nam', '1990-11-05', 'Nam', '001090023456', 'DN4950300003', '198 Nguyễn Văn Linh, Q. Thanh Khê, TP Đà Nẵng'),
('BN000004', 'Phạm Thị Lan', '1952-01-20', 'Nu', '001052034567', 'DN4950400004', '23 Phan Châu Trinh, Q. Hải Châu, TP Đà Nẵng'),
('BN000005', 'Võ Minh Tuấn', '1985-09-10', 'Nam', '001085045678', 'DN4950500005', '67 Điện Biên Phủ, Q. Thanh Khê, TP Đà Nẵng'),
('BN000006', 'Hoàng Thị Hoa', '1970-04-08', 'Nu', '001070056789', 'DN4950600006', '112 Hoàng Diệu, Q. Hải Châu, TP Đà Nẵng'),
('BN000007', 'Đỗ Văn Thành', '1988-12-25', 'Nam', '001088067891', '', '234 Trưng Nữ Vương, Q. Hải Châu, TP Đà Nẵng'),
('BN000008', 'Bùi Thị Ngọc', '1945-06-15', 'Nu', '001045078912', 'DN4950800008', '89 Núi Thành, Q. Hải Châu, TP Đà Nẵng');

-- =====================================================
-- ĐỢT ĐIỀU TRỊ
-- =====================================================
INSERT INTO dot_dieu_tri (benh_nhan_id, loai_hinh, khoa, ngay_vao, ngay_ra, ma_benh, chan_doan_lam_sang, muc_huong) VALUES
(1, 'ngoai_tru', NULL, '2026-04-01 08:30:00', '2026-04-01 11:00:00', 'I10', 'Tăng huyết áp vô căn', 80),
(2, 'ngoai_tru', NULL, '2026-04-02 09:00:00', '2026-04-02 10:30:00', 'E11', 'Đái tháo đường typ 2', 100),
(4, 'ngoai_tru', NULL, '2026-04-03 08:00:00', '2026-04-03 10:00:00', 'J44', 'COPD đợt cấp', 100),
(3, 'noi_tru', 'Khoa Nội', '2026-04-01 14:00:00', NULL, 'J18', 'Viêm phổi cộng đồng', 80),
(5, 'noi_tru', 'Khoa Ngoại', '2026-04-02 10:00:00', NULL, 'K25', 'Loét dạ dày - Xuất huyết tiêu hóa', 95),
(6, 'noi_tru', 'Khoa Nội', '2026-04-03 16:00:00', NULL, 'I50', 'Suy tim sung huyết NYHA III', 100),
(8, 'noi_tru', 'Khoa Nội', '2026-03-28 09:00:00', NULL, 'N18.5', 'Bệnh thận mạn giai đoạn 5 - lọc máu', 100);
