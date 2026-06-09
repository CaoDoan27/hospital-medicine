const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated, authorize } = require('../middleware/authMiddleware');
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

router.get('/', isAuthenticated, authorize('duoc_si_kho_le'), checkKhoNoiTru, async (req, res) => {
  try {
    const [phieuLinh] = await db.query(`
      SELECT pl.*, nd.ho_ten as nguoi_lap FROM phieu_linh pl
      JOIN nguoi_dung nd ON pl.nguoi_lap_id = nd.id
      WHERE pl.trang_thai = 'dang_cho_duyet' ORDER BY pl.ngay_lap DESC
    `);
    const [phieuDaCapPhat] = await db.query(`
      SELECT pl.*, nd.ho_ten as nguoi_lap FROM phieu_linh pl
      JOIN nguoi_dung nd ON pl.nguoi_lap_id = nd.id
      WHERE pl.trang_thai = 'da_cap_phat' ORDER BY pl.ngay_lap DESC LIMIT 20
    `);
    res.render('inpatient/dispense-confirm', { title: 'Cấp phát Nội trú', phieuLinh, phieuDaCapPhat });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/dashboard'); }
});

router.get('/chi-tiet/:id', isAuthenticated, authorize('duoc_si_kho_le'), checkKhoNoiTru, async (req, res) => {
  try {
    const [phieu] = await db.query('SELECT * FROM phieu_linh WHERE id = ?', [req.params.id]);
    if (!phieu.length) { req.flash('error', 'Không tìm thấy phiếu lĩnh'); return res.redirect('/cap-phat-noi-tru'); }
    const [details] = await db.query(`
      SELECT ct.*, t.ten_thuoc, t.ham_luong, t.don_vi_tinh, t.don_gia_thau
      FROM chi_tiet_phieu_linh ct JOIN thuoc t ON ct.thuoc_id = t.id WHERE ct.phieu_linh_id = ?
    `, [req.params.id]);
    // FEFO suggestions + kiểm tra tồn kho thực tế
    const khoId = req.session.user.kho_id;
    for (const item of details) {
      const suggestion = await FefoService.allocate(item.thuoc_id, khoId, item.so_luong_yeu_cau);
      item.fefo_suggestion = suggestion;
      item.ton_kho = suggestion.totalAvailable || 0;
    }
    res.render('inpatient/dispense-detail', { title: 'Chi tiết phiếu lĩnh', phieu: phieu[0], details });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/cap-phat-noi-tru'); }
});

router.post('/xac-nhan/:id', isAuthenticated, authorize('duoc_si_kho_le'), checkKhoNoiTru, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const phieuLinhId = req.params.id;
    const khoId = req.session.user.kho_id;

    // Kiểm tra phiếu lĩnh hợp lệ
    const [phieuCheck] = await conn.query(
      "SELECT id FROM phieu_linh WHERE id = ? AND trang_thai = 'dang_cho_duyet'", [phieuLinhId]
    );
    if (!phieuCheck.length) {
      await conn.rollback();
      req.flash('error', 'Phiếu lĩnh không hợp lệ hoặc đã được xử lý');
      return res.redirect('/cap-phat-noi-tru');
    }

    const [details] = await conn.query(`
      SELECT ct.*, t.don_gia_thau, t.ty_le_thanh_toan, t.ten_thuoc
      FROM chi_tiet_phieu_linh ct
      JOIN thuoc t ON ct.thuoc_id = t.id WHERE ct.phieu_linh_id = ?
    `, [phieuLinhId]);

    // Kiểm tra kho đang kiểm kê
    const [khoCheck] = await conn.query('SELECT trang_thai_kho FROM kho WHERE id = ?', [khoId]);
    if (khoCheck.length && khoCheck[0].trang_thai_kho === 'dang_kiem_ke') {
      await conn.rollback();
      req.flash('error', 'Kho đang kiểm kê, không thể cấp phát thuốc');
      return res.redirect(`/cap-phat-noi-tru/chi-tiet/${phieuLinhId}`);
    }

    // Lấy số lượng cấp phát thực tế từ form
    const soLuongCapPhat = req.body.so_luong_cap_phat || {};

    // Lấy y lệnh liên kết để biết bệnh nhân
    const [yLenhLinks] = await conn.query('SELECT y_lenh_id FROM phieu_linh_y_lenh WHERE phieu_linh_id = ?', [phieuLinhId]);

    const errors = [];
    let hasDispensedItems = false;
    const dispensedMap = new Map(); // Track SL cấp phát thực tế theo thuoc_id để tính BHYT

    for (const item of details) {
      // Lấy SL cấp phát từ form (key là string), mặc định = SL yêu cầu
      const rawValue = soLuongCapPhat[String(item.id)];
      let slCapPhat = rawValue !== undefined ? parseInt(rawValue) : item.so_luong_yeu_cau;
      if (isNaN(slCapPhat)) slCapPhat = item.so_luong_yeu_cau;

      // Validate: không được vượt quá SL yêu cầu
      if (slCapPhat > item.so_luong_yeu_cau) {
        slCapPhat = item.so_luong_yeu_cau;
      }

      // Nếu SL cấp phát = 0 thì bỏ qua thuốc này
      if (slCapPhat <= 0) {
        await conn.query('UPDATE chi_tiet_phieu_linh SET so_luong_cap_phat = 0 WHERE id = ?', [item.id]);
        continue;
      }

      // FEFO allocation trong transaction với FOR UPDATE lock
      const allocation = await FefoService.allocate(item.thuoc_id, khoId, slCapPhat, conn);
      if (!allocation.success) {
        // Không đủ tồn → cấp phát tối đa có thể
        if (allocation.totalAvailable > 0) {
          const partialAlloc = await FefoService.allocate(item.thuoc_id, khoId, allocation.totalAvailable, conn);
          if (partialAlloc.success) {
            await FefoService.deductStock(conn, partialAlloc.allocation);
            await conn.query('UPDATE chi_tiet_phieu_linh SET so_luong_cap_phat = ? WHERE id = ?', [allocation.totalAvailable, item.id]);
            await recordStockMovement(conn, {
              kho_id: khoId, thuoc_id: item.thuoc_id, loai_bien_dong: 'xuat_cap_phat',
              so_luong: allocation.totalAvailable, phieu_lien_quan: `PL-${phieuLinhId}`, nguoi_thuc_hien_id: req.session.user.id
            });
            errors.push(`${item.ten_thuoc}: Chỉ cấp phát được ${allocation.totalAvailable}/${slCapPhat} (hết tồn kho)`);
            hasDispensedItems = true;
            // Tích lũy thay vì ghi đè khi cùng thuoc_id
            if (dispensedMap.has(item.thuoc_id)) {
              const prev = dispensedMap.get(item.thuoc_id);
              dispensedMap.set(item.thuoc_id, { cap_phat: prev.cap_phat + allocation.totalAvailable, yeu_cau: prev.yeu_cau + item.so_luong_yeu_cau });
            } else {
              dispensedMap.set(item.thuoc_id, { cap_phat: allocation.totalAvailable, yeu_cau: item.so_luong_yeu_cau });
            }
          }
        } else {
          errors.push(`${item.ten_thuoc}: Hết tồn kho, không thể cấp phát`);
          await conn.query('UPDATE chi_tiet_phieu_linh SET so_luong_cap_phat = 0 WHERE id = ?', [item.id]);
        }
        continue;
      }

      // Đủ tồn kho → cấp phát đầy đủ
      await FefoService.deductStock(conn, allocation.allocation);
      await conn.query('UPDATE chi_tiet_phieu_linh SET so_luong_cap_phat = ? WHERE id = ?', [slCapPhat, item.id]);
      await recordStockMovement(conn, {
        kho_id: khoId, thuoc_id: item.thuoc_id, loai_bien_dong: 'xuat_cap_phat',
        so_luong: slCapPhat, phieu_lien_quan: `PL-${phieuLinhId}`, nguoi_thuc_hien_id: req.session.user.id
      });
      hasDispensedItems = true;
      // Tích lũy thay vì ghi đè khi cùng thuoc_id
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
    await conn.query("UPDATE phieu_linh SET trang_thai = 'da_cap_phat' WHERE id = ?", [phieuLinhId]);
    if (yLenhLinks.length > 0) {
      const yLenhIds = yLenhLinks.map(l => l.y_lenh_id);
      await conn.query("UPDATE y_lenh SET trang_thai = 'da_linh' WHERE id IN (?)", [yLenhIds]);
    }

    // Ghi nhận chi phí BHYT cho bệnh nhân nội trú
    if (yLenhLinks.length > 0 && dispensedMap.size > 0) {
      const yLenhIdsForCost = yLenhLinks.map(l => l.y_lenh_id);
      const [yLenhDetails] = await conn.query(`
        SELECT yl.id, yl.dot_dieu_tri_id, yl.thuoc_id, yl.so_luong,
               t.don_gia_thau, t.ty_le_thanh_toan,
               d.ma_benh, d.muc_huong, bn.so_the_bhyt
        FROM y_lenh yl
        JOIN thuoc t ON yl.thuoc_id = t.id
        JOIN dot_dieu_tri d ON yl.dot_dieu_tri_id = d.id
        JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
        WHERE yl.id IN (?)
      `, [yLenhIdsForCost]);

      for (const yl of yLenhDetails) {
        const info = dispensedMap.get(yl.thuoc_id);
        if (!info || info.cap_phat <= 0) continue;

        // Phân bổ SL cấp phát theo tỷ lệ y lệnh gốc
        const slThucCap = info.yeu_cau > 0 ? Math.round(yl.so_luong * info.cap_phat / info.yeu_cau) : 0;
        if (slThucCap <= 0) continue;

        const costSplit = BhytService.calculateCostSplit(
          slThucCap, yl.don_gia_thau, yl.don_gia_thau,
          yl.ty_le_thanh_toan, yl.muc_huong
        );

        await conn.query('INSERT INTO chi_phi_bhyt SET ?', {
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
});

module.exports = router;
