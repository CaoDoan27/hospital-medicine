const db = require('../config/database');
const Replenishment = require('../models/Replenishment');
const FefoService = require('../services/fefoService');
const { recordStockMovement } = require('../utils/stockMovement');

// Lập yêu cầu hoàn ứng (Điều dưỡng)
exports.showRequest = async (req, res) => {
  try {
    const khoId = req.session.user.kho_id;
    if (!khoId) { req.flash('error', 'Tài khoản của bạn chưa được phân công quản lý tủ trực'); return res.redirect('/dashboard'); }

    const khoTuTruc = await Replenishment.getKhoInfo(khoId);
    if (!khoTuTruc.length || khoTuTruc[0].loai_kho !== 'tu_truc') { req.flash('error', 'Kho được phân công không hợp lệ hoặc không phải tủ trực'); return res.redirect('/dashboard'); }

    const khoa = khoTuTruc[0].khoa;
    const pendingItems = await Replenishment.getPendingItems(khoId);
    const existingRequests = await Replenishment.getRequests(khoId);
    res.render('inpatient/replenishment-request', { title: 'Lập yêu cầu hoàn ứng', pendingItems, existingRequests, khoa, khoId });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/dashboard'); }
};

// Lưu yêu cầu hoàn ứng
exports.saveRequest = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { kho_id, khoa, items } = req.body;
    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
    const result = await Replenishment.createRequest(conn, {
      kho_tu_truc_id: kho_id, khoa_yeu_cau: khoa, nguoi_lap_id: req.session.user.id
    });
    const thuocIds = [];
    for (const item of parsedItems) {
      await Replenishment.createRequestDetail(conn, result.insertId, item.thuoc_id, item.so_luong);
      thuocIds.push(item.thuoc_id);
    }
    await Replenishment.updatePendingStatus(conn, kho_id, thuocIds);
    await conn.commit();
    req.flash('success', 'Đã gửi yêu cầu hoàn ứng');
  } catch (err) { await conn.rollback(); console.error(err); req.flash('error', 'Lỗi: ' + err.message); }
  finally { conn.release(); }
  res.redirect('/hoan-ung/yeu-cau');
};

// Duyệt hoàn ứng (Dược sĩ Kho lẻ)
exports.showApproval = async (req, res) => {
  try {
    const requests = await Replenishment.getPendingApprovals();
    res.render('inpatient/replenishment-approval', { title: 'Duyệt hoàn ứng', requests });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/dashboard'); }
};

// Xác nhận duyệt hoàn ứng
exports.approve = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const phieuId = req.params.id;
    const phieu = await Replenishment.getRequestById(conn, phieuId);
    const details = await Replenishment.getRequestDetails(conn, phieuId);

    const khoNoiTruId = req.session.user.kho_id;
    const khoNoiTru = await Replenishment.getKhoNoiTru(conn, khoNoiTruId);
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

      // Ghi biến động kho xuất
      await recordStockMovement(conn, {
        kho_id: khoNoiTruId, thuoc_id: item.thuoc_id, loai_bien_dong: 'hoan_ung',
        so_luong: item.so_luong_yeu_cau, phieu_lien_quan: `HU-${phieuId}`, nguoi_thuc_hien_id: req.session.user.id
      });

      // Add to cabinet stock
      await Replenishment.upsertCabinetStock(conn, phieu[0].kho_tu_truc_id, item.thuoc_id, item.so_luong_yeu_cau);
      await Replenishment.updateRequestDetailQty(conn, item.id, item.so_luong_yeu_cau);
      await recordStockMovement(conn, {
        kho_id: phieu[0].kho_tu_truc_id, thuoc_id: item.thuoc_id, loai_bien_dong: 'hoan_ung',
        so_luong: item.so_luong_yeu_cau, phieu_lien_quan: `HU-${phieuId}`, nguoi_thuc_hien_id: req.session.user.id
      });
    }

    await Replenishment.completeRequest(conn, phieuId, req.session.user.id);
    const thuocIds = details.map(d => d.thuoc_id);
    await Replenishment.markReplenished(conn, phieu[0].kho_tu_truc_id, thuocIds);
    await conn.commit();
    req.flash('success', 'Hoàn ứng thành công. Tủ trực đã được bổ sung.');
  } catch (err) { await conn.rollback(); console.error(err); req.flash('error', 'Lỗi: ' + err.message); }
  finally { conn.release(); }
  res.redirect('/hoan-ung/duyet');
};

// API: Chi tiết phiếu hoàn ứng
exports.getDetail = async (req, res) => {
  try {
    const result = await Replenishment.getRequestDetailForApi(req.params.id);
    if (!result.phieu) return res.status(404).json({ success: false, error: 'Không tìm thấy phiếu hoàn ứng' });
    res.json({ success: true, phieu: result.phieu, details: result.details });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Lỗi lấy chi tiết phiếu hoàn ứng' });
  }
};
