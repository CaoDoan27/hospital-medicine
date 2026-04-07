const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated, authorize } = require('../middleware/authMiddleware');

router.get('/', isAuthenticated, authorize('dieu_duong'), async (req, res) => {
  try {
    const khoa = req.query.khoa || 'Khoa Nội';
    const ngay = req.query.ngay || new Date().toISOString().split('T')[0];
    const [orders] = await db.query(`
      SELECT yl.*, t.ten_thuoc, t.ham_luong, t.don_vi_tinh, bn.ho_ten, d.khoa
      FROM y_lenh yl
      JOIN thuoc t ON yl.thuoc_id = t.id
      JOIN dot_dieu_tri d ON yl.dot_dieu_tri_id = d.id
      JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
      WHERE yl.trang_thai = 'chua_linh' AND d.khoa = ? AND yl.ngay_y_lenh = ?
      ORDER BY bn.ho_ten, t.ten_thuoc
    `, [khoa, ngay]);
    const [phieuLinh] = await db.query(`
      SELECT pl.*, nd.ho_ten as nguoi_lap FROM phieu_linh pl
      JOIN nguoi_dung nd ON pl.nguoi_lap_id = nd.id
      WHERE pl.khoa = ? ORDER BY pl.ngay_lap DESC LIMIT 10
    `, [khoa]);
    res.render('inpatient/medical-orders', { title: 'Tổng hợp Y lệnh', orders, phieuLinh, khoa, ngay });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/dashboard'); }
});

router.post('/tong-hop', isAuthenticated, authorize('dieu_duong'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { khoa, selected_orders } = req.body;
    const orderIds = Array.isArray(selected_orders) ? selected_orders : [selected_orders];
    if (!orderIds || orderIds.length === 0) { req.flash('error', 'Vui lòng chọn ít nhất 1 y lệnh'); return res.redirect('/y-lenh'); }

    // Tạo phiếu lĩnh
    const [result] = await conn.query('INSERT INTO phieu_linh SET ?', { khoa, nguoi_lap_id: req.session.user.id });
    const phieuLinhId = result.insertId;

    // Gom nhóm theo thuốc
    const [orders] = await conn.query('SELECT thuoc_id, SUM(so_luong) as tong FROM y_lenh WHERE id IN (?) GROUP BY thuoc_id', [orderIds]);
    for (const order of orders) {
      await conn.query('INSERT INTO chi_tiet_phieu_linh (phieu_linh_id, thuoc_id, so_luong_yeu_cau) VALUES (?,?,?)',
        [phieuLinhId, order.thuoc_id, order.tong]);
    }

    // Liên kết y lệnh
    for (const orderId of orderIds) {
      await conn.query('INSERT INTO phieu_linh_y_lenh (phieu_linh_id, y_lenh_id) VALUES (?,?)', [phieuLinhId, orderId]);
    }

    await conn.query("UPDATE y_lenh SET trang_thai = 'dang_cho_duyet' WHERE id IN (?)", [orderIds]);
    await conn.commit();
    req.flash('success', 'Đã tạo phiếu lĩnh thuốc và gửi tới Kho dược');
    res.redirect('/y-lenh');
  } catch (err) { await conn.rollback(); console.error(err); req.flash('error', 'Lỗi: ' + err.message); res.redirect('/y-lenh'); }
  finally { conn.release(); }
});

module.exports = router;
