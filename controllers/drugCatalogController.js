const Drug = require('../models/Drug');
const { parsePage, buildPagination, DEFAULT_PAGE_SIZE } = require('../utils/pagination');

// Danh sách thuốc
exports.list = async (req, res) => {
  try {
    const search = req.query.search || '';
    const nhom = req.query.nhom || '';
    const page = parsePage(req.query.page);

    let whereSql = ' WHERE trang_thai = 1';
    const params = [];
    if (search) { whereSql += ' AND (ten_thuoc LIKE ? OR ma_bhyt LIKE ? OR hoat_chat LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (nhom) { whereSql += ' AND nhom_thuoc = ?'; params.push(nhom); }

    const total = await Drug.count(whereSql, params);
    const pagination = buildPagination({
      page, total, baseUrl: '/danh-muc-thuoc',
      extraParams: { search, nhom }
    });
    const drugs = await Drug.findAll(whereSql, params, DEFAULT_PAGE_SIZE, pagination.offset);
    const groups = await Drug.getGroups();
    res.render('drug-catalog/index', { title: 'Danh mục Thuốc', drugs, groups, search, nhom, pagination });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Lỗi tải danh mục thuốc');
    res.redirect('/dashboard');
  }
};

// Form thêm thuốc
exports.showCreate = async (req, res) => {
  const icd10 = await Drug.getIcd10();
  res.render('drug-catalog/form', { title: 'Thêm Thuốc', drug: null, icd10, mode: 'create' });
};

// Form sửa thuốc
exports.showEdit = async (req, res) => {
  const drugs = await Drug.findById(req.params.id);
  if (drugs.length === 0) { req.flash('error', 'Không tìm thấy thuốc'); return res.redirect('/danh-muc-thuoc'); }
  const icd10 = await Drug.getIcd10();
  res.render('drug-catalog/form', { title: 'Sửa Thuốc', drug: drugs[0], icd10, mode: 'edit' });
};

// Thêm/Sửa thuốc
exports.save = async (req, res) => {
  try {
    const { id, ma_bhyt, ten_thuoc, hoat_chat, ham_luong, don_vi_tinh, duong_dung, don_gia_thau, ty_le_thanh_toan, so_dang_ky, nuoc_san_xuat, hang_san_xuat, nhom_thuoc, dinh_muc_toi_thieu } = req.body;
    // Validation
    const errors = [];
    if (!ten_thuoc || !ten_thuoc.trim()) errors.push('Tên thuốc không được để trống');
    if (!don_vi_tinh || !don_vi_tinh.trim()) errors.push('Đơn vị tính không được để trống');
    if (!ma_bhyt || ma_bhyt.trim().length !== 15) errors.push('Mã BHYT phải đủ 15 ký tự');
    if (!don_gia_thau || parseFloat(don_gia_thau) <= 0) errors.push('Đơn giá thầu phải là số dương');

    // Kiểm tra mã BHYT trùng
    const existing = await Drug.checkDuplicateBhyt(ma_bhyt.trim(), id && id !== '' ? id : null);
    if (existing.length > 0) errors.push('Mã BHYT đã tồn tại trong hệ thống');

    if (errors.length > 0) {
      req.flash('error', errors.join('. '));
      return res.redirect(id ? `/danh-muc-thuoc/sua/${id}` : '/danh-muc-thuoc/them');
    }

    const data = { ma_bhyt: ma_bhyt.trim(), ten_thuoc: ten_thuoc.trim(), hoat_chat, ham_luong, don_vi_tinh, duong_dung, don_gia_thau: parseFloat(don_gia_thau), ty_le_thanh_toan: parseInt(ty_le_thanh_toan) || 100, so_dang_ky, nuoc_san_xuat, hang_san_xuat, nhom_thuoc, dinh_muc_toi_thieu: parseInt(dinh_muc_toi_thieu) || 10 };

    if (id && id !== '') {
      await Drug.update(id, data);
      req.flash('success', 'Cập nhật thuốc thành công');
    } else {
      await Drug.create(data);
      req.flash('success', 'Thêm thuốc thành công');
    }
    res.redirect('/danh-muc-thuoc');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Lỗi lưu dữ liệu: ' + err.message);
    res.redirect('/danh-muc-thuoc');
  }
};

// Xóa thuốc (soft delete)
exports.remove = async (req, res) => {
  try {
    await Drug.softDelete(req.params.id);
    req.flash('success', 'Đã xóa thuốc khỏi danh mục');
  } catch (err) {
    req.flash('error', 'Lỗi xóa thuốc');
  }
  res.redirect('/danh-muc-thuoc');
};
