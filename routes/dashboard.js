const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated } = require('../middleware/authMiddleware');

router.get('/', isAuthenticated, async (req, res) => {
  try {
    // Thống kê tổng quan
    const [drugCount] = await db.query('SELECT COUNT(*) as total FROM thuoc WHERE trang_thai = 1');
    const [patientCount] = await db.query('SELECT COUNT(*) as total FROM benh_nhan');
    const [importToday] = await db.query('SELECT COUNT(*) as total FROM phieu_nhap_kho WHERE DATE(ngay_lap) = CURDATE()');
    const [dispenseToday] = await db.query("SELECT COUNT(*) as total FROM don_thuoc WHERE DATE(ngay_ke) = CURDATE() AND trang_thai = 'da_cap_phat'");
    
    // Thuốc sắp hết hạn (< 6 tháng)
    const [expiringDrugs] = await db.query(`
      SELECT t.ten_thuoc, l.so_lo, l.han_dung, l.so_luong_ton, k.ten_kho
      FROM lo_thuoc l
      JOIN thuoc t ON l.thuoc_id = t.id
      JOIN kho k ON l.kho_id = k.id
      WHERE l.han_dung <= DATE_ADD(CURDATE(), INTERVAL 6 MONTH)
        AND l.so_luong_ton > 0
      ORDER BY l.han_dung ASC LIMIT 10
    `);
    
    // Thuốc sắp hết tồn
    const [lowStockDrugs] = await db.query(`
      SELECT t.ten_thuoc, t.don_vi_tinh, t.dinh_muc_toi_thieu,
        COALESCE(SUM(l.so_luong_ton), 0) as tong_ton
      FROM thuoc t
      LEFT JOIN lo_thuoc l ON t.id = l.thuoc_id
      WHERE t.trang_thai = 1
      GROUP BY t.id
      HAVING tong_ton < t.dinh_muc_toi_thieu
      ORDER BY tong_ton ASC LIMIT 10
    `);

    // Bệnh nhân nội trú đang điều trị
    const [inpatients] = await db.query(`
      SELECT bn.ho_ten, d.khoa, d.ngay_vao, d.chan_doan_lam_sang
      FROM dot_dieu_tri d
      JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
      WHERE d.loai_hinh = 'noi_tru' AND d.trang_thai = 'dang_dieu_tri'
      ORDER BY d.ngay_vao DESC LIMIT 10
    `);

    res.render('dashboard/index', {
      title: 'Tổng quan',
      stats: {
        drugs: drugCount[0].total,
        patients: patientCount[0].total,
        importsToday: importToday[0].total,
        dispensedToday: dispenseToday[0].total
      },
      expiringDrugs,
      lowStockDrugs,
      inpatients
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Lỗi tải dữ liệu tổng quan');
    res.render('dashboard/index', { title: 'Tổng quan', stats: {}, expiringDrugs: [], lowStockDrugs: [], inpatients: [] });
  }
});

module.exports = router;
