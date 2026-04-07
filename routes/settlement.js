const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated, authorize } = require('../middleware/authMiddleware');

router.get('/', isAuthenticated, authorize('ke_toan'), async (req, res) => {
  try {
    const tuNgay = req.query.tu_ngay || '';
    const denNgay = req.query.den_ngay || '';
    const loaiHinh = req.query.loai_hinh || '';
    let data = [];
    if (tuNgay && denNgay) {
      let sql = `SELECT cp.nguon, t.ten_thuoc, t.don_vi_tinh,
        SUM(cp.so_luong) as tong_sl, AVG(cp.don_gia) as don_gia,
        SUM(cp.so_luong * cp.don_gia) as tong_tien,
        SUM(cp.tien_bhyt) as tong_bhyt, SUM(cp.tien_bn_cung_tra) as tong_bncct,
        SUM(cp.tien_bn_tu_tuc) as tong_bntt
        FROM chi_phi_bhyt cp JOIN thuoc t ON cp.thuoc_id = t.id
        WHERE cp.ngay_ghi_nhan BETWEEN ? AND ?`;
      const params = [tuNgay, denNgay + ' 23:59:59'];
      if (loaiHinh) { sql += ' AND cp.nguon = ?'; params.push(loaiHinh); }
      sql += ' GROUP BY cp.thuoc_id, cp.nguon ORDER BY t.ten_thuoc';
      [data] = await db.query(sql, params);
    }
    const tongDoanhThu = data.reduce((s, d) => s + parseFloat(d.tong_tien || 0), 0);
    const tongBHYT = data.reduce((s, d) => s + parseFloat(d.tong_bhyt || 0), 0);
    res.render('reports/settlement', { title: 'Quyết toán BHYT', data, tuNgay, denNgay, loaiHinh, tongDoanhThu, tongBHYT });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/dashboard'); }
});

module.exports = router;
