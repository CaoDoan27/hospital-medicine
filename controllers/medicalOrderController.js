const db = require('../config/database');
const MedicalOrder = require('../models/MedicalOrder');

// Trang y lệnh
exports.index = async (req, res) => {
  try {
    const khoId = req.session.user.kho_id;
    if (!khoId) { req.flash('error', 'Tài khoản của bạn chưa được phân công quản lý tủ trực khoa nào'); return res.redirect('/dashboard'); }
    const khoTuTruc = await MedicalOrder.getKhoTuTruc(khoId);
    if (!khoTuTruc.length || !khoTuTruc[0].khoa) { req.flash('error', 'Kho được phân công không hợp lệ hoặc không có thông tin khoa'); return res.redirect('/dashboard'); }
    const khoa = khoTuTruc[0].khoa;
    
    let ngay = req.query.ngay || '';
    // Validate date format YYYY-MM-DD and reasonable year range
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay) || parseInt(ngay) < 2000 || parseInt(ngay) > 2100) {
      ngay = new Date().toISOString().split('T')[0];
    }
    const orders = await MedicalOrder.findPending(khoa, ngay);
    const phieuLinh = await MedicalOrder.getPhieuLinh(khoa);
    res.render('inpatient/medical-orders', { title: 'Tổng hợp Y lệnh', orders, phieuLinh, khoa, ngay });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/dashboard'); }
};

// Tổng hợp y lệnh
exports.aggregate = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    
    const khoId = req.session.user.kho_id;
    if (!khoId) throw new Error('Tài khoản chưa được phân công quản lý khoa nào');
    const khoTuTruc = await MedicalOrder.getKhoTuTrucWithConn(conn, khoId);
    const khoa = khoTuTruc[0].khoa;
    
    const { selected_orders } = req.body;
    const orderIds = Array.isArray(selected_orders) ? selected_orders : [selected_orders];
    if (!orderIds || orderIds.length === 0) { req.flash('error', 'Vui lòng chọn ít nhất 1 y lệnh'); return res.redirect('/y-lenh'); }

    // Tạo phiếu lĩnh
    const result = await MedicalOrder.createPhieuLinh(conn, { khoa, nguoi_lap_id: req.session.user.id });
    const phieuLinhId = result.insertId;

    // Gom nhóm theo thuốc
    const orders = await MedicalOrder.groupByDrug(conn, orderIds);
    for (const order of orders) {
      await MedicalOrder.createPhieuLinhDetail(conn, phieuLinhId, order.thuoc_id, order.tong);
    }

    // Liên kết y lệnh
    await MedicalOrder.linkOrders(conn, phieuLinhId, orderIds);
    await MedicalOrder.updateStatus(conn, orderIds, 'dang_cho_duyet');
    await conn.commit();
    req.flash('success', 'Đã tạo phiếu lĩnh thuốc và gửi tới Kho dược');
    res.redirect('/y-lenh');
  } catch (err) { await conn.rollback(); console.error(err); req.flash('error', 'Lỗi: ' + err.message); res.redirect('/y-lenh'); }
  finally { conn.release(); }
};

// API: Lấy y lệnh chưa tổng hợp
exports.getOrders = async (req, res) => {
  try {
    const khoId = req.session.user.kho_id;
    const khoTuTruc = await MedicalOrder.getKhoTuTruc(khoId);
    const khoa = khoTuTruc[0].khoa;
    
    let ngay = req.query.ngay || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay) || parseInt(ngay) < 2000 || parseInt(ngay) > 2100) {
      ngay = new Date().toISOString().split('T')[0];
    }
    const orders = await MedicalOrder.findPending(khoa, ngay);
    res.json({ success: true, orders, khoa, ngay });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Lỗi lấy y lệnh' });
  }
};

// API: Chi tiết phiếu lĩnh
exports.getPhieuLinhDetail = async (req, res) => {
  try {
    const result = await MedicalOrder.getPhieuLinhDetail(req.params.id);
    if (!result.phieu) return res.status(404).json({ success: false, error: 'Không tìm thấy phiếu lĩnh' });
    res.json({ success: true, phieu: result.phieu, details: result.details });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Lỗi lấy chi tiết phiếu lĩnh' });
  }
};
