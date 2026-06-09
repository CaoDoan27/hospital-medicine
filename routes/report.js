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
        // Báo cáo Nhập - Xuất - Tồn (đầy đủ các loại biến động)
        const [data] = await db.query(`
          SELECT t.ten_thuoc, t.don_vi_tinh, t.ham_luong,
            -- Tồn đầu kỳ = Tồn hiện tại - SUM(nhập sau tuNgay) + SUM(xuất sau tuNgay)
            COALESCE((SELECT SUM(l.so_luong_ton) FROM lo_thuoc l WHERE l.thuoc_id = t.id AND l.kho_id = ?), 0)
              - COALESCE(SUM(CASE WHEN bd.loai_bien_dong IN ('nhap','nhap_dieu_chuyen','kiem_ke_tang','hoan_ung')
                  AND bd.ngay_bien_dong >= ? THEN bd.so_luong ELSE 0 END), 0)
              + COALESCE(SUM(CASE WHEN bd.loai_bien_dong IN ('xuat_cap_phat','xuat_dieu_chuyen','xuat_tu_truc','kiem_ke_giam')
                  AND bd.ngay_bien_dong >= ? THEN bd.so_luong ELSE 0 END), 0)
            as ton_dau_ky,
            -- Nhập trong kỳ (tất cả loại nhập)
            COALESCE(SUM(CASE WHEN bd.loai_bien_dong IN ('nhap','nhap_dieu_chuyen','kiem_ke_tang','hoan_ung')
              AND bd.ngay_bien_dong BETWEEN ? AND ? THEN bd.so_luong ELSE 0 END), 0) as nhap,
            -- Xuất trong kỳ (tất cả loại xuất)
            COALESCE(SUM(CASE WHEN bd.loai_bien_dong IN ('xuat_cap_phat','xuat_dieu_chuyen','xuat_tu_truc','kiem_ke_giam')
              AND bd.ngay_bien_dong BETWEEN ? AND ? THEN bd.so_luong ELSE 0 END), 0) as xuat,
            -- Tồn cuối kỳ = tồn đầu kỳ + nhập - xuất (tính lại ở client hoặc dùng subquery)
            COALESCE((SELECT SUM(l.so_luong_ton) FROM lo_thuoc l WHERE l.thuoc_id = t.id AND l.kho_id = ?), 0)
              - COALESCE(SUM(CASE WHEN bd.loai_bien_dong IN ('nhap','nhap_dieu_chuyen','kiem_ke_tang','hoan_ung')
                  AND bd.ngay_bien_dong > ? THEN bd.so_luong ELSE 0 END), 0)
              + COALESCE(SUM(CASE WHEN bd.loai_bien_dong IN ('xuat_cap_phat','xuat_dieu_chuyen','xuat_tu_truc','kiem_ke_giam')
                  AND bd.ngay_bien_dong > ? THEN bd.so_luong ELSE 0 END), 0)
            as ton_cuoi
          FROM thuoc t
          LEFT JOIN bien_dong_kho bd ON t.id = bd.thuoc_id AND bd.kho_id = ?
          WHERE t.trang_thai = 1
          GROUP BY t.id HAVING nhap > 0 OR xuat > 0 OR ton_cuoi > 0
          ORDER BY t.ten_thuoc
        `, [khoId, tuNgay, tuNgay, tuNgay, denNgay + ' 23:59:59', tuNgay, denNgay + ' 23:59:59', khoId, denNgay + ' 23:59:59', denNgay + ' 23:59:59', khoId]);
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
