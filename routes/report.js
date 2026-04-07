const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated, authorize } = require('../middleware/authMiddleware');

router.get('/', isAuthenticated, authorize('duoc_si_tong', 'ke_toan'), async (req, res) => {
  try {
    const loai = req.query.loai || 'nxt';
    const khoId = req.query.kho_id || 1;
    const tuNgay = req.query.tu_ngay || '';
    const denNgay = req.query.den_ngay || '';
    const [warehouses] = await db.query('SELECT * FROM kho ORDER BY id');
    let reportData = [];

    if (tuNgay && denNgay) {
      if (loai === 'nxt') {
        // Báo cáo Nhập - Xuất - Tồn
        const [data] = await db.query(`
          SELECT t.ten_thuoc, t.don_vi_tinh, t.ham_luong,
            COALESCE(SUM(CASE WHEN bd.loai_bien_dong = 'nhap' THEN bd.so_luong ELSE 0 END), 0) as nhap,
            COALESCE(SUM(CASE WHEN bd.loai_bien_dong LIKE 'xuat%' THEN bd.so_luong ELSE 0 END), 0) as xuat,
            COALESCE((SELECT SUM(l.so_luong_ton) FROM lo_thuoc l WHERE l.thuoc_id = t.id AND l.kho_id = ?), 0) as ton_cuoi
          FROM thuoc t
          LEFT JOIN bien_dong_kho bd ON t.id = bd.thuoc_id AND bd.kho_id = ?
            AND bd.ngay_bien_dong BETWEEN ? AND ?
          WHERE t.trang_thai = 1
          GROUP BY t.id HAVING nhap > 0 OR xuat > 0 OR ton_cuoi > 0
          ORDER BY t.ten_thuoc
        `, [khoId, khoId, tuNgay, denNgay + ' 23:59:59']);
        reportData = data;
      } else if (loai === 'han_dung') {
        const [data] = await db.query(`
          SELECT t.ten_thuoc, t.don_vi_tinh, l.so_lo, l.han_dung, l.so_luong_ton, k.ten_kho,
            DATEDIFF(l.han_dung, CURDATE()) as ngay_con_lai
          FROM lo_thuoc l JOIN thuoc t ON l.thuoc_id = t.id JOIN kho k ON l.kho_id = k.id
          WHERE l.kho_id = ? AND l.so_luong_ton > 0 ORDER BY l.han_dung ASC
        `, [khoId]);
        reportData = data;
      }
    }

    res.render('reports/index', { title: 'Báo cáo thống kê', warehouses, reportData, loai, khoId: parseInt(khoId), tuNgay, denNgay });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/dashboard'); }
});

module.exports = router;
