CREATE DATABASE IF NOT EXISTS ql_duoc_benh_vien
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE ql_duoc_benh_vien;

-- =====================================================
-- NHÓM 1: DANH MỤC GỐC
-- =====================================================

CREATE TABLE benh_nhan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ma_benh_nhan VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE danh_muc_icd10 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ma_benh VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE thuoc (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ma_bhyt VARCHAR(50) NOT NULL
);

CREATE TABLE kho (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loai_kho ENUM(
        'KHO_CHINH',
        'KHO_LE',
        'KHO_TU_TRUC'
    ) NOT NULL
);

CREATE TABLE nha_cung_cap (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ten_nha_cung_cap VARCHAR(255) NOT NULL
);

CREATE TABLE nguoi_dung (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kho_id INT,
    vai_tro ENUM(
        'ADMIN',
        'DUOC_SI',
        'BAC_SI',
        'DIEU_DUONG',
        'KE_TOAN'
    ) NOT NULL,

    CONSTRAINT fk_nguoi_dung_kho
        FOREIGN KEY (kho_id)
        REFERENCES kho(id)
);

-- =====================================================
-- NHÓM 2: LÂM SÀNG & BHYT
-- =====================================================

CREATE TABLE dot_dieu_tri (
    id INT AUTO_INCREMENT PRIMARY KEY,
    benh_nhan_id INT NOT NULL,
    ma_benh VARCHAR(20),
    loai_hinh ENUM(
        'NOI_TRU',
        'NGOAI_TRU'
    ) NOT NULL,

    CONSTRAINT fk_dotdt_benhnhan
        FOREIGN KEY (benh_nhan_id)
        REFERENCES benh_nhan(id),

    CONSTRAINT fk_dotdt_icd10
        FOREIGN KEY (ma_benh)
        REFERENCES danh_muc_icd10(ma_benh)
);

CREATE TABLE chi_phi_bhyt (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dot_dieu_tri_id INT NOT NULL,
    thuoc_id INT NOT NULL,
    tien_bhyt DECIMAL(18,2) DEFAULT 0,

    CONSTRAINT fk_cpbhyt_dotdt
        FOREIGN KEY (dot_dieu_tri_id)
        REFERENCES dot_dieu_tri(id),

    CONSTRAINT fk_cpbhyt_thuoc
        FOREIGN KEY (thuoc_id)
        REFERENCES thuoc(id)
);

CREATE TABLE don_thuoc (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dot_dieu_tri_id INT NOT NULL,
    trang_thai ENUM(
        'MOI_TAO',
        'DA_DUYET',
        'DA_CAP_PHAT',
        'HUY'
    ) NOT NULL,

    CONSTRAINT fk_donthuoc_dotdt
        FOREIGN KEY (dot_dieu_tri_id)
        REFERENCES dot_dieu_tri(id)
);

CREATE TABLE chi_tiet_don_thuoc (
    id INT AUTO_INCREMENT PRIMARY KEY,
    don_thuoc_id INT NOT NULL,
    thuoc_id INT NOT NULL,
    so_luong INT NOT NULL,

    CONSTRAINT fk_ctdt_donthuoc
        FOREIGN KEY (don_thuoc_id)
        REFERENCES don_thuoc(id),

    CONSTRAINT fk_ctdt_thuoc
        FOREIGN KEY (thuoc_id)
        REFERENCES thuoc(id)
);

-- =====================================================
-- NHÓM 3: QUẢN LÝ LÔ HẠN & TỒN KHO
-- =====================================================

CREATE TABLE lo_thuoc (
    id INT AUTO_INCREMENT PRIMARY KEY,
    thuoc_id INT NOT NULL,
    kho_id INT NOT NULL,
    han_dung DATE NOT NULL,

    CONSTRAINT fk_lothuoc_thuoc
        FOREIGN KEY (thuoc_id)
        REFERENCES thuoc(id),

    CONSTRAINT fk_lothuoc_kho
        FOREIGN KEY (kho_id)
        REFERENCES kho(id)
);

CREATE TABLE ton_kho_tu_truc (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kho_id INT NOT NULL,
    thuoc_id INT NOT NULL,
    lo_thuoc_id INT NOT NULL,
    so_luong_ton INT DEFAULT 0,

    CONSTRAINT fk_tonkho_kho
        FOREIGN KEY (kho_id)
        REFERENCES kho(id),

    CONSTRAINT fk_tonkho_thuoc
        FOREIGN KEY (thuoc_id)
        REFERENCES thuoc(id),

    CONSTRAINT fk_tonkho_lo
        FOREIGN KEY (lo_thuoc_id)
        REFERENCES lo_thuoc(id)
);

CREATE TABLE bien_dong_kho (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kho_id INT NOT NULL,
    thuoc_id INT NOT NULL,
    lo_thuoc_id INT NOT NULL,
    nguoi_thuc_hien_id INT NOT NULL,

    loai_bien_dong ENUM(
        'NHAP',
        'XUAT',
        'DIEU_CHUYEN',
        'KIEM_KE',
        'HOAN_UNG'
    ) NOT NULL,

    CONSTRAINT fk_bdk_kho
        FOREIGN KEY (kho_id)
        REFERENCES kho(id),

    CONSTRAINT fk_bdk_thuoc
        FOREIGN KEY (thuoc_id)
        REFERENCES thuoc(id),

    CONSTRAINT fk_bdk_lo
        FOREIGN KEY (lo_thuoc_id)
        REFERENCES lo_thuoc(id),

    CONSTRAINT fk_bdk_nguoidung
        FOREIGN KEY (nguoi_thuc_hien_id)
        REFERENCES nguoi_dung(id)
);

-- =====================================================
-- NHÓM 4: CHỨNG TỪ & GIAO DỊCH
-- =====================================================

CREATE TABLE chi_tiet_cap_phat (
    id INT AUTO_INCREMENT PRIMARY KEY,
    don_thuoc_id INT NOT NULL,
    thuoc_id INT NOT NULL,
    kho_xuat_id INT NOT NULL,
    lo_thuoc_id INT NOT NULL,
    nguoi_cap_phat_id INT NOT NULL,

    CONSTRAINT fk_ctcp_donthuoc
        FOREIGN KEY (don_thuoc_id)
        REFERENCES don_thuoc(id),

    CONSTRAINT fk_ctcp_thuoc
        FOREIGN KEY (thuoc_id)
        REFERENCES thuoc(id),

    CONSTRAINT fk_ctcp_kho
        FOREIGN KEY (kho_xuat_id)
        REFERENCES kho(id),

    CONSTRAINT fk_ctcp_lo
        FOREIGN KEY (lo_thuoc_id)
        REFERENCES lo_thuoc(id),

    CONSTRAINT fk_ctcp_nguoi
        FOREIGN KEY (nguoi_cap_phat_id)
        REFERENCES nguoi_dung(id)
);

CREATE TABLE phieu_nhap_kho (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nha_cung_cap_id INT NOT NULL,
    kho_id INT NOT NULL,
    nguoi_lap_id INT NOT NULL,

    CONSTRAINT fk_pnk_ncc
        FOREIGN KEY (nha_cung_cap_id)
        REFERENCES nha_cung_cap(id),

    CONSTRAINT fk_pnk_kho
        FOREIGN KEY (kho_id)
        REFERENCES kho(id),

    CONSTRAINT fk_pnk_nguoi
        FOREIGN KEY (nguoi_lap_id)
        REFERENCES nguoi_dung(id)
);

CREATE TABLE chi_tiet_nhap_kho (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phieu_nhap_id INT NOT NULL,
    thuoc_id INT NOT NULL,
    lo_thuoc_id INT NOT NULL,

    CONSTRAINT fk_ctnk_phieu
        FOREIGN KEY (phieu_nhap_id)
        REFERENCES phieu_nhap_kho(id),

    CONSTRAINT fk_ctnk_thuoc
        FOREIGN KEY (thuoc_id)
        REFERENCES thuoc(id),

    CONSTRAINT fk_ctnk_lo
        FOREIGN KEY (lo_thuoc_id)
        REFERENCES lo_thuoc(id)
);

CREATE TABLE phieu_dieu_chuyen (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kho_xuat_id INT NOT NULL,
    kho_nhan_id INT NOT NULL,
    nguoi_lap_id INT NOT NULL,
    nguoi_duyet_id INT NOT NULL,

    CONSTRAINT fk_pdc_kho_xuat
        FOREIGN KEY (kho_xuat_id)
        REFERENCES kho(id),

    CONSTRAINT fk_pdc_kho_nhan
        FOREIGN KEY (kho_nhan_id)
        REFERENCES kho(id),

    CONSTRAINT fk_pdc_lap
        FOREIGN KEY (nguoi_lap_id)
        REFERENCES nguoi_dung(id),

    CONSTRAINT fk_pdc_duyet
        FOREIGN KEY (nguoi_duyet_id)
        REFERENCES nguoi_dung(id)
);

CREATE TABLE chi_tiet_dieu_chuyen (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phieu_id INT NOT NULL,
    thuoc_id INT NOT NULL,
    lo_thuoc_id INT NOT NULL,

    CONSTRAINT fk_ctdc_phieu
        FOREIGN KEY (phieu_id)
        REFERENCES phieu_dieu_chuyen(id),

    CONSTRAINT fk_ctdc_thuoc
        FOREIGN KEY (thuoc_id)
        REFERENCES thuoc(id),

    CONSTRAINT fk_ctdc_lo
        FOREIGN KEY (lo_thuoc_id)
        REFERENCES lo_thuoc(id)
);

CREATE TABLE kiem_ke (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kho_id INT NOT NULL,
    nguoi_kiem_ke_id INT NOT NULL,

    CONSTRAINT fk_kiemke_kho
        FOREIGN KEY (kho_id)
        REFERENCES kho(id),

    CONSTRAINT fk_kiemke_nguoi
        FOREIGN KEY (nguoi_kiem_ke_id)
        REFERENCES nguoi_dung(id)
);

CREATE TABLE chi_tiet_kiem_ke (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kiem_ke_id INT NOT NULL,
    thuoc_id INT NOT NULL,
    lo_thuoc_id INT NOT NULL,
    chenh_lech INT NOT NULL,

    CONSTRAINT fk_ctkk_kiemke
        FOREIGN KEY (kiem_ke_id)
        REFERENCES kiem_ke(id),

    CONSTRAINT fk_ctkk_thuoc
        FOREIGN KEY (thuoc_id)
        REFERENCES thuoc(id),

    CONSTRAINT fk_ctkk_lo
        FOREIGN KEY (lo_thuoc_id)
        REFERENCES lo_thuoc(id)
);

-- =====================================================
-- NHÓM 5: Y LỆNH NỘI TRÚ & TỦ TRỰC
-- =====================================================

CREATE TABLE y_lenh (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dot_dieu_tri_id INT NOT NULL,
    thuoc_id INT NOT NULL,

    trang_thai ENUM(
        'MOI_TAO',
        'DA_DUYET',
        'DA_LINH',
        'DA_CAP'
    ) NOT NULL,

    CONSTRAINT fk_ylenh_dotdt
        FOREIGN KEY (dot_dieu_tri_id)
        REFERENCES dot_dieu_tri(id),

    CONSTRAINT fk_ylenh_thuoc
        FOREIGN KEY (thuoc_id)
        REFERENCES thuoc(id)
);

CREATE TABLE phieu_linh (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nguoi_lap_id INT NOT NULL,

    trang_thai ENUM(
        'CHO_DUYET',
        'DA_DUYET',
        'DA_CAP',
        'TU_CHOI'
    ) NOT NULL,

    CONSTRAINT fk_phieulinh_nguoi
        FOREIGN KEY (nguoi_lap_id)
        REFERENCES nguoi_dung(id)
);

CREATE TABLE phieu_linh_y_lenh (
    phieu_linh_id INT NOT NULL,
    y_lenh_id INT NOT NULL,

    PRIMARY KEY (phieu_linh_id, y_lenh_id),

    CONSTRAINT fk_plyl_phieu
        FOREIGN KEY (phieu_linh_id)
        REFERENCES phieu_linh(id),

    CONSTRAINT fk_plyl_ylenh
        FOREIGN KEY (y_lenh_id)
        REFERENCES y_lenh(id)
);

CREATE TABLE chi_tiet_phieu_linh (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phieu_linh_id INT NOT NULL,
    thuoc_id INT NOT NULL,

    CONSTRAINT fk_ctpl_phieu
        FOREIGN KEY (phieu_linh_id)
        REFERENCES phieu_linh(id),

    CONSTRAINT fk_ctpl_thuoc
        FOREIGN KEY (thuoc_id)
        REFERENCES thuoc(id)
);

CREATE TABLE phieu_hoan_ung (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kho_tu_truc_id INT NOT NULL,
    nguoi_lap_id INT NOT NULL,
    nguoi_duyet_id INT NOT NULL,

    CONSTRAINT fk_phu_kho
        FOREIGN KEY (kho_tu_truc_id)
        REFERENCES kho(id),

    CONSTRAINT fk_phu_lap
        FOREIGN KEY (nguoi_lap_id)
        REFERENCES nguoi_dung(id),

    CONSTRAINT fk_phu_duyet
        FOREIGN KEY (nguoi_duyet_id)
        REFERENCES nguoi_dung(id)
);

CREATE TABLE chi_tiet_phieu_hoan_ung (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phieu_hoan_ung_id INT NOT NULL,
    thuoc_id INT NOT NULL,
    lo_thuoc_id INT NOT NULL,

    CONSTRAINT fk_ctphu_phieu
        FOREIGN KEY (phieu_hoan_ung_id)
        REFERENCES phieu_hoan_ung(id),

    CONSTRAINT fk_ctphu_thuoc
        FOREIGN KEY (thuoc_id)
        REFERENCES thuoc(id),

    CONSTRAINT fk_ctphu_lo
        FOREIGN KEY (lo_thuoc_id)
        REFERENCES lo_thuoc(id)
);

CREATE TABLE hang_cho_hoan_ung (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kho_tu_truc_id INT NOT NULL,
    thuoc_id INT NOT NULL,
    dot_dieu_tri_id INT NOT NULL,

    CONSTRAINT fk_hchu_kho
        FOREIGN KEY (kho_tu_truc_id)
        REFERENCES kho(id),

    CONSTRAINT fk_hchu_thuoc
        FOREIGN KEY (thuoc_id)
        REFERENCES thuoc(id),

    CONSTRAINT fk_hchu_dotdt
        FOREIGN KEY (dot_dieu_tri_id)
        REFERENCES dot_dieu_tri(id)
);