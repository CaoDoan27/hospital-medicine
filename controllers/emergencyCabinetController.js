const db = require('../config/database');
const EmergencyCabinet = require('../models/EmergencyCabinet');
const BhytService = require('../services/bhytService');
const { recordStockMovement } = require('../utils/stockMovement');

// Trang tủ trực
exports.index = async (req, res) => {
  try {
    const khoId = req.session.user.kho_id;
    if (!khoId) { req.flash('error', 'Tài khoản của bạn chưa được phân công quản lý tủ trực'); return res.redirect('/dashboard'); }
    
    const khoTuTruc = await EmergencyCabinet.getKhoInfo(khoId);
    if (!khoTuTruc.length || khoTuTruc[0].loai_kho !== 'tu_truc') { req.flash('error', 'Kho được phân công không hợp lệ hoặc không phải tủ trực'); return res.redirect('/dashboard'); }
    
    const khoa = khoTuTruc[0].khoa;
    const stock = await EmergencyCabinet.getStock(khoId);
    const patients = await EmergencyCabinet.getPatients(khoa);
    res.render('inpatient/emergency-cabinet', { title: 'Xuất thuốc Tủ trực', stock, patients, khoa, khoId });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/dashboard'); }
};

// Xuất thuốc tủ trực
exports.dispense = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { dot_dieu_tri_id, thuoc_id, so_luong } = req.body;
    const kho_id = req.session.user.kho_id;
    if (!kho_id) { await conn.rollback(); req.flash('error', 'Tài khoản chưa phân công kho'); return res.redirect('/tu-truc'); }

    const sl = parseInt(so_luong);
    // Check stock
    const stockItem = await EmergencyCabinet.getStockItem(conn, kho_id, thuoc_id, sl);
    if (!stockItem.length) { await conn.rollback(); req.flash('error', 'Tủ trực hết thuốc, không đủ số lượng hoặc thuốc đã hết hạn'); return res.redirect('/tu-truc'); }
    // Trừ tồn kho tủ trực
    await EmergencyCabinet.deductStock(conn, stockItem[0].id, sl);
    // Tính BHYT
    const drug = await EmergencyCabinet.getDrug(conn, thuoc_id);
    const dotDT = await EmergencyCabinet.getDotDieuTri(conn, dot_dieu_tri_id);
    const bn = await EmergencyCabinet.getPatientById(conn, dotDT[0].benh_nhan_id);
    const insuranceData = await BhytService.checkInsuranceCard(bn[0].so_the_bhyt);
    let mucHuong = dotDT[0].muc_huong;
    if (mucHuong == null) {
      mucHuong = await BhytService.determineCoverageRate(bn[0], dotDT[0].ma_benh, insuranceData);
    }
    const costSplit = BhytService.calculateCostSplit(sl, drug[0].don_gia_thau, drug[0].don_gia_thau, drug[0].ty_le_thanh_toan, mucHuong);
    // Ghi nhận chi phí
    await EmergencyCabinet.createCost(conn, {
      dot_dieu_tri_id, thuoc_id, so_luong: sl, don_gia: drug[0].don_gia_thau,
      ty_le_tt: drug[0].ty_le_thanh_toan, muc_huong: mucHuong,
      tien_bhyt: costSplit.tien_bhyt, tien_bn_cung_tra: costSplit.tien_bn_cung_tra,
      tien_bn_tu_tuc: costSplit.tien_bn_tu_tuc, nguon: 'tu_truc'
    });
    // Ghi hàng chờ hoàn ứng
    await EmergencyCabinet.addPendingReplenishment(conn, { kho_tu_truc_id: kho_id, thuoc_id, dot_dieu_tri_id, so_luong: sl });
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
};
