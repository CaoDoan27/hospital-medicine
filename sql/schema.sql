-- =====================================================
-- HỆ THỐNG QUẢN LÝ CẤP PHÁT THUỐC BỆNH VIỆN
-- Database Schema - MySQL
-- =====================================================

CREATE DATABASE IF NOT EXISTS hospital_medicine 
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hospital_medicine;

-- =====================================================
-- 1. NGƯỜI DÙNG (Users)
-- =====================================================
CREATE TABLE nguoi_dung (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ten_dang_nhap VARCHAR(50) NOT NULL UNIQUE,
  mat_khau VARCHAR(255) NOT NULL,
  ho_ten VARCHAR(100) NOT NULL,
  vai_tro ENUM('duoc_si_tong','duoc_si_kho_le','dieu_duong','ke_toan') NOT NULL,
  trang_thai TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- 2. KHO (Warehouses)
-- =====================================================
CREATE TABLE kho (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ten_kho VARCHAR(100) NOT NULL,
  loai_kho ENUM('kho_tong','kho_le_ngoai_tru','kho_le_noi_tru','tu_truc') NOT NULL,
  khoa VARCHAR(100) DEFAULT NULL,
  trang_thai_kho ENUM('binh_thuong','dang_kiem_ke') DEFAULT 'binh_thuong',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- 3. NHÀ CUNG CẤP (Suppliers)
-- =====================================================
CREATE TABLE nha_cung_cap (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ten_nha_cung_cap VARCHAR(200) NOT NULL,
  dia_chi VARCHAR(500),
  ma_so_thue VARCHAR(20),
  dien_thoai VARCHAR(20),
  trang_thai TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- 4. DANH MỤC ICD-10
-- =====================================================
CREATE TABLE danh_muc_icd10 (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ma_benh VARCHAR(10) NOT NULL UNIQUE,
  ten_benh VARCHAR(500) NOT NULL,
  thuoc_phu_luc_2 TINYINT DEFAULT 0,
  ghi_chu TEXT
) ENGINE=InnoDB;

-- =====================================================
-- 5. THUỐC (Drugs)
-- =====================================================
CREATE TABLE thuoc (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ma_bhyt VARCHAR(15) NOT NULL UNIQUE,
  ten_thuoc VARCHAR(300) NOT NULL,
  hoat_chat VARCHAR(500),
  ham_luong VARCHAR(100),
  don_vi_tinh VARCHAR(50) NOT NULL,
  duong_dung VARCHAR(100),
  don_gia_thau DECIMAL(15,2) NOT NULL DEFAULT 0,
  ty_le_thanh_toan INT DEFAULT 100 COMMENT 'Tỷ lệ thanh toán BHYT (%)',
  so_dang_ky VARCHAR(50),
  nuoc_san_xuat VARCHAR(100),
  hang_san_xuat VARCHAR(200),
  nhom_thuoc VARCHAR(100),
  dinh_muc_toi_thieu INT DEFAULT 10,
  trang_thai TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- 6. LÔ THUỐC (Drug Batches)
-- =====================================================
CREATE TABLE lo_thuoc (
  id INT AUTO_INCREMENT PRIMARY KEY,
  thuoc_id INT NOT NULL,
  so_lo VARCHAR(50) NOT NULL,
  han_dung DATE NOT NULL,
  gia_nhap DECIMAL(15,2) NOT NULL,
  thue_vat DECIMAL(5,2) DEFAULT 0,
  kho_id INT NOT NULL,
  so_luong_ton INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (thuoc_id) REFERENCES thuoc(id),
  FOREIGN KEY (kho_id) REFERENCES kho(id),
  UNIQUE KEY uq_lo_kho (thuoc_id, so_lo, kho_id)
) ENGINE=InnoDB;

CREATE INDEX idx_lo_han_dung ON lo_thuoc(han_dung);
CREATE INDEX idx_lo_kho ON lo_thuoc(kho_id, thuoc_id);

-- =====================================================
-- 7. PHIẾU NHẬP KHO (Import Receipts)
-- =====================================================
CREATE TABLE phieu_nhap_kho (
  id INT AUTO_INCREMENT PRIMARY KEY,
  so_hoa_don VARCHAR(50) NOT NULL,
  nha_cung_cap_id INT NOT NULL,
  kho_id INT NOT NULL,
  nguoi_lap_id INT NOT NULL,
  ngay_lap DATETIME DEFAULT CURRENT_TIMESTAMP,
  tong_tien DECIMAL(18,2) DEFAULT 0,
  ghi_chu TEXT,
  FOREIGN KEY (nha_cung_cap_id) REFERENCES nha_cung_cap(id),
  FOREIGN KEY (kho_id) REFERENCES kho(id),
  FOREIGN KEY (nguoi_lap_id) REFERENCES nguoi_dung(id)
) ENGINE=InnoDB;

CREATE TABLE chi_tiet_nhap_kho (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phieu_nhap_id INT NOT NULL,
  thuoc_id INT NOT NULL,
  lo_thuoc_id INT,
  so_lo VARCHAR(50) NOT NULL,
  han_dung DATE NOT NULL,
  so_luong INT NOT NULL,
  don_gia DECIMAL(15,2) NOT NULL,
  thue_vat DECIMAL(5,2) DEFAULT 0,
  thanh_tien DECIMAL(18,2) GENERATED ALWAYS AS (so_luong * don_gia * (1 + thue_vat/100)) STORED,
  FOREIGN KEY (phieu_nhap_id) REFERENCES phieu_nhap_kho(id),
  FOREIGN KEY (thuoc_id) REFERENCES thuoc(id)
) ENGINE=InnoDB;

-- =====================================================
-- 8. PHIẾU ĐIỀU CHUYỂN / HOÀN ỨNG
-- =====================================================
CREATE TABLE phieu_dieu_chuyen (
  id INT AUTO_INCREMENT PRIMARY KEY,
  loai_phieu ENUM('DIEU_CHUYEN','HOAN_UNG') NOT NULL,
  kho_xuat_id INT NOT NULL,
  kho_nhan_id INT NOT NULL,
  nguoi_lap_id INT NOT NULL,
  nguoi_duyet_id INT,
  ngay_lap DATETIME DEFAULT CURRENT_TIMESTAMP,
  ngay_duyet DATETIME,
  trang_thai ENUM('cho_duyet','dang_van_chuyen','hoan_thanh','tu_choi') DEFAULT 'cho_duyet',
  ghi_chu TEXT,
  FOREIGN KEY (kho_xuat_id) REFERENCES kho(id),
  FOREIGN KEY (kho_nhan_id) REFERENCES kho(id),
  FOREIGN KEY (nguoi_lap_id) REFERENCES nguoi_dung(id),
  FOREIGN KEY (nguoi_duyet_id) REFERENCES nguoi_dung(id)
) ENGINE=InnoDB;

CREATE TABLE chi_tiet_dieu_chuyen (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phieu_id INT NOT NULL,
  thuoc_id INT NOT NULL,
  lo_thuoc_id INT,
  so_lo VARCHAR(50),
  han_dung DATE,
  so_luong_yeu_cau INT NOT NULL,
  so_luong_thuc_xuat INT DEFAULT 0,
  FOREIGN KEY (phieu_id) REFERENCES phieu_dieu_chuyen(id),
  FOREIGN KEY (thuoc_id) REFERENCES thuoc(id)
) ENGINE=InnoDB;

-- =====================================================
-- 9. BỆNH NHÂN (Patients)
-- =====================================================
CREATE TABLE benh_nhan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ma_benh_nhan VARCHAR(20) NOT NULL UNIQUE,
  ho_ten VARCHAR(100) NOT NULL,
  ngay_sinh DATE,
  gioi_tinh ENUM('Nam','Nu') DEFAULT 'Nam',
  so_dinh_danh VARCHAR(20),
  so_the_bhyt VARCHAR(15),
  dia_chi VARCHAR(500),
  dien_thoai VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- 10. ĐỢT ĐIỀU TRỊ (Treatment Episodes)
-- =====================================================
CREATE TABLE dot_dieu_tri (
  id INT AUTO_INCREMENT PRIMARY KEY,
  benh_nhan_id INT NOT NULL,
  loai_hinh ENUM('ngoai_tru','noi_tru') NOT NULL,
  khoa VARCHAR(100),
  ngay_vao DATETIME NOT NULL,
  ngay_ra DATETIME,
  ma_benh VARCHAR(10),
  chan_doan_lam_sang VARCHAR(500),
  muc_huong INT DEFAULT 80 COMMENT '80, 95, hoặc 100',
  trang_thai ENUM('dang_dieu_tri','da_chot_vien_phi','da_xuat_xml') DEFAULT 'dang_dieu_tri',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (benh_nhan_id) REFERENCES benh_nhan(id),
  FOREIGN KEY (ma_benh) REFERENCES danh_muc_icd10(ma_benh)
) ENGINE=InnoDB;

-- =====================================================
-- 11. ĐƠN THUỐC (Prescriptions)
-- =====================================================
CREATE TABLE don_thuoc (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dot_dieu_tri_id INT NOT NULL,
  bac_si_ke VARCHAR(100),
  ngay_ke DATETIME DEFAULT CURRENT_TIMESTAMP,
  chan_doan VARCHAR(500),
  trang_thai ENUM('moi','da_cap_phat','huy') DEFAULT 'moi',
  FOREIGN KEY (dot_dieu_tri_id) REFERENCES dot_dieu_tri(id)
) ENGINE=InnoDB;

-- =====================================================
-- 12. CHI TIẾT CẤP PHÁT (Dispensing Details)
-- =====================================================
CREATE TABLE chi_tiet_cap_phat (
  id INT AUTO_INCREMENT PRIMARY KEY,
  don_thuoc_id INT NOT NULL,
  thuoc_id INT NOT NULL,
  lo_thuoc_id INT,
  kho_xuat_id INT NOT NULL,
  so_luong_phat INT NOT NULL,
  don_gia DECIMAL(15,2) NOT NULL,
  tien_bhyt_chi_tra DECIMAL(15,2) DEFAULT 0,
  tien_bn_dong_chi_tra DECIMAL(15,2) DEFAULT 0,
  tien_bn_tu_tuc DECIMAL(15,2) DEFAULT 0,
  ngay_cap_phat DATETIME DEFAULT CURRENT_TIMESTAMP,
  nguoi_cap_phat_id INT,
  FOREIGN KEY (don_thuoc_id) REFERENCES don_thuoc(id),
  FOREIGN KEY (thuoc_id) REFERENCES thuoc(id),
  FOREIGN KEY (kho_xuat_id) REFERENCES kho(id),
  FOREIGN KEY (nguoi_cap_phat_id) REFERENCES nguoi_dung(id)
) ENGINE=InnoDB;

-- =====================================================
-- 13. Y LỆNH NỘI TRÚ (Medical Orders)
-- =====================================================
CREATE TABLE y_lenh (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dot_dieu_tri_id INT NOT NULL,
  thuoc_id INT NOT NULL,
  so_luong INT NOT NULL,
  lieu_dung VARCHAR(200),
  ngay_y_lenh DATE NOT NULL,
  buoi ENUM('sang','chieu','toi') DEFAULT 'sang',
  bac_si_chi_dinh VARCHAR(100),
  trang_thai ENUM('chua_linh','dang_cho_duyet','da_linh') DEFAULT 'chua_linh',
  FOREIGN KEY (dot_dieu_tri_id) REFERENCES dot_dieu_tri(id),
  FOREIGN KEY (thuoc_id) REFERENCES thuoc(id)
) ENGINE=InnoDB;

-- =====================================================
-- 14. PHIẾU LĨNH (Requisition Forms)
-- =====================================================
CREATE TABLE phieu_linh (
  id INT AUTO_INCREMENT PRIMARY KEY,
  khoa VARCHAR(100) NOT NULL,
  nguoi_lap_id INT NOT NULL,
  ngay_lap DATETIME DEFAULT CURRENT_TIMESTAMP,
  trang_thai ENUM('dang_cho_duyet','da_cap_phat','huy') DEFAULT 'dang_cho_duyet',
  FOREIGN KEY (nguoi_lap_id) REFERENCES nguoi_dung(id)
) ENGINE=InnoDB;

CREATE TABLE chi_tiet_phieu_linh (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phieu_linh_id INT NOT NULL,
  thuoc_id INT NOT NULL,
  so_luong_yeu_cau INT NOT NULL,
  so_luong_cap_phat INT DEFAULT 0,
  FOREIGN KEY (phieu_linh_id) REFERENCES phieu_linh(id),
  FOREIGN KEY (thuoc_id) REFERENCES thuoc(id)
) ENGINE=InnoDB;

CREATE TABLE phieu_linh_y_lenh (
  phieu_linh_id INT NOT NULL,
  y_lenh_id INT NOT NULL,
  PRIMARY KEY (phieu_linh_id, y_lenh_id),
  FOREIGN KEY (phieu_linh_id) REFERENCES phieu_linh(id),
  FOREIGN KEY (y_lenh_id) REFERENCES y_lenh(id)
) ENGINE=InnoDB;

-- =====================================================
-- 15. TỒN KHO TỦ TRỰC (Emergency Cabinet Stock)
-- =====================================================
CREATE TABLE ton_kho_tu_truc (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kho_id INT NOT NULL,
  thuoc_id INT NOT NULL,
  lo_thuoc_id INT,
  so_lo VARCHAR(50),
  han_dung DATE,
  so_luong_ton INT DEFAULT 0,
  co_so_tran INT DEFAULT 50 COMMENT 'Định mức tối đa tủ trực',
  FOREIGN KEY (kho_id) REFERENCES kho(id),
  FOREIGN KEY (thuoc_id) REFERENCES thuoc(id)
) ENGINE=InnoDB;

-- =====================================================
-- 16. HÀNG CHỜ HOÀN ỨNG
-- =====================================================
CREATE TABLE hang_cho_hoan_ung (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kho_tu_truc_id INT NOT NULL,
  thuoc_id INT NOT NULL,
  dot_dieu_tri_id INT,
  so_luong INT NOT NULL,
  ngay_xuat DATETIME DEFAULT CURRENT_TIMESTAMP,
  trang_thai ENUM('cho_lap_phieu','da_lap_phieu','da_hoan_ung') DEFAULT 'cho_lap_phieu',
  FOREIGN KEY (kho_tu_truc_id) REFERENCES kho(id),
  FOREIGN KEY (thuoc_id) REFERENCES thuoc(id),
  FOREIGN KEY (dot_dieu_tri_id) REFERENCES dot_dieu_tri(id)
) ENGINE=InnoDB;

-- =====================================================
-- 17. PHIẾU HOÀN ỨNG
-- =====================================================
CREATE TABLE phieu_hoan_ung (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kho_tu_truc_id INT NOT NULL,
  khoa_yeu_cau VARCHAR(100) NOT NULL,
  nguoi_lap_id INT NOT NULL,
  nguoi_duyet_id INT,
  ngay_lap DATETIME DEFAULT CURRENT_TIMESTAMP,
  ngay_duyet DATETIME,
  trang_thai ENUM('cho_duyet','da_hoan_thanh','tu_choi') DEFAULT 'cho_duyet',
  FOREIGN KEY (kho_tu_truc_id) REFERENCES kho(id),
  FOREIGN KEY (nguoi_lap_id) REFERENCES nguoi_dung(id),
  FOREIGN KEY (nguoi_duyet_id) REFERENCES nguoi_dung(id)
) ENGINE=InnoDB;

CREATE TABLE chi_tiet_phieu_hoan_ung (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phieu_hoan_ung_id INT NOT NULL,
  thuoc_id INT NOT NULL,
  lo_thuoc_id INT,
  so_luong_yeu_cau INT NOT NULL,
  so_luong_thuc_xuat INT DEFAULT 0,
  FOREIGN KEY (phieu_hoan_ung_id) REFERENCES phieu_hoan_ung(id),
  FOREIGN KEY (thuoc_id) REFERENCES thuoc(id)
) ENGINE=InnoDB;

-- =====================================================
-- 18. CHI PHÍ BHYT BỆNH NHÂN
-- =====================================================
CREATE TABLE chi_phi_bhyt (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dot_dieu_tri_id INT NOT NULL,
  thuoc_id INT NOT NULL,
  so_luong INT NOT NULL,
  don_gia DECIMAL(15,2) NOT NULL,
  ty_le_tt INT DEFAULT 100,
  muc_huong INT DEFAULT 80,
  tien_bhyt DECIMAL(15,2) DEFAULT 0,
  tien_bn_cung_tra DECIMAL(15,2) DEFAULT 0,
  tien_bn_tu_tuc DECIMAL(15,2) DEFAULT 0,
  nguon ENUM('ngoai_tru','noi_tru','tu_truc') NOT NULL,
  ngay_ghi_nhan DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dot_dieu_tri_id) REFERENCES dot_dieu_tri(id),
  FOREIGN KEY (thuoc_id) REFERENCES thuoc(id)
) ENGINE=InnoDB;

-- =====================================================
-- 19. KIỂM KÊ (Inventory Check)
-- =====================================================
CREATE TABLE kiem_ke (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kho_id INT NOT NULL,
  nguoi_kiem_ke_id INT NOT NULL,
  ngay_bat_dau DATETIME DEFAULT CURRENT_TIMESTAMP,
  ngay_ket_thuc DATETIME,
  trang_thai ENUM('dang_thuc_hien','hoan_thanh') DEFAULT 'dang_thuc_hien',
  FOREIGN KEY (kho_id) REFERENCES kho(id),
  FOREIGN KEY (nguoi_kiem_ke_id) REFERENCES nguoi_dung(id)
) ENGINE=InnoDB;

CREATE TABLE chi_tiet_kiem_ke (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kiem_ke_id INT NOT NULL,
  thuoc_id INT NOT NULL,
  lo_thuoc_id INT,
  so_lo VARCHAR(50),
  so_luong_he_thong INT NOT NULL,
  so_luong_thuc_te INT,
  chenh_lech INT GENERATED ALWAYS AS (COALESCE(so_luong_thuc_te,0) - so_luong_he_thong) STORED,
  ghi_chu TEXT,
  FOREIGN KEY (kiem_ke_id) REFERENCES kiem_ke(id),
  FOREIGN KEY (thuoc_id) REFERENCES thuoc(id)
) ENGINE=InnoDB;

-- =====================================================
-- 20. BIẾN ĐỘNG KHO (Stock Movement Log)
-- =====================================================
CREATE TABLE bien_dong_kho (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kho_id INT NOT NULL,
  thuoc_id INT NOT NULL,
  lo_thuoc_id INT,
  loai_bien_dong ENUM('nhap','xuat_cap_phat','xuat_dieu_chuyen','nhap_dieu_chuyen','xuat_tu_truc','hoan_ung','kiem_ke_tang','kiem_ke_giam') NOT NULL,
  so_luong INT NOT NULL,
  so_luong_truoc INT DEFAULT 0,
  so_luong_sau INT DEFAULT 0,
  phieu_lien_quan VARCHAR(50),
  nguoi_thuc_hien_id INT,
  ngay_bien_dong DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (kho_id) REFERENCES kho(id),
  FOREIGN KEY (thuoc_id) REFERENCES thuoc(id),
  FOREIGN KEY (nguoi_thuc_hien_id) REFERENCES nguoi_dung(id)
) ENGINE=InnoDB;

CREATE INDEX idx_bien_dong_ngay ON bien_dong_kho(ngay_bien_dong);
CREATE INDEX idx_bien_dong_kho ON bien_dong_kho(kho_id, thuoc_id);
