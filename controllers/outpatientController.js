const db = require('../config/database');
const Drug = require('../models/Drug');
const BhytService = require('../services/bhytService');
const FefoService = require('../services/fefoService');
const { recordStockMovement } = require('../utils/stockMovement');
const { parsePage, buildPagination, DEFAULT_PAGE_SIZE } = require('../utils/pagination');

const checkKhoNgoaiTru = async (req, res, next) => {
  if (req.session.user.vai_tro === 'duoc_si_kho_le') {
    const [kho] = await db.query('SELECT loai_kho FROM kho WHERE id = ?', [req.session.user.kho_id]);
    if (!kho.length || kho[0].loai_kho !== 'kho_le_ngoai_tru') {
      req.flash('error', 'Bạn không có quyền truy cập Kho lẻ ngoại trú');
      return res.redirect('/dashboard');
    }
  }
  next();
};

// Trang cấp phát ngoại trú
const list = async (req, res) => {
  try {
    const page = parsePage(req.query.page);
    const search = (req.query.search || '').trim();

    let where = "WHERE d.loai_hinh = 'ngoai_tru' AND dt.trang_thai = 'moi'";
    const params = [];
    if (search) {
      where += ' AND (bn.ho_ten LIKE ? OR bn.so_the_bhyt LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const [[{ total }]] = await db.query(`
      SELECT COUNT(*) AS total FROM don_thuoc dt
      JOIN dot_dieu_tri d ON dt.dot_dieu_tri_id = d.id
      JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
      ${where}
    `, params);
    const pagination = buildPagination({ page, total, baseUrl: '/cap-phat-ngoai-tru', extraParams: { search } });
    const [prescriptions] = await db.query(`
      SELECT dt.*, bn.ho_ten, bn.so_the_bhyt, bn.ngay_sinh, d.chan_doan_lam_sang, d.ma_benh, d.muc_huong
      FROM don_thuoc dt
      JOIN dot_dieu_tri d ON dt.dot_dieu_tri_id = d.id
      JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
      ${where}
      ORDER BY dt.ngay_ke DESC
      LIMIT ? OFFSET ?
    `, [...params, DEFAULT_PAGE_SIZE, pagination.offset]);
    res.render('outpatient/index', { title: 'Cấp phát Ngoại trú', prescriptions, pagination, search });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/dashboard'); }
};

// Chi tiết đơn thuốc & tính BHYT
const showPrescription = async (req, res) => {
  try {
    const [prescription] = await db.query(`
      SELECT dt.id, dt.bac_si_ke, dt.ngay_ke, dt.trang_thai, dt.chan_doan,
             bn.ma_benh_nhan, bn.ho_ten, bn.ngay_sinh, bn.gioi_tinh, bn.so_the_bhyt, bn.dia_chi, bn.dien_thoai,
             d.id as dot_dieu_tri_id, d.ma_benh, d.chan_doan_lam_sang, d.muc_huong
      FROM don_thuoc dt
      JOIN dot_dieu_tri d ON dt.dot_dieu_tri_id = d.id
      JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
      WHERE dt.id = ?
    `, [req.params.id]);
    if (!prescription.length) { req.flash('error', 'Không tìm thấy đơn'); return res.redirect('/cap-phat-ngoai-tru'); }

    const rx = prescription[0];
    // Kiểm tra BHYT
    const insuranceData = await BhytService.checkInsuranceCard(rx.so_the_bhyt);
    const mucHuong = await BhytService.determineCoverageRate(rx, rx.ma_benh, insuranceData);

    // Lấy thuốc trong kho lẻ ngoại trú
    const khoId = req.session.user.kho_id;
    const drugs = await Drug.getActiveDrugsWithStock(khoId);

    // Thuốc bác sĩ đã kê
    const [prescribedItems] = await db.query(`
      SELECT ct.thuoc_id, ct.so_luong, ct.lieu_dung, t.ten_thuoc, t.ham_luong, t.don_vi_tinh
      FROM chi_tiet_don_thuoc ct JOIN thuoc t ON ct.thuoc_id = t.id
      WHERE ct.don_thuoc_id = ? ORDER BY t.ten_thuoc
    `, [req.params.id]);

    res.render('outpatient/dispense', {
      title: 'Cấp phát đơn thuốc', rx, insuranceData, mucHuong, drugs, prescribedItems
    });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/cap-phat-ngoai-tru'); }
};

// Xác nhận cấp phát
const dispense = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { don_thuoc_id, muc_huong, items } = req.body;
    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;

    const [rx] = await conn.query(`
      SELECT dt.*, d.id as dot_id, d.ma_benh FROM don_thuoc dt
      JOIN dot_dieu_tri d ON dt.dot_dieu_tri_id = d.id WHERE dt.id = ?
    `, [don_thuoc_id]);

    const khoId = req.session.user.kho_id;

    // Kiểm tra kho đang kiểm kê
    const [khoCheck] = await conn.query('SELECT trang_thai_kho FROM kho WHERE id = ?', [khoId]);
    if (khoCheck.length && khoCheck[0].trang_thai_kho === 'dang_kiem_ke') {
      await conn.rollback();
      req.flash('error', 'Kho đang kiểm kê, không thể cấp phát thuốc');
      return res.redirect(`/cap-phat-ngoai-tru/don/${don_thuoc_id}`);
    }

    for (const item of parsedItems) {
      const thuocId = parseInt(item.thuoc_id);
      const soLuong = parseInt(item.so_luong);
      const [drug] = await conn.query('SELECT * FROM thuoc WHERE id = ?', [thuocId]);

      // FEFO deduction
      const allocation = await FefoService.allocate(thuocId, khoId, soLuong, conn);
      if (!allocation.success) { await conn.rollback(); req.flash('error', `Số lượng tồn kho không đủ để cấp phát ${drug[0].ten_thuoc}`); return res.redirect(`/cap-phat-ngoai-tru/don/${don_thuoc_id}`); }

      // Trừ kho
      await FefoService.deductStock(conn, allocation.allocation);

      // Tính chi phí BHYT
      const costSplit = BhytService.calculateCostSplit(soLuong, drug[0].don_gia_thau, drug[0].don_gia_thau, drug[0].ty_le_thanh_toan, parseInt(muc_huong));

      // Insert chi tiết cấp phát cho từng lô FEFO
      for (const alloc of allocation.allocation) {
        const allocCost = BhytService.calculateCostSplit(alloc.so_luong_xuat, drug[0].don_gia_thau, drug[0].don_gia_thau, drug[0].ty_le_thanh_toan, parseInt(muc_huong));
        await conn.query('INSERT INTO chi_tiet_cap_phat SET ?', {
          don_thuoc_id, thuoc_id: thuocId, lo_thuoc_id: alloc.lo_thuoc_id,
          kho_xuat_id: khoId, so_luong_phat: alloc.so_luong_xuat, don_gia: drug[0].don_gia_thau,
          tien_bhyt_chi_tra: allocCost.tien_bhyt, tien_bn_dong_chi_tra: allocCost.tien_bn_cung_tra,
          tien_bn_tu_tuc: allocCost.tien_bn_tu_tuc, nguoi_cap_phat_id: req.session.user.id
        });
      }

      // Insert chi phí BHYT
      await conn.query('INSERT INTO chi_phi_bhyt SET ?', {
        dot_dieu_tri_id: rx[0].dot_id, thuoc_id: thuocId, so_luong: soLuong,
        don_gia: drug[0].don_gia_thau, ty_le_tt: drug[0].ty_le_thanh_toan,
        muc_huong: parseInt(muc_huong), tien_bhyt: costSplit.tien_bhyt,
        tien_bn_cung_tra: costSplit.tien_bn_cung_tra, tien_bn_tu_tuc: costSplit.tien_bn_tu_tuc,
        nguon: 'ngoai_tru'
      });

      // Biến động kho
      await recordStockMovement(conn, {
        kho_id: khoId, thuoc_id: thuocId, loai_bien_dong: 'xuat_cap_phat',
        so_luong: soLuong, phieu_lien_quan: `DT-${don_thuoc_id}`, nguoi_thuc_hien_id: req.session.user.id
      });
    }

    await conn.query("UPDATE don_thuoc SET trang_thai = 'da_cap_phat' WHERE id = ?", [don_thuoc_id]);
    await conn.commit();
    req.flash('success', 'Cấp phát thành công. Đã trừ kho và ghi nhận chi phí BHYT.');
    res.redirect('/cap-phat-ngoai-tru');
  } catch (err) { await conn.rollback(); console.error(err); req.flash('error', 'Lỗi: ' + err.message); res.redirect('/cap-phat-ngoai-tru'); }
  finally { conn.release(); }
};

module.exports = { checkKhoNgoaiTru, list, showPrescription, dispense };
