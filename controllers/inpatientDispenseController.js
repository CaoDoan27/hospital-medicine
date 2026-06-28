const db = require('../config/database');
const InpatientDispense = require('../models/InpatientDispense');
const Warehouse = require('../models/Warehouse');
const FefoService = require('../services/fefoService');
const BhytService = require('../services/bhytService');
const { recordStockMovement } = require('../utils/stockMovement');

const checkKhoNoiTru = async (req, res, next) => {
  if (req.session.user.vai_tro === 'duoc_si_kho_le') {
    const [kho] = await db.query('SELECT loai_kho FROM kho WHERE id = ?', [req.session.user.kho_id]);
    if (!kho.length || kho[0].loai_kho !== 'kho_le_noi_tru') {
      req.flash('error', 'Bạn không có quyền truy cập Kho lẻ nội trú');
      return res.redirect('/dashboard');
    }
  }
  next();
};

const list = async (req, res) => {
  try {
    const phieuLinh = await InpatientDispense.getPendingPhieuLinh();
    const phieuDaCapPhat = await InpatientDispense.getCompletedPhieuLinh();
    res.render('inpatient/dispense-confirm', { title: 'Cấp phát Nội trú', phieuLinh, phieuDaCapPhat });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/dashboard'); }
};

const showDetail = async (req, res) => {
  try {
    const phieu = await InpatientDispense.getPhieuLinh(req.params.id);
    if (!phieu.length) { req.flash('error', 'Không tìm thấy phiếu lĩnh'); return res.redirect('/cap-phat-noi-tru'); }
    const details = await InpatientDispense.getPhieuLinhDetails(req.params.id);
    // FEFO suggestions + kiểm tra tồn kho thực tế
    const khoId = req.session.user.kho_id;
    for (const item of details) {
      const suggestion = await FefoService.allocate(item.thuoc_id, khoId, item.so_luong_yeu_cau);
      item.fefo_suggestion = suggestion;
      item.ton_kho = suggestion.totalAvailable || 0;
    }
    res.render('inpatient/dispense-detail', { title: 'Chi tiết phiếu lĩnh', phieu: phieu[0], details });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/cap-phat-noi-tru'); }
};

const confirm = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const phieuLinhId = req.params.id;
    const khoId = req.session.user.kho_id;

    // Kiểm tra phiếu lĩnh hợp lệ
    const phieuCheck = await InpatientDispense.checkPhieuLinhValid(conn, phieuLinhId);
    if (!phieuCheck.length) {
      await conn.rollback();
      req.flash('error', 'Phiếu lĩnh không hợp lệ hoặc đã được xử lý');
      return res.redirect('/cap-phat-noi-tru');
    }

    const details = await InpatientDispense.getPhieuLinhDetailsWithConn(conn, phieuLinhId);

    // Kiểm tra kho đang kiểm kê
    const khoCheck = await Warehouse.checkStatus(conn, khoId);
    if (khoCheck.length && khoCheck[0].trang_thai_kho === 'dang_kiem_ke') {
      await conn.rollback();
      req.flash('error', 'Kho đang kiểm kê, không thể cấp phát thuốc');
      return res.redirect(`/cap-phat-noi-tru/chi-tiet/${phieuLinhId}`);
    }

    // Lấy số lượng cấp phát thực tế từ form
    const soLuongCapPhat = req.body.so_luong_cap_phat || {};

    // Lấy y lệnh liên kết
    const yLenhLinks = await InpatientDispense.getYLenhLinks(conn, phieuLinhId);

    const errors = [];
    let hasDispensedItems = false;
    const dispensedMap = new Map();

    for (const item of details) {
      const rawValue = soLuongCapPhat[String(item.id)];
      let slCapPhat = rawValue !== undefined ? parseInt(rawValue) : item.so_luong_yeu_cau;
      if (isNaN(slCapPhat)) slCapPhat = item.so_luong_yeu_cau;

      if (slCapPhat > item.so_luong_yeu_cau) {
        slCapPhat = item.so_luong_yeu_cau;
      }

      if (slCapPhat <= 0) {
        await InpatientDispense.updateDetailQty(conn, item.id, 0);
        continue;
      }

      const allocation = await FefoService.allocate(item.thuoc_id, khoId, slCapPhat, conn);
      if (!allocation.success) {
        if (allocation.totalAvailable > 0) {
          const partialAlloc = await FefoService.allocate(item.thuoc_id, khoId, allocation.totalAvailable, conn);
          if (partialAlloc.success) {
            await FefoService.deductStock(conn, partialAlloc.allocation);
            await InpatientDispense.updateDetailQty(conn, item.id, allocation.totalAvailable);
            await recordStockMovement(conn, {
              kho_id: khoId, thuoc_id: item.thuoc_id, loai_bien_dong: 'xuat_cap_phat',
              so_luong: allocation.totalAvailable, phieu_lien_quan: `PL-${phieuLinhId}`, nguoi_thuc_hien_id: req.session.user.id
            });
            errors.push(`${item.ten_thuoc}: Chỉ cấp phát được ${allocation.totalAvailable}/${slCapPhat} (hết tồn kho)`);
            hasDispensedItems = true;
            if (dispensedMap.has(item.thuoc_id)) {
              const prev = dispensedMap.get(item.thuoc_id);
              dispensedMap.set(item.thuoc_id, { cap_phat: prev.cap_phat + allocation.totalAvailable, yeu_cau: prev.yeu_cau + item.so_luong_yeu_cau });
            } else {
              dispensedMap.set(item.thuoc_id, { cap_phat: allocation.totalAvailable, yeu_cau: item.so_luong_yeu_cau });
            }
          }
        } else {
          errors.push(`${item.ten_thuoc}: Hết tồn kho, không thể cấp phát`);
          await InpatientDispense.updateDetailQty(conn, item.id, 0);
        }
        continue;
      }

      // Đủ tồn kho
      await FefoService.deductStock(conn, allocation.allocation);
      await InpatientDispense.updateDetailQty(conn, item.id, slCapPhat);
      await recordStockMovement(conn, {
        kho_id: khoId, thuoc_id: item.thuoc_id, loai_bien_dong: 'xuat_cap_phat',
        so_luong: slCapPhat, phieu_lien_quan: `PL-${phieuLinhId}`, nguoi_thuc_hien_id: req.session.user.id
      });
      hasDispensedItems = true;
      if (dispensedMap.has(item.thuoc_id)) {
        const prev = dispensedMap.get(item.thuoc_id);
        dispensedMap.set(item.thuoc_id, { cap_phat: prev.cap_phat + slCapPhat, yeu_cau: prev.yeu_cau + item.so_luong_yeu_cau });
      } else {
        dispensedMap.set(item.thuoc_id, { cap_phat: slCapPhat, yeu_cau: item.so_luong_yeu_cau });
      }
    }

    if (!hasDispensedItems) {
      await conn.rollback();
      req.flash('error', 'Không thể cấp phát: Tất cả thuốc đều hết tồn kho nội trú');
      return res.redirect(`/cap-phat-noi-tru/chi-tiet/${phieuLinhId}`);
    }

    // Cập nhật trạng thái
    await InpatientDispense.updatePhieuLinhStatus(conn, phieuLinhId, 'da_cap_phat');
    if (yLenhLinks.length > 0) {
      const yLenhIds = yLenhLinks.map(l => l.y_lenh_id);
      await InpatientDispense.updateYLenhStatus(conn, yLenhIds, 'da_linh');
    }

    // Ghi nhận chi phí BHYT
    if (yLenhLinks.length > 0 && dispensedMap.size > 0) {
      const yLenhIdsForCost = yLenhLinks.map(l => l.y_lenh_id);
      const yLenhDetails = await InpatientDispense.getYLenhCostDetails(conn, yLenhIdsForCost);

      for (const yl of yLenhDetails) {
        const info = dispensedMap.get(yl.thuoc_id);
        if (!info || info.cap_phat <= 0) continue;

        const slThucCap = info.yeu_cau > 0 ? Math.round(yl.so_luong * info.cap_phat / info.yeu_cau) : 0;
        if (slThucCap <= 0) continue;

        const costSplit = BhytService.calculateCostSplit(
          slThucCap, yl.don_gia_thau, yl.don_gia_thau,
          yl.ty_le_thanh_toan, yl.muc_huong
        );

        await InpatientDispense.createCost(conn, {
          dot_dieu_tri_id: yl.dot_dieu_tri_id, thuoc_id: yl.thuoc_id,
          so_luong: slThucCap, don_gia: yl.don_gia_thau,
          ty_le_tt: yl.ty_le_thanh_toan, muc_huong: yl.muc_huong,
          tien_bhyt: costSplit.tien_bhyt, tien_bn_cung_tra: costSplit.tien_bn_cung_tra,
          tien_bn_tu_tuc: costSplit.tien_bn_tu_tuc, nguon: 'noi_tru'
        });
      }
    }

    await conn.commit();

    if (errors.length > 0) {
      req.flash('warning', 'Cấp phát hoàn tất với lưu ý: ' + errors.join('; '));
    } else {
      req.flash('success', 'Cấp phát nội trú thành công');
    }
  } catch (err) {
    await conn.rollback();
    console.error(err);
    req.flash('error', 'Lỗi cấp phát: ' + err.message);
  } finally {
    conn.release();
  }
  res.redirect('/cap-phat-noi-tru');
};

module.exports = { checkKhoNoiTru, list, showDetail, confirm };
