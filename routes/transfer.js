const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated, authorize } = require('../middleware/authMiddleware');
const FefoService = require('../services/fefoService');

// Danh sách phiếu điều chuyển
router.get('/', isAuthenticated, authorize('duoc_si_tong', 'duoc_si_kho_le'), async (req, res) => {
  try {
    const [transfers] = await db.query(`
      SELECT p.*, kx.ten_kho as kho_xuat, kn.ten_kho as kho_nhan,
        nl.ho_ten as nguoi_lap_ten, nd.ho_ten as nguoi_duyet_ten
      FROM phieu_dieu_chuyen p
      JOIN kho kx ON p.kho_xuat_id = kx.id
      JOIN kho kn ON p.kho_nhan_id = kn.id
      JOIN nguoi_dung nl ON p.nguoi_lap_id = nl.id
      LEFT JOIN nguoi_dung nd ON p.nguoi_duyet_id = nd.id
      ORDER BY p.ngay_lap DESC
    `);
    res.render('transfer/index', { title: 'Điều chuyển nội bộ', transfers });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi tải dữ liệu'); res.redirect('/dashboard'); }
});

// Form tạo phiếu dự trù (Kho lẻ)
router.get('/tao', isAuthenticated, authorize('duoc_si_kho_le'), async (req, res) => {
  try {
    const [drugs] = await db.query(`
      SELECT t.id, t.ten_thuoc, t.ham_luong, t.don_vi_tinh,
        COALESCE(SUM(l.so_luong_ton), 0) as ton_kho_tong
      FROM thuoc t
      LEFT JOIN lo_thuoc l ON t.id = l.thuoc_id AND l.kho_id = 1 AND l.han_dung > CURDATE()
      WHERE t.trang_thai = 1
      GROUP BY t.id ORDER BY t.ten_thuoc
    `);
    const [warehouses] = await db.query("SELECT * FROM kho WHERE loai_kho IN ('kho_le_ngoai_tru','kho_le_noi_tru','tu_truc')");
    res.render('transfer/form', { title: 'Lập phiếu dự trù', drugs, warehouses });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/dieu-chuyen'); }
});

// Lưu phiếu dự trù
router.post('/luu', isAuthenticated, authorize('duoc_si_kho_le'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { kho_nhan_id, ghi_chu, items } = req.body;
    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
    if (!parsedItems || parsedItems.length === 0) { req.flash('error', 'Phiếu phải có ít nhất 1 thuốc'); return res.redirect('/dieu-chuyen/tao'); }

    const [result] = await conn.query('INSERT INTO phieu_dieu_chuyen SET ?', {
      loai_phieu: 'DIEU_CHUYEN', kho_xuat_id: 1, kho_nhan_id,
      nguoi_lap_id: req.session.user.id, trang_thai: 'cho_duyet', ghi_chu
    });

    for (const item of parsedItems) {
      await conn.query('INSERT INTO chi_tiet_dieu_chuyen (phieu_id, thuoc_id, so_luong_yeu_cau) VALUES (?, ?, ?)',
        [result.insertId, item.thuoc_id, parseInt(item.so_luong)]);
    }

    await conn.commit();
    req.flash('success', 'Đã gửi yêu cầu tới Kho tổng');
    res.redirect('/dieu-chuyen');
  } catch (err) { await conn.rollback(); console.error(err); req.flash('error', 'Lỗi: ' + err.message); res.redirect('/dieu-chuyen/tao'); }
  finally { conn.release(); }
});

// Duyệt xuất (Kho tổng)
router.post('/duyet/:id', isAuthenticated, authorize('duoc_si_tong'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const phieuId = req.params.id;
    const [details] = await conn.query(`
      SELECT cd.*, t.ten_thuoc FROM chi_tiet_dieu_chuyen cd
      JOIN thuoc t ON cd.thuoc_id = t.id WHERE cd.phieu_id = ?`, [phieuId]);

    for (const item of details) {
      const result = await FefoService.allocate(item.thuoc_id, 1, item.so_luong_yeu_cau);
      if (!result.success) {
        await conn.rollback();
        req.flash('error', `Kho tổng không đủ số lượng tồn cho ${item.ten_thuoc}`);
        return res.redirect('/dieu-chuyen');
      }
      await FefoService.deductStock(conn, result.allocation);
      const totalExported = result.allocation.reduce((s, a) => s + a.so_luong_xuat, 0);
      await conn.query('UPDATE chi_tiet_dieu_chuyen SET so_luong_thuc_xuat = ?, so_lo = ?, han_dung = ? WHERE id = ?',
        [totalExported, result.allocation[0].so_lo, result.allocation[0].han_dung, item.id]);

      await conn.query('INSERT INTO bien_dong_kho SET ?', {
        kho_id: 1, thuoc_id: item.thuoc_id, loai_bien_dong: 'xuat_dieu_chuyen',
        so_luong: totalExported, phieu_lien_quan: `DC-${phieuId}`, nguoi_thuc_hien_id: req.session.user.id
      });
    }

    await conn.query("UPDATE phieu_dieu_chuyen SET trang_thai = 'dang_van_chuyen', nguoi_duyet_id = ?, ngay_duyet = NOW() WHERE id = ?",
      [req.session.user.id, phieuId]);
    await conn.commit();
    req.flash('success', 'Duyệt xuất thành công');
  } catch (err) { await conn.rollback(); console.error(err); req.flash('error', 'Lỗi duyệt: ' + err.message); }
  finally { conn.release(); }
  res.redirect('/dieu-chuyen');
});

// Xác nhận nhập kho (Kho lẻ)
router.post('/xac-nhan/:id', isAuthenticated, authorize('duoc_si_kho_le'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const phieuId = req.params.id;
    const [phieu] = await conn.query('SELECT * FROM phieu_dieu_chuyen WHERE id = ?', [phieuId]);
    const [details] = await conn.query('SELECT * FROM chi_tiet_dieu_chuyen WHERE phieu_id = ?', [phieuId]);

    for (const item of details) {
      if (item.so_luong_thuc_xuat > 0) {
        const [existingLot] = await conn.query('SELECT id FROM lo_thuoc WHERE thuoc_id = ? AND so_lo = ? AND kho_id = ?',
          [item.thuoc_id, item.so_lo, phieu[0].kho_nhan_id]);
        if (existingLot.length > 0) {
          await conn.query('UPDATE lo_thuoc SET so_luong_ton = so_luong_ton + ? WHERE id = ?', [item.so_luong_thuc_xuat, existingLot[0].id]);
        } else {
          await conn.query('INSERT INTO lo_thuoc SET ?', {
            thuoc_id: item.thuoc_id, so_lo: item.so_lo, han_dung: item.han_dung,
            gia_nhap: 0, kho_id: phieu[0].kho_nhan_id, so_luong_ton: item.so_luong_thuc_xuat
          });
        }
        await conn.query('INSERT INTO bien_dong_kho SET ?', {
          kho_id: phieu[0].kho_nhan_id, thuoc_id: item.thuoc_id, loai_bien_dong: 'nhap_dieu_chuyen',
          so_luong: item.so_luong_thuc_xuat, phieu_lien_quan: `DC-${phieuId}`, nguoi_thuc_hien_id: req.session.user.id
        });
      }
    }

    await conn.query("UPDATE phieu_dieu_chuyen SET trang_thai = 'hoan_thanh' WHERE id = ?", [phieuId]);
    await conn.commit();
    req.flash('success', 'Nhập kho lẻ thành công. Tồn kho đã cập nhật.');
  } catch (err) { await conn.rollback(); console.error(err); req.flash('error', 'Lỗi: ' + err.message); }
  finally { conn.release(); }
  res.redirect('/dieu-chuyen');
});

module.exports = router;
