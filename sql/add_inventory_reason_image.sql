-- Thêm cột lý do và hình ảnh vào chi_tiet_kiem_ke
ALTER TABLE chi_tiet_kiem_ke 
  ADD COLUMN ly_do VARCHAR(500) NULL DEFAULT NULL AFTER chenh_lech,
  ADD COLUMN hinh_anh VARCHAR(255) NULL DEFAULT NULL AFTER ly_do;
