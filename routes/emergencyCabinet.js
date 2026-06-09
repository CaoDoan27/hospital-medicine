const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated, authorize } = require('../middleware/authMiddleware');
const BhytService = require('../services/bhytService');
const { recordStockMovement } = require('../utils/stockMovement');

router.get('/', isAuthenticated, authorize('dieu_duong'), async (req, res) => {
  try {
    const khoId = req.session.user.kho_id;
    if (!khoId) { req.flash('error', 'Tài khoản của bạn chưa được phân công quản lý tủ trực'); return res.redirect('/dashboard'); }
    
    const [khoTuTruc] = await db.query("SELECT * FROM kho WHERE id = ?", [khoId]);
    if (!khoTuTruc.length || khoTuTruc[0].loai_kho !== 'tu_truc') { req.flash('error', 'Kho được phân công không hợp lệ hoặc không phải tủ trực'); return res.redirect('/dashboard'); }
    
    const khoa = khoTuTruc[0].khoa;
    const [stock] = await db.query(`
      SELECT tt.*, t.ten_thuoc, t.ham_luong, t.don_vi_tinh, t.don_gia_thau, t.ty_le_thanh_toan
      FROM ton_kho_tu_truc tt JOIN thuoc t ON tt.thuoc_id = t.id
      WHERE tt.kho_id = ? AND tt.so_luong_ton > 0
        AND (tt.han_dung IS NULL OR tt.han_dung > CURDATE())
      ORDER BY t.ten_thuoc
    `, [khoId]);
    const [patients] = await db.query(`
      SELECT bn.*, d.id as dot_id, d.ma_benh, d.chan_doan_lam_sang, d.muc_huong, d.khoa
      FROM dot_dieu_tri d JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
      WHERE d.loai_hinh = 'noi_tru' AND d.trang_thai = 'dang_dieu_tri' AND d.khoa = ?
    `, [khoa]);
    res.render('inpatient/emergency-cabinet', { title: 'Xuất thuốc Tủ trực', stock, patients, khoa, khoId });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/dashboard'); }
});

router.post('/xuat', isAuthenticated, authorize('dieu_duong'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { dot_dieu_tri_id, thuoc_id, so_luong } = req.body;
    const kho_id = req.session.user.kho_id;
    if (!kho_id) { await conn.rollback(); req.flash('error', 'Tài khoản chưa phân công kho'); return res.redirect('/tu-truc'); }

    const sl = parseInt(so_luong);
    // Check stock - kiểm tra tồn kho và hạn dùng
    const [stockItem] = await conn.query(
      'SELECT * FROM ton_kho_tu_truc WHERE kho_id = ? AND thuoc_id = ? AND so_luong_ton >= ? AND (han_dung IS NULL OR han_dung > CURDATE())',
      [kho_id, thuoc_id, sl]
    );
    if (!stockItem.length) { await conn.rollback(); req.flash('error', 'Tủ trực hết thuốc, không đủ số lượng hoặc thuốc đã hết hạn'); return res.redirect('/tu-truc'); }
    // Trừ tồn kho tủ trực
    await conn.query('UPDATE ton_kho_tu_truc SET so_luong_ton = so_luong_ton - ? WHERE id = ?', [sl, stockItem[0].id]);
    // Tính BHYT
    const [drug] = await conn.query('SELECT * FROM thuoc WHERE id = ?', [thuoc_id]);
    const [dotDT] = await conn.query('SELECT * FROM dot_dieu_tri WHERE id = ?', [dot_dieu_tri_id]);
    const [bn] = await conn.query('SELECT * FROM benh_nhan WHERE id = ?', [dotDT[0].benh_nhan_id]);
    const insuranceData = await BhytService.checkInsuranceCard(bn[0].so_the_bhyt);
    let mucHuong = dotDT[0].muc_huong;
    if (mucHuong == null) {
      mucHuong = await BhytService.determineCoverageRate(bn[0], dotDT[0].ma_benh, insuranceData);
    }
    const costSplit = BhytService.calculateCostSplit(sl, drug[0].don_gia_thau, drug[0].don_gia_thau, drug[0].ty_le_thanh_toan, mucHuong);
    // Ghi nhận chi phí
    await conn.query('INSERT INTO chi_phi_bhyt SET ?', {
      dot_dieu_tri_id, thuoc_id, so_luong: sl, don_gia: drug[0].don_gia_thau,
      ty_le_tt: drug[0].ty_le_thanh_toan, muc_huong: mucHuong,
      tien_bhyt: costSplit.tien_bhyt, tien_bn_cung_tra: costSplit.tien_bn_cung_tra,
      tien_bn_tu_tuc: costSplit.tien_bn_tu_tuc, nguon: 'tu_truc'
    });
    // Ghi hàng chờ hoàn ứng
    await conn.query('INSERT INTO hang_cho_hoan_ung SET ?', { kho_tu_truc_id: kho_id, thuoc_id, dot_dieu_tri_id, so_luong: sl });
    // Biến động kho
    await recordStockMovement(conn, {
      kho_id: kho_id, thuoc_id: thuoc_id, loai_bien_dong: 'xuat_tu_truc',
      so_luong: sl, phieu_lien_quan: `TT-${dot_dieu_tri_id}`, nguoi_thuc_hien_id: req.session.user.id
    });
    await conn.commit();
    req.flash('success', 'Xuất thuốc thành công. Đã ghi nhận viện phí và hàng chờ hoàn ứng.');
  } catch (err) { await conn.rollback(); console.error(err); req.flash('error', 'Lỗi: ' + err.message); }
  finally { conn.release(); }
  res.redirect('/tu-truc');
});

module.exports = router;
