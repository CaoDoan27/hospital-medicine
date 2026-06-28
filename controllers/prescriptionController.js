const db = require('../config/database');
const Drug = require('../models/Drug');
const Patient = require('../models/Patient');
const Prescription = require('../models/Prescription');
const { parsePage, buildPagination, DEFAULT_PAGE_SIZE } = require('../utils/pagination');

// Danh sách đơn thuốc của bác sĩ
exports.list = async (req, res) => {
  try {
    const page = parsePage(req.query.page);
    const search = (req.query.search || '').trim();
    const bsName = req.session.user.ho_ten;

    let where = "WHERE d.loai_hinh = 'ngoai_tru' AND dt.bac_si_ke = ?";
    const params = [bsName];
    if (search) {
      where += ' AND (bn.ho_ten LIKE ? OR bn.so_the_bhyt LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const total = await Prescription.count(where, params);
    const pagination = buildPagination({ page, total, baseUrl: '/don-thuoc', extraParams: { search } });
    const prescriptions = await Prescription.findAll(where, params, DEFAULT_PAGE_SIZE, pagination.offset);
    res.render('prescription/index', { title: 'Đơn thuốc của tôi', prescriptions, pagination, search });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi tải danh sách'); res.redirect('/dashboard'); }
};

// Form kê đơn mới
exports.showCreate = async (req, res) => {
  try {
    const drugs = await Drug.getActiveDrugs();
    const icd10 = await Drug.getIcd10();
    res.render('prescription/form', { title: 'Kê đơn thuốc', drugs, icd10, prescription: null, items: [] });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/don-thuoc'); }
};

// API: tìm bệnh nhân
exports.searchPatient = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ success: true, data: [] });
    const rows = await Patient.search(q);
    res.json({ success: true, data: rows });
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Lỗi tìm kiếm' }); }
};

// Lưu đơn thuốc mới
exports.save = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const {
      benh_nhan_id, ma_benh_nhan, ho_ten, ngay_sinh, gioi_tinh, so_the_bhyt, dia_chi, dien_thoai,
      ma_benh, chan_doan_lam_sang, muc_huong, items
    } = req.body;

    if (!ma_benh || !chan_doan_lam_sang) { req.flash('error', 'Chẩn đoán không được để trống'); await conn.rollback(); return res.redirect('/don-thuoc/tao'); }
    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
    if (!parsedItems || !parsedItems.length) { req.flash('error', 'Phải có ít nhất 1 thuốc'); await conn.rollback(); return res.redirect('/don-thuoc/tao'); }

    // Patient: use existing or create new
    let bnId = parseInt(benh_nhan_id) || null;
    if (!bnId) {
      if (!ho_ten || !ho_ten.trim()) { req.flash('error', 'Họ tên bệnh nhân không được để trống'); await conn.rollback(); return res.redirect('/don-thuoc/tao'); }
      const newMaBn = ma_benh_nhan && ma_benh_nhan.trim() ? ma_benh_nhan.trim() : `BN${Date.now()}`;
      const result = await Patient.create(conn, {
        ma_benh_nhan: newMaBn, ho_ten: ho_ten.trim(),
        ngay_sinh: ngay_sinh || null, gioi_tinh: gioi_tinh || 'Nam',
        so_the_bhyt: so_the_bhyt || null, dia_chi: dia_chi || null, dien_thoai: dien_thoai || null
      });
      bnId = result.insertId;
    }

    // Create dot_dieu_tri (outpatient)
    const dotResult = await Prescription.createTreatment(conn, {
      benh_nhan_id: bnId, loai_hinh: 'ngoai_tru', khoa: null,
      ngay_vao: new Date(), ma_benh, chan_doan_lam_sang,
      muc_huong: parseInt(muc_huong) || 80
    });

    // Create don_thuoc
    const dtResult = await Prescription.create(conn, {
      dot_dieu_tri_id: dotResult.insertId,
      bac_si_ke: req.session.user.ho_ten,
      chan_doan: chan_doan_lam_sang
    });

    // Create chi_tiet_don_thuoc
    for (const it of parsedItems) {
      const sl = parseInt(it.so_luong);
      if (!it.thuoc_id || !sl || sl < 1) continue;
      await Prescription.createDetail(conn, {
        don_thuoc_id: dtResult.insertId,
        thuoc_id: parseInt(it.thuoc_id),
        so_luong: sl,
        lieu_dung: it.lieu_dung || null,
        ghi_chu: it.ghi_chu || null
      });
    }

    await conn.commit();
    req.flash('success', 'Đã kê đơn thuốc và gửi tới khu vực cấp phát ngoại trú');
    res.redirect('/don-thuoc');
  } catch (err) { await conn.rollback(); console.error(err); req.flash('error', 'Lỗi: ' + err.message); res.redirect('/don-thuoc/tao'); }
  finally { conn.release(); }
};

// Xem chi tiết đơn thuốc
exports.showDetail = async (req, res) => {
  try {
    const rows = await Prescription.findById(req.params.id, req.session.user.ho_ten);
    if (!rows.length) { req.flash('error', 'Không tìm thấy đơn thuốc'); return res.redirect('/don-thuoc'); }
    const items = await Prescription.getItems(req.params.id);
    res.render('prescription/detail', { title: 'Chi tiết đơn thuốc', rx: rows[0], items });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/don-thuoc'); }
};

// Hủy đơn thuốc
exports.cancel = async (req, res) => {
  try {
    const check = await Prescription.checkStatus(req.params.id, req.session.user.ho_ten);
    if (!check.length) { req.flash('error', 'Không tìm thấy đơn thuốc'); return res.redirect('/don-thuoc'); }
    if (check[0].trang_thai !== 'moi') { req.flash('error', 'Chỉ có thể hủy đơn chưa cấp phát'); return res.redirect('/don-thuoc'); }
    await Prescription.cancel(req.params.id);
    req.flash('success', 'Đã hủy đơn thuốc');
  } catch (err) { console.error(err); req.flash('error', 'Lỗi: ' + err.message); }
  res.redirect('/don-thuoc');
};
