const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated, authorize } = require('../middleware/authMiddleware');
const BhytService = require('../services/bhytService');
const { parsePage, buildPagination, DEFAULT_PAGE_SIZE } = require('../utils/pagination');

router.get('/', isAuthenticated, authorize('ke_toan'), async (req, res) => {
  try {
    const page = parsePage(req.query.page);
    const [[{ total }]] = await db.query("SELECT COUNT(*) AS total FROM dot_dieu_tri WHERE loai_hinh = 'noi_tru'");
    const pagination = buildPagination({ page, total, baseUrl: '/chi-phi-noi-tru' });
    const [patients] = await db.query(`
      SELECT bn.*, d.id as dot_id, d.khoa, d.ngay_vao, d.ma_benh, d.chan_doan_lam_sang, d.trang_thai as trang_thai_dt
      FROM dot_dieu_tri d JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
      WHERE d.loai_hinh = 'noi_tru' ORDER BY d.ngay_vao DESC
      LIMIT ? OFFSET ?
    `, [DEFAULT_PAGE_SIZE, pagination.offset]);
    res.render('cost/inpatient-cost', { title: 'Tổng hợp CP Nội trú', patients, pagination });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/dashboard'); }
});

router.get('/chi-tiet/:dotId', isAuthenticated, authorize('ke_toan'), async (req, res) => {
  try {
    const [costs] = await db.query(`
      SELECT cp.*, t.ten_thuoc, t.don_vi_tinh, t.ham_luong FROM chi_phi_bhyt cp
      JOIN thuoc t ON cp.thuoc_id = t.id WHERE cp.dot_dieu_tri_id = ? ORDER BY cp.ngay_ghi_nhan DESC
    `, [req.params.dotId]);
    const [dotDT] = await db.query(`
      SELECT d.*, bn.ho_ten, bn.so_the_bhyt FROM dot_dieu_tri d
      JOIN benh_nhan bn ON d.benh_nhan_id = bn.id WHERE d.id = ?
    `, [req.params.dotId]);
    const tongBHYT = costs.reduce((s, c) => s + parseFloat(c.tien_bhyt), 0);
    const tongBNCCT = costs.reduce((s, c) => s + parseFloat(c.tien_bn_cung_tra), 0);
    const tongBNTT = costs.reduce((s, c) => s + parseFloat(c.tien_bn_tu_tuc), 0);
    res.render('cost/inpatient-cost-detail', { title: 'Chi tiết viện phí thuốc', costs, dotDT: dotDT[0], tongBHYT, tongBNCCT, tongBNTT });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/chi-phi-noi-tru'); }
});

router.post('/chot/:dotId', isAuthenticated, authorize('ke_toan'), async (req, res) => {
  try {
    // Kiểm tra trạng thái hiện tại — chỉ cho phép chốt khi đang điều trị
    const [dotCheck] = await db.query('SELECT trang_thai, ngay_ra FROM dot_dieu_tri WHERE id = ?', [req.params.dotId]);
    if (!dotCheck.length) {
      req.flash('error', 'Không tìm thấy đợt điều trị');
      return res.redirect('/chi-phi-noi-tru');
    }
    if (dotCheck[0].trang_thai === 'da_xuat_xml') {
      req.flash('error', 'Đợt điều trị đã xuất XML, không thể chốt lại');
      return res.redirect('/chi-phi-noi-tru');
    }
    if (dotCheck[0].trang_thai === 'da_chot_vien_phi') {
      req.flash('error', 'Đợt điều trị đã được chốt viện phí trước đó');
      return res.redirect('/chi-phi-noi-tru');
    }
    await db.query("UPDATE dot_dieu_tri SET trang_thai = 'da_chot_vien_phi' WHERE id = ? AND trang_thai = 'dang_dieu_tri'", [req.params.dotId]);
    req.flash('success', 'Đã chốt viện phí thuốc cho bệnh nhân');
  } catch (err) { req.flash('error', 'Lỗi: ' + err.message); }
  res.redirect('/chi-phi-noi-tru');
});

module.exports = router;
