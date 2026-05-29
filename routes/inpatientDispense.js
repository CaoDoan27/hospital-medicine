const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated, authorize } = require('../middleware/authMiddleware');
const FefoService = require('../services/fefoService');
const BhytService = require('../services/bhytService');

const checkKhoNoiTru = (req, res, next) => {
  if (req.session.user.vai_tro === 'duoc_si_kho_le' && req.session.user.kho_id !== 3) {
    req.flash('error', 'Bạn không có quyền truy cập Kho lẻ nội trú');
    return res.redirect('/dashboard');
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
    for (const item of details) {
      const suggestion = await FefoService.allocate(item.thuoc_id, 3, item.so_luong_yeu_cau);
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

    // Lấy số lượng cấp phát thực tế từ form
    const soLuongCapPhat = req.body.so_luong_cap_phat || {};

    // Lấy y lệnh liên kết để biết bệnh nhân
    const [yLenhLinks] = await conn.query('SELECT y_lenh_id FROM phieu_linh_y_lenh WHERE phieu_linh_id = ?', [phieuLinhId]);

    const errors = [];
    let hasDispensedItems = false;

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
      const allocation = await FefoService.allocate(item.thuoc_id, 3, slCapPhat, conn);
      if (!allocation.success) {
        // Không đủ tồn → cấp phát tối đa có thể
        if (allocation.totalAvailable > 0) {
          const partialAlloc = await FefoService.allocate(item.thuoc_id, 3, allocation.totalAvailable, conn);
          if (partialAlloc.success) {
            await FefoService.deductStock(conn, partialAlloc.allocation);
            await conn.query('UPDATE chi_tiet_phieu_linh SET so_luong_cap_phat = ? WHERE id = ?', [allocation.totalAvailable, item.id]);
            await conn.query('INSERT INTO bien_dong_kho SET ?', {
              kho_id: 3, thuoc_id: item.thuoc_id, loai_bien_dong: 'xuat_cap_phat',
              so_luong: allocation.totalAvailable, phieu_lien_quan: `PL-${phieuLinhId}`, nguoi_thuc_hien_id: req.session.user.id
            });
            errors.push(`${item.ten_thuoc}: Chỉ cấp phát được ${allocation.totalAvailable}/${slCapPhat} (hết tồn kho)`);
            hasDispensedItems = true;
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
      await conn.query('INSERT INTO bien_dong_kho SET ?', {
        kho_id: 3, thuoc_id: item.thuoc_id, loai_bien_dong: 'xuat_cap_phat',
        so_luong: slCapPhat, phieu_lien_quan: `PL-${phieuLinhId}`, nguoi_thuc_hien_id: req.session.user.id
      });
      hasDispensedItems = true;
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
