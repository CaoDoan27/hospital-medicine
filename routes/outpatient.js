const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated, authorize } = require('../middleware/authMiddleware');
const BhytService = require('../services/bhytService');
const FefoService = require('../services/fefoService');

// Trang cấp phát ngoại trú
router.get('/', isAuthenticated, authorize('duoc_si_kho_le'), async (req, res) => {
  try {
    const [prescriptions] = await db.query(`
      SELECT dt.*, bn.ho_ten, bn.so_the_bhyt, bn.ngay_sinh, d.chan_doan_lam_sang, d.ma_benh, d.muc_huong
      FROM don_thuoc dt
      JOIN dot_dieu_tri d ON dt.dot_dieu_tri_id = d.id
      JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
      WHERE d.loai_hinh = 'ngoai_tru' AND dt.trang_thai = 'moi'
      ORDER BY dt.ngay_ke DESC
    `);
    res.render('outpatient/index', { title: 'Cấp phát Ngoại trú', prescriptions });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/dashboard'); }
});

// Chi tiết đơn thuốc & tính BHYT
router.get('/don/:id', isAuthenticated, authorize('duoc_si_kho_le'), async (req, res) => {
  try {
    const [prescription] = await db.query(`
      SELECT dt.*, bn.*, d.ma_benh, d.chan_doan_lam_sang, d.muc_huong, d.id as dot_dieu_tri_id
      FROM don_thuoc dt
      JOIN dot_dieu_tri d ON dt.dot_dieu_tri_id = d.id
      JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
      WHERE dt.id = ?
    `, [req.params.id]);
    if (!prescription.length) { req.flash('error', 'Không tìm thấy đơn'); return res.redirect('/cap-phat-ngoai-tru'); }

    const rx = prescription[0];
    // Kiểm tra BHYT
    const insuranceData = await BhytService.checkInsuranceCard(rx.so_the_bhyt);
    const mucHuong = await BhytService.determineCoverageRate(rx, rx.ma_benh, insuranceData);

    // Lấy thuốc trong kho lẻ ngoại trú
    const [drugs] = await db.query(`
      SELECT t.*, COALESCE(SUM(l.so_luong_ton),0) as ton_kho FROM thuoc t
      LEFT JOIN lo_thuoc l ON t.id = l.thuoc_id AND l.kho_id = 2 AND l.han_dung > CURDATE()
      WHERE t.trang_thai = 1 GROUP BY t.id ORDER BY t.ten_thuoc
    `);

    res.render('outpatient/dispense', {
      title: 'Cấp phát đơn thuốc', rx, insuranceData, mucHuong, drugs
    });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/cap-phat-ngoai-tru'); }
});

// Xác nhận cấp phát
router.post('/cap-phat', isAuthenticated, authorize('duoc_si_kho_le'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { don_thuoc_id, muc_huong, items } = req.body;
    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;

    const [rx] = await conn.query(`
      SELECT dt.*, d.id as dot_id, d.ma_benh FROM don_thuoc dt
      JOIN dot_dieu_tri d ON dt.dot_dieu_tri_id = d.id WHERE dt.id = ?
    `, [don_thuoc_id]);

    for (const item of parsedItems) {
      const thuocId = parseInt(item.thuoc_id);
      const soLuong = parseInt(item.so_luong);
      const [drug] = await conn.query('SELECT * FROM thuoc WHERE id = ?', [thuocId]);

      // FEFO deduction
      const allocation = await FefoService.allocate(thuocId, 2, soLuong);
      if (!allocation.success) { await conn.rollback(); req.flash('error', `Số lượng tồn kho không đủ để cấp phát ${drug[0].ten_thuoc}`); return res.redirect(`/cap-phat-ngoai-tru/don/${don_thuoc_id}`); }

      // Trừ kho
      await FefoService.deductStock(conn, allocation.allocation);

      // Tính chi phí BHYT
      const costSplit = BhytService.calculateCostSplit(soLuong, drug[0].don_gia_thau, drug[0].don_gia_thau, drug[0].ty_le_thanh_toan, parseInt(muc_huong));

      // Insert chi tiết cấp phát
      await conn.query('INSERT INTO chi_tiet_cap_phat SET ?', {
        don_thuoc_id, thuoc_id: thuocId, lo_thuoc_id: allocation.allocation[0].lo_thuoc_id,
        kho_xuat_id: 2, so_luong_phat: soLuong, don_gia: drug[0].don_gia_thau,
        tien_bhyt_chi_tra: costSplit.tien_bhyt, tien_bn_dong_chi_tra: costSplit.tien_bn_cung_tra,
        tien_bn_tu_tuc: costSplit.tien_bn_tu_tuc, nguoi_cap_phat_id: req.session.user.id
      });

      // Insert chi phí BHYT
      await conn.query('INSERT INTO chi_phi_bhyt SET ?', {
        dot_dieu_tri_id: rx[0].dot_id, thuoc_id: thuocId, so_luong: soLuong,
        don_gia: drug[0].don_gia_thau, ty_le_tt: drug[0].ty_le_thanh_toan,
        muc_huong: parseInt(muc_huong), tien_bhyt: costSplit.tien_bhyt,
        tien_bn_cung_tra: costSplit.tien_bn_cung_tra, tien_bn_tu_tuc: costSplit.tien_bn_tu_tuc,
        nguon: 'ngoai_tru'
      });

      // Biến động kho
      await conn.query('INSERT INTO bien_dong_kho SET ?', {
        kho_id: 2, thuoc_id: thuocId, loai_bien_dong: 'xuat_cap_phat',
        so_luong: soLuong, phieu_lien_quan: `DT-${don_thuoc_id}`, nguoi_thuc_hien_id: req.session.user.id
      });
    }

    await conn.query("UPDATE don_thuoc SET trang_thai = 'da_cap_phat' WHERE id = ?", [don_thuoc_id]);
    await conn.commit();
    req.flash('success', 'Cấp phát thành công. Đã trừ kho và ghi nhận chi phí BHYT.');
    res.redirect('/cap-phat-ngoai-tru');
  } catch (err) { await conn.rollback(); console.error(err); req.flash('error', 'Lỗi: ' + err.message); res.redirect('/cap-phat-ngoai-tru'); }
  finally { conn.release(); }
});

module.exports = router;
