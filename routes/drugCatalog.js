const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated, authorize } = require('../middleware/authMiddleware');

// Danh sách thuốc
router.get('/', isAuthenticated, authorize('duoc_si_tong'), async (req, res) => {
  try {
    const search = req.query.search || '';
    const nhom = req.query.nhom || '';
    let sql = 'SELECT * FROM thuoc WHERE trang_thai = 1';
    const params = [];
    if (search) { sql += ' AND (ten_thuoc LIKE ? OR ma_bhyt LIKE ? OR hoat_chat LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (nhom) { sql += ' AND nhom_thuoc = ?'; params.push(nhom); }
    sql += ' ORDER BY ten_thuoc ASC';
    const [drugs] = await db.query(sql, params);
    const [groups] = await db.query('SELECT DISTINCT nhom_thuoc FROM thuoc WHERE trang_thai = 1 AND nhom_thuoc IS NOT NULL ORDER BY nhom_thuoc');
    res.render('drug-catalog/index', { title: 'Danh mục Thuốc', drugs, groups, search, nhom });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Lỗi tải danh mục thuốc');
    res.redirect('/dashboard');
  }
});

// Form thêm thuốc
router.get('/them', isAuthenticated, authorize('duoc_si_tong'), async (req, res) => {
  const [icd10] = await db.query('SELECT * FROM danh_muc_icd10 ORDER BY ma_benh');
  res.render('drug-catalog/form', { title: 'Thêm Thuốc', drug: null, icd10, mode: 'create' });
});

// Form sửa thuốc
router.get('/sua/:id', isAuthenticated, authorize('duoc_si_tong'), async (req, res) => {
  const [drugs] = await db.query('SELECT * FROM thuoc WHERE id = ?', [req.params.id]);
  if (drugs.length === 0) { req.flash('error', 'Không tìm thấy thuốc'); return res.redirect('/danh-muc-thuoc'); }
  const [icd10] = await db.query('SELECT * FROM danh_muc_icd10 ORDER BY ma_benh');
  res.render('drug-catalog/form', { title: 'Sửa Thuốc', drug: drugs[0], icd10, mode: 'edit' });
});

// Thêm/Sửa thuốc
router.post('/luu', isAuthenticated, authorize('duoc_si_tong'), async (req, res) => {
  try {
    const { id, ma_bhyt, ten_thuoc, hoat_chat, ham_luong, don_vi_tinh, duong_dung, don_gia_thau, ty_le_thanh_toan, so_dang_ky, nuoc_san_xuat, hang_san_xuat, nhom_thuoc, dinh_muc_toi_thieu } = req.body;
    // Validation
    const errors = [];
    if (!ten_thuoc || !ten_thuoc.trim()) errors.push('Tên thuốc không được để trống');
    if (!don_vi_tinh || !don_vi_tinh.trim()) errors.push('Đơn vị tính không được để trống');
    if (!ma_bhyt || ma_bhyt.trim().length !== 15) errors.push('Mã BHYT phải đủ 15 ký tự');
    if (!don_gia_thau || parseFloat(don_gia_thau) <= 0) errors.push('Đơn giá thầu phải là số dương');

    // Kiểm tra mã BHYT trùng
    if (!id || id === '') {
      const [existing] = await db.query('SELECT id FROM thuoc WHERE ma_bhyt = ?', [ma_bhyt.trim()]);
      if (existing.length > 0) errors.push('Mã BHYT đã tồn tại trong hệ thống');
    } else {
      const [existing] = await db.query('SELECT id FROM thuoc WHERE ma_bhyt = ? AND id != ?', [ma_bhyt.trim(), id]);
      if (existing.length > 0) errors.push('Mã BHYT đã tồn tại trong hệ thống');
    }

    if (errors.length > 0) {
      req.flash('error', errors.join('. '));
      return res.redirect(id ? `/danh-muc-thuoc/sua/${id}` : '/danh-muc-thuoc/them');
    }

    const data = { ma_bhyt: ma_bhyt.trim(), ten_thuoc: ten_thuoc.trim(), hoat_chat, ham_luong, don_vi_tinh, duong_dung, don_gia_thau: parseFloat(don_gia_thau), ty_le_thanh_toan: parseInt(ty_le_thanh_toan) || 100, so_dang_ky, nuoc_san_xuat, hang_san_xuat, nhom_thuoc, dinh_muc_toi_thieu: parseInt(dinh_muc_toi_thieu) || 10 };

    if (id && id !== '') {
      await db.query('UPDATE thuoc SET ? WHERE id = ?', [data, id]);
      req.flash('success', 'Cập nhật thuốc thành công');
    } else {
      await db.query('INSERT INTO thuoc SET ?', [data]);
      req.flash('success', 'Thêm thuốc thành công');
    }
    res.redirect('/danh-muc-thuoc');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Lỗi lưu dữ liệu: ' + err.message);
    res.redirect('/danh-muc-thuoc');
  }
});

// Xóa thuốc (soft delete)
router.post('/xoa/:id', isAuthenticated, authorize('duoc_si_tong'), async (req, res) => {
  try {
    await db.query('UPDATE thuoc SET trang_thai = 0 WHERE id = ?', [req.params.id]);
    req.flash('success', 'Đã xóa thuốc khỏi danh mục');
  } catch (err) {
    req.flash('error', 'Lỗi xóa thuốc');
  }
  res.redirect('/danh-muc-thuoc');
});

module.exports = router;
