const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated, authorize } = require('../middleware/authMiddleware');
const FefoService = require('../services/fefoService');
const { recordStockMovement } = require('../utils/stockMovement');

// Lập yêu cầu hoàn ứng (Điều dưỡng)
router.get('/yeu-cau', isAuthenticated, authorize('dieu_duong'), async (req, res) => {
  try {
    const khoId = req.session.user.kho_id;
    if (!khoId) { req.flash('error', 'Tài khoản của bạn chưa được phân công quản lý tủ trực'); return res.redirect('/dashboard'); }

    const [khoTuTruc] = await db.query("SELECT * FROM kho WHERE id = ?", [khoId]);
    if (!khoTuTruc.length || khoTuTruc[0].loai_kho !== 'tu_truc') { req.flash('error', 'Kho được phân công không hợp lệ hoặc không phải tủ trực'); return res.redirect('/dashboard'); }

    const khoa = khoTuTruc[0].khoa;
    const [pendingItems] = await db.query(`
      SELECT h.thuoc_id, t.ten_thuoc, t.don_vi_tinh, SUM(h.so_luong) as tong_sl
      FROM hang_cho_hoan_ung h JOIN thuoc t ON h.thuoc_id = t.id
      WHERE h.kho_tu_truc_id = ? AND h.trang_thai = 'cho_lap_phieu'
      GROUP BY h.thuoc_id ORDER BY t.ten_thuoc
    `, [khoId]);
    const [existingRequests] = await db.query(`
      SELECT phu.*, nd.ho_ten as nguoi_lap FROM phieu_hoan_ung phu
      JOIN nguoi_dung nd ON phu.nguoi_lap_id = nd.id
      WHERE phu.kho_tu_truc_id = ? ORDER BY phu.ngay_lap DESC LIMIT 10
    `, [khoId]);
    res.render('inpatient/replenishment-request', { title: 'Lập yêu cầu hoàn ứng', pendingItems, existingRequests, khoa, khoId });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/dashboard'); }
});

router.post('/yeu-cau/luu', isAuthenticated, authorize('dieu_duong'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { kho_id, khoa, items } = req.body;
    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
    const [result] = await conn.query('INSERT INTO phieu_hoan_ung SET ?', {
      kho_tu_truc_id: kho_id, khoa_yeu_cau: khoa, nguoi_lap_id: req.session.user.id
    });
    const thuocIds = [];
    for (const item of parsedItems) {
      await conn.query('INSERT INTO chi_tiet_phieu_hoan_ung (phieu_hoan_ung_id, thuoc_id, so_luong_yeu_cau) VALUES (?,?,?)',
        [result.insertId, item.thuoc_id, parseInt(item.so_luong)]);
      thuocIds.push(item.thuoc_id);
    }
    if (thuocIds.length > 0) {
      await conn.query("UPDATE hang_cho_hoan_ung SET trang_thai = 'da_lap_phieu' WHERE kho_tu_truc_id = ? AND trang_thai = 'cho_lap_phieu' AND thuoc_id IN (?)", [kho_id, thuocIds]);
    }
    await conn.commit();
    req.flash('success', 'Đã gửi yêu cầu hoàn ứng');
  } catch (err) { await conn.rollback(); console.error(err); req.flash('error', 'Lỗi: ' + err.message); }
  finally { conn.release(); }
  res.redirect('/hoan-ung/yeu-cau');
});

// Duyệt hoàn ứng (Dược sĩ Kho lẻ)
router.get('/duyet', isAuthenticated, authorize('duoc_si_kho_le'), async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT phu.*, k.ten_kho, nd.ho_ten as nguoi_lap FROM phieu_hoan_ung phu
      JOIN kho k ON phu.kho_tu_truc_id = k.id JOIN nguoi_dung nd ON phu.nguoi_lap_id = nd.id
      WHERE phu.trang_thai = 'cho_duyet' ORDER BY phu.ngay_lap DESC
    `);
    res.render('inpatient/replenishment-approval', { title: 'Duyệt hoàn ứng', requests });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/dashboard'); }
});

router.post('/duyet/xac-nhan/:id', isAuthenticated, authorize('duoc_si_kho_le'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const phieuId = req.params.id;
    const [phieu] = await conn.query('SELECT * FROM phieu_hoan_ung WHERE id = ?', [phieuId]);
    const [details] = await conn.query('SELECT * FROM chi_tiet_phieu_hoan_ung WHERE phieu_hoan_ung_id = ?', [phieuId]);

    // Tìm kho lẻ nội trú động từ DB thay vì hard-code
    const khoNoiTruId = req.session.user.kho_id;
    const [khoNoiTru] = await conn.query("SELECT id, trang_thai_kho FROM kho WHERE id = ? AND loai_kho = 'kho_le_noi_tru'", [khoNoiTruId]);
    if (!khoNoiTru.length) { await conn.rollback(); req.flash('error', 'Không tìm thấy kho lẻ nội trú'); return res.redirect('/hoan-ung/duyet'); }

    // Kiểm tra kho đang kiểm kê
    if (khoNoiTru[0].trang_thai_kho === 'dang_kiem_ke') {
      await conn.rollback();
      req.flash('error', 'Kho lẻ nội trú đang kiểm kê, không thể duyệt hoàn ứng');
      return res.redirect('/hoan-ung/duyet');
    }

    for (const item of details) {
      const allocation = await FefoService.allocate(item.thuoc_id, khoNoiTruId, item.so_luong_yeu_cau, conn);
      if (!allocation.success) { await conn.rollback(); req.flash('error', 'Kho nội trú không đủ thuốc'); return res.redirect('/hoan-ung/duyet'); }
      await FefoService.deductStock(conn, allocation.allocation);

      // Ghi biến động kho xuất tại kho nội trú (nguồn xuất)
      await recordStockMovement(conn, {
        kho_id: khoNoiTruId, thuoc_id: item.thuoc_id, loai_bien_dong: 'hoan_ung',
        so_luong: item.so_luong_yeu_cau, phieu_lien_quan: `HU-${phieuId}`, nguoi_thuc_hien_id: req.session.user.id
      });

      // Add to cabinet stock
      const [existing] = await conn.query('SELECT id FROM ton_kho_tu_truc WHERE kho_id = ? AND thuoc_id = ?', [phieu[0].kho_tu_truc_id, item.thuoc_id]);
      if (existing.length > 0) {
        await conn.query('UPDATE ton_kho_tu_truc SET so_luong_ton = so_luong_ton + ? WHERE id = ?', [item.so_luong_yeu_cau, existing[0].id]);
      } else {
        await conn.query('INSERT INTO ton_kho_tu_truc SET ?', { kho_id: phieu[0].kho_tu_truc_id, thuoc_id: item.thuoc_id, so_luong_ton: item.so_luong_yeu_cau });
      }
      await conn.query('UPDATE chi_tiet_phieu_hoan_ung SET so_luong_thuc_xuat = ? WHERE id = ?', [item.so_luong_yeu_cau, item.id]);
      await recordStockMovement(conn, {
        kho_id: phieu[0].kho_tu_truc_id, thuoc_id: item.thuoc_id, loai_bien_dong: 'hoan_ung',
        so_luong: item.so_luong_yeu_cau, phieu_lien_quan: `HU-${phieuId}`, nguoi_thuc_hien_id: req.session.user.id
      });
    }

    await conn.query("UPDATE phieu_hoan_ung SET trang_thai = 'da_hoan_thanh', nguoi_duyet_id = ?, ngay_duyet = NOW() WHERE id = ?",
      [req.session.user.id, phieuId]);
    const thuocIds = details.map(d => d.thuoc_id);
    if (thuocIds.length > 0) {
      await conn.query("UPDATE hang_cho_hoan_ung SET trang_thai = 'da_hoan_ung' WHERE kho_tu_truc_id = ? AND trang_thai = 'da_lap_phieu' AND thuoc_id IN (?)",
        [phieu[0].kho_tu_truc_id, thuocIds]);
    }
    await conn.commit();
    req.flash('success', 'Hoàn ứng thành công. Tủ trực đã được bổ sung.');
  } catch (err) { await conn.rollback(); console.error(err); req.flash('error', 'Lỗi: ' + err.message); }
  finally { conn.release(); }
  res.redirect('/hoan-ung/duyet');
});

// API: Chi tiết phiếu hoàn ứng
router.get('/api/chi-tiet/:id', isAuthenticated, async (req, res) => {
  try {
    const [phieu] = await db.query(`
      SELECT phu.*, k.ten_kho, nl.ho_ten as nguoi_lap, nd.ho_ten as nguoi_duyet
      FROM phieu_hoan_ung phu
      JOIN kho k ON phu.kho_tu_truc_id = k.id
      JOIN nguoi_dung nl ON phu.nguoi_lap_id = nl.id
      LEFT JOIN nguoi_dung nd ON phu.nguoi_duyet_id = nd.id
      WHERE phu.id = ?
    `, [req.params.id]);
    if (!phieu.length) return res.status(404).json({ success: false, error: 'Không tìm thấy phiếu hoàn ứng' });
    const [details] = await db.query(`
      SELECT ct.*, t.ten_thuoc, t.don_vi_tinh FROM chi_tiet_phieu_hoan_ung ct
      JOIN thuoc t ON ct.thuoc_id = t.id WHERE ct.phieu_hoan_ung_id = ? ORDER BY t.ten_thuoc
    `, [req.params.id]);
    res.json({ success: true, phieu: phieu[0], details });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Lỗi lấy chi tiết phiếu hoàn ứng' });
  }
});

module.exports = router;
