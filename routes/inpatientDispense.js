const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated, authorize } = require('../middleware/authMiddleware');
const FefoService = require('../services/fefoService');
const BhytService = require('../services/bhytService');

router.get('/', isAuthenticated, authorize('duoc_si_kho_le'), async (req, res) => {
  try {
    const [phieuLinh] = await db.query(`
      SELECT pl.*, nd.ho_ten as nguoi_lap FROM phieu_linh pl
      JOIN nguoi_dung nd ON pl.nguoi_lap_id = nd.id
      WHERE pl.trang_thai = 'dang_cho_duyet' ORDER BY pl.ngay_lap DESC
    `);
    const [phieuDaCapPhat] = await db.query(`
      SELECT pl.*, nd.ho_ten as nguoi_lap FROM phieu_linh pl
      JOIN nguoi_dung nd ON pl.nguoi_lap_id = nd.id
      WHERE pl.trang_thai = 'da_cap_phat' ORDER BY pl.ngay_lap DESC LIMIT 20
    `);
    res.render('inpatient/dispense-confirm', { title: 'Cấp phát Nội trú', phieuLinh, phieuDaCapPhat });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/dashboard'); }
});

router.get('/chi-tiet/:id', isAuthenticated, authorize('duoc_si_kho_le'), async (req, res) => {
  try {
    const [phieu] = await db.query('SELECT * FROM phieu_linh WHERE id = ?', [req.params.id]);
    const [details] = await db.query(`
      SELECT ct.*, t.ten_thuoc, t.ham_luong, t.don_vi_tinh, t.don_gia_thau
      FROM chi_tiet_phieu_linh ct JOIN thuoc t ON ct.thuoc_id = t.id WHERE ct.phieu_linh_id = ?
    `, [req.params.id]);
    // FEFO suggestions
    for (const item of details) {
      const suggestion = await FefoService.allocate(item.thuoc_id, 3, item.so_luong_yeu_cau);
      item.fefo_suggestion = suggestion;
    }
    res.render('inpatient/dispense-detail', { title: 'Chi tiết phiếu lĩnh', phieu: phieu[0], details });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/cap-phat-noi-tru'); }
});

router.post('/xac-nhan/:id', isAuthenticated, authorize('duoc_si_kho_le'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const phieuLinhId = req.params.id;
    const [details] = await conn.query(`
      SELECT ct.*, t.don_gia_thau, t.ty_le_thanh_toan FROM chi_tiet_phieu_linh ct
      JOIN thuoc t ON ct.thuoc_id = t.id WHERE ct.phieu_linh_id = ?
    `, [phieuLinhId]);

    // Lấy y lệnh liên kết để biết bệnh nhân
    const [yLenhLinks] = await conn.query('SELECT y_lenh_id FROM phieu_linh_y_lenh WHERE phieu_linh_id = ?', [phieuLinhId]);

    for (const item of details) {
      const allocation = await FefoService.allocate(item.thuoc_id, 3, item.so_luong_yeu_cau);
      if (!allocation.success) { await conn.rollback(); req.flash('error', 'Không đủ tồn kho nội trú'); return res.redirect('/cap-phat-noi-tru'); }
      await FefoService.deductStock(conn, allocation.allocation);
      await conn.query('UPDATE chi_tiet_phieu_linh SET so_luong_cap_phat = ? WHERE id = ?', [item.so_luong_yeu_cau, item.id]);
      await conn.query('INSERT INTO bien_dong_kho SET ?', {
        kho_id: 3, thuoc_id: item.thuoc_id, loai_bien_dong: 'xuat_cap_phat',
        so_luong: item.so_luong_yeu_cau, phieu_lien_quan: `PL-${phieuLinhId}`, nguoi_thuc_hien_id: req.session.user.id
      });
    }

    // Cập nhật trạng thái
    await conn.query("UPDATE phieu_linh SET trang_thai = 'da_cap_phat' WHERE id = ?", [phieuLinhId]);
    if (yLenhLinks.length > 0) {
      const yLenhIds = yLenhLinks.map(l => l.y_lenh_id);
      await conn.query("UPDATE y_lenh SET trang_thai = 'da_linh' WHERE id IN (?)", [yLenhIds]);
    }
    await conn.commit();
    req.flash('success', 'Cấp phát nội trú thành công');
  } catch (err) { await conn.rollback(); console.error(err); req.flash('error', 'Lỗi: ' + err.message); }
  finally { conn.release(); }
  res.redirect('/cap-phat-noi-tru');
});

module.exports = router;
