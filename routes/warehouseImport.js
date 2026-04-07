const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated, authorize } = require('../middleware/authMiddleware');

// Danh sách phiếu nhập
router.get('/', isAuthenticated, authorize('duoc_si_tong'), async (req, res) => {
  try {
    const [receipts] = await db.query(`
      SELECT p.*, ncc.ten_nha_cung_cap, nd.ho_ten as nguoi_lap, k.ten_kho
      FROM phieu_nhap_kho p
      JOIN nha_cung_cap ncc ON p.nha_cung_cap_id = ncc.id
      JOIN nguoi_dung nd ON p.nguoi_lap_id = nd.id
      JOIN kho k ON p.kho_id = k.id
      ORDER BY p.ngay_lap DESC
    `);
    res.render('warehouse-import/index', { title: 'Nhập kho Thuốc', receipts });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi tải dữ liệu'); res.redirect('/dashboard'); }
});

// Form tạo phiếu nhập
router.get('/tao', isAuthenticated, authorize('duoc_si_tong'), async (req, res) => {
  try {
    const [suppliers] = await db.query('SELECT * FROM nha_cung_cap WHERE trang_thai = 1 ORDER BY ten_nha_cung_cap');
    const [drugs] = await db.query('SELECT id, ma_bhyt, ten_thuoc, ham_luong, don_vi_tinh, don_gia_thau FROM thuoc WHERE trang_thai = 1 ORDER BY ten_thuoc');
    const [warehouses] = await db.query("SELECT * FROM kho WHERE loai_kho = 'kho_tong'");
    res.render('warehouse-import/form', { title: 'Tạo phiếu nhập kho', suppliers, drugs, warehouses });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi tải dữ liệu'); res.redirect('/nhap-kho'); }
});

// Lưu phiếu nhập
router.post('/luu', isAuthenticated, authorize('duoc_si_tong'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { so_hoa_don, nha_cung_cap_id, kho_id, ghi_chu, items } = req.body;
    // Validation
    if (!so_hoa_don || !nha_cung_cap_id) { req.flash('error', 'Số hóa đơn và Nhà cung cấp không được để trống'); return res.redirect('/nhap-kho/tao'); }
    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
    if (!parsedItems || parsedItems.length === 0) { req.flash('error', 'Phiếu nhập phải có ít nhất 1 thuốc'); return res.redirect('/nhap-kho/tao'); }

    let tongTien = 0;
    // Validate each item
    for (const item of parsedItems) {
      if (!item.so_lo) { req.flash('error', 'Số lô bắt buộc để quản lý FEFO'); return res.redirect('/nhap-kho/tao'); }
      const hanDung = new Date(item.han_dung);
      const sixMonthsLater = new Date(); sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
      if (hanDung < sixMonthsLater) { req.flash('error', `Hạn dùng lô ${item.so_lo} phải lớn hơn ngày hiện tại ít nhất 6 tháng`); return res.redirect('/nhap-kho/tao'); }
      if (parseInt(item.so_luong) <= 0) { req.flash('error', 'Số lượng phải là số nguyên dương'); return res.redirect('/nhap-kho/tao'); }
      // Check giá nhập <= giá thầu
      const [drug] = await conn.query('SELECT don_gia_thau FROM thuoc WHERE id = ?', [item.thuoc_id]);
      if (drug.length > 0 && parseFloat(item.don_gia) > drug[0].don_gia_thau) {
        req.flash('error', `Đơn giá nhập không được cao hơn đơn giá trúng thầu`);
        return res.redirect('/nhap-kho/tao');
      }
    }

    // Insert phiếu nhập
    const [result] = await conn.query('INSERT INTO phieu_nhap_kho SET ?', { so_hoa_don, nha_cung_cap_id, kho_id: kho_id || 1, nguoi_lap_id: req.session.user.id, ghi_chu });
    const phieuId = result.insertId;

    // Insert chi tiết & cập nhật tồn kho
    for (const item of parsedItems) {
      const thanhTien = parseInt(item.so_luong) * parseFloat(item.don_gia) * (1 + parseFloat(item.thue_vat || 0) / 100);
      tongTien += thanhTien;

      await conn.query('INSERT INTO chi_tiet_nhap_kho (phieu_nhap_id, thuoc_id, so_lo, han_dung, so_luong, don_gia, thue_vat) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [phieuId, item.thuoc_id, item.so_lo, item.han_dung, item.so_luong, item.don_gia, item.thue_vat || 0]);

      // Cập nhật hoặc tạo mới lô thuốc
      const [existingLot] = await conn.query('SELECT id, so_luong_ton FROM lo_thuoc WHERE thuoc_id = ? AND so_lo = ? AND kho_id = ?', [item.thuoc_id, item.so_lo, kho_id || 1]);
      if (existingLot.length > 0) {
        await conn.query('UPDATE lo_thuoc SET so_luong_ton = so_luong_ton + ?, gia_nhap = ?, thue_vat = ?, han_dung = ? WHERE id = ?',
          [parseInt(item.so_luong), parseFloat(item.don_gia), parseFloat(item.thue_vat || 0), item.han_dung, existingLot[0].id]);
      } else {
        await conn.query('INSERT INTO lo_thuoc SET ?', {
          thuoc_id: item.thuoc_id, so_lo: item.so_lo, han_dung: item.han_dung,
          gia_nhap: parseFloat(item.don_gia), thue_vat: parseFloat(item.thue_vat || 0),
          kho_id: kho_id || 1, so_luong_ton: parseInt(item.so_luong)
        });
      }

      // Ghi biến động kho
      await conn.query('INSERT INTO bien_dong_kho SET ?', {
        kho_id: kho_id || 1, thuoc_id: item.thuoc_id, loai_bien_dong: 'nhap',
        so_luong: parseInt(item.so_luong), phieu_lien_quan: `NK-${phieuId}`,
        nguoi_thuc_hien_id: req.session.user.id
      });
    }

    await conn.query('UPDATE phieu_nhap_kho SET tong_tien = ? WHERE id = ?', [tongTien, phieuId]);
    await conn.commit();
    req.flash('success', 'Nhập kho thành công và đã cập nhật tồn kho');
    res.redirect('/nhap-kho');
  } catch (err) {
    await conn.rollback();
    console.error(err);
    req.flash('error', 'Lỗi nhập kho: ' + err.message);
    res.redirect('/nhap-kho/tao');
  } finally { conn.release(); }
});

// API: Lấy thông tin thuốc
router.get('/api/thuoc/:id', isAuthenticated, async (req, res) => {
  const [drugs] = await db.query('SELECT * FROM thuoc WHERE id = ?', [req.params.id]);
  res.json(drugs[0] || {});
});

module.exports = router;
