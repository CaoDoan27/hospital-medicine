const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated, authorize } = require('../middleware/authMiddleware');

// Trang kiểm kê & cảnh báo
router.get('/', isAuthenticated, authorize('duoc_si_tong', 'duoc_si_kho_le'), async (req, res) => {
  try {
    const [warehouses] = await db.query('SELECT * FROM kho ORDER BY id');
    const khoId = req.query.kho_id || 1;
    // Cảnh báo sắp hết hạn
    const [expiringDrugs] = await db.query(`
      SELECT t.ten_thuoc, t.don_vi_tinh, l.so_lo, l.han_dung, l.so_luong_ton, k.ten_kho
      FROM lo_thuoc l JOIN thuoc t ON l.thuoc_id = t.id JOIN kho k ON l.kho_id = k.id
      WHERE l.kho_id = ? AND l.so_luong_ton > 0
        AND (l.han_dung <= DATE_ADD(CURDATE(), INTERVAL 6 MONTH))
      ORDER BY l.han_dung ASC
    `, [khoId]);
    // Cảnh báo sắp hết tồn
    const [lowStock] = await db.query(`
      SELECT t.ten_thuoc, t.don_vi_tinh, t.dinh_muc_toi_thieu, COALESCE(SUM(l.so_luong_ton),0) as tong_ton
      FROM thuoc t LEFT JOIN lo_thuoc l ON t.id = l.thuoc_id AND l.kho_id = ?
      WHERE t.trang_thai = 1 GROUP BY t.id HAVING tong_ton < t.dinh_muc_toi_thieu ORDER BY tong_ton
    `, [khoId]);
    // Lịch sử kiểm kê
    const [sessions] = await db.query(`
      SELECT kk.*, k.ten_kho, nd.ho_ten FROM kiem_ke kk
      JOIN kho k ON kk.kho_id = k.id JOIN nguoi_dung nd ON kk.nguoi_kiem_ke_id = nd.id
      ORDER BY kk.ngay_bat_dau DESC LIMIT 10
    `);
    res.render('inventory/index', { title: 'Kiểm kê & Cảnh báo tồn kho', warehouses, expiringDrugs, lowStock, sessions, khoId: parseInt(khoId) });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/dashboard'); }
});

// Bắt đầu kiểm kê
router.post('/bat-dau', isAuthenticated, authorize('duoc_si_tong', 'duoc_si_kho_le'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { kho_id } = req.body;
    // Khóa kho
    await conn.query("UPDATE kho SET trang_thai_kho = 'dang_kiem_ke' WHERE id = ?", [kho_id]);
    // Tạo phiên kiểm kê
    const [result] = await conn.query('INSERT INTO kiem_ke SET ?', { kho_id, nguoi_kiem_ke_id: req.session.user.id });
    // Chốt số liệu tồn kho
    const [lots] = await conn.query('SELECT * FROM lo_thuoc WHERE kho_id = ? AND so_luong_ton > 0', [kho_id]);
    for (const lot of lots) {
      await conn.query('INSERT INTO chi_tiet_kiem_ke (kiem_ke_id, thuoc_id, lo_thuoc_id, so_lo, so_luong_he_thong) VALUES (?,?,?,?,?)',
        [result.insertId, lot.thuoc_id, lot.id, lot.so_lo, lot.so_luong_ton]);
    }
    await conn.commit();
    req.flash('success', 'Đã bắt đầu kiểm kê. Kho đã được khóa.');
    res.redirect(`/kiem-ke/thuc-hien/${result.insertId}`);
  } catch (err) { await conn.rollback(); console.error(err); req.flash('error', 'Lỗi'); res.redirect('/kiem-ke'); }
  finally { conn.release(); }
});

// Trang thực hiện kiểm kê
router.get('/thuc-hien/:id', isAuthenticated, async (req, res) => {
  try {
    const [session] = await db.query('SELECT kk.*, k.ten_kho FROM kiem_ke kk JOIN kho k ON kk.kho_id = k.id WHERE kk.id = ?', [req.params.id]);
    const [details] = await db.query(`
      SELECT ck.*, t.ten_thuoc, t.don_vi_tinh FROM chi_tiet_kiem_ke ck
      JOIN thuoc t ON ck.thuoc_id = t.id WHERE ck.kiem_ke_id = ? ORDER BY t.ten_thuoc
    `, [req.params.id]);
    res.render('inventory/check', { title: 'Thực hiện kiểm kê', session: session[0], details });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/kiem-ke'); }
});

// Hoàn tất kiểm kê
router.post('/hoan-tat/:id', isAuthenticated, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const kiemKeId = req.params.id;
    const { items } = req.body;
    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;

    const [session] = await conn.query('SELECT * FROM kiem_ke WHERE id = ?', [kiemKeId]);

    for (const item of parsedItems) {
      const slThucTe = parseInt(item.so_luong_thuc_te);
      if (isNaN(slThucTe) || slThucTe < 0) continue;
      await conn.query('UPDATE chi_tiet_kiem_ke SET so_luong_thuc_te = ? WHERE id = ?', [slThucTe, item.id]);
      // Cập nhật tồn kho
      if (item.lo_thuoc_id) {
        const [lot] = await conn.query('SELECT so_luong_ton FROM lo_thuoc WHERE id = ?', [item.lo_thuoc_id]);
        await conn.query('UPDATE lo_thuoc SET so_luong_ton = ? WHERE id = ?', [slThucTe, item.lo_thuoc_id]);
        const diff = slThucTe - (lot[0]?.so_luong_ton || 0);
        if (diff !== 0) {
          await conn.query('INSERT INTO bien_dong_kho SET ?', {
            kho_id: session[0].kho_id, thuoc_id: item.thuoc_id,
            loai_bien_dong: diff > 0 ? 'kiem_ke_tang' : 'kiem_ke_giam',
            so_luong: Math.abs(diff), phieu_lien_quan: `KK-${kiemKeId}`,
            nguoi_thuc_hien_id: req.session.user.id
          });
        }
      }
    }

    await conn.query("UPDATE kiem_ke SET trang_thai = 'hoan_thanh', ngay_ket_thuc = NOW() WHERE id = ?", [kiemKeId]);
    await conn.query("UPDATE kho SET trang_thai_kho = 'binh_thuong' WHERE id = ?", [session[0].kho_id]);
    await conn.commit();
    req.flash('success', 'Hoàn tất kiểm kê và đã điều chỉnh tồn kho');
  } catch (err) { await conn.rollback(); console.error(err); req.flash('error', 'Lỗi: ' + err.message); }
  finally { conn.release(); }
  res.redirect('/kiem-ke');
});

module.exports = router;
