const db = require('../config/database');
const ImportReceipt = require('../models/ImportReceipt');
const Warehouse = require('../models/Warehouse');
const Drug = require('../models/Drug');
const { recordStockMovement } = require('../utils/stockMovement');
const { parsePage, buildPagination, DEFAULT_PAGE_SIZE } = require('../utils/pagination');

// Danh sách phiếu nhập
exports.list = async (req, res) => {
  try {
    const page = parsePage(req.query.page);
    const total = await ImportReceipt.count();
    const pagination = buildPagination({ page, total, baseUrl: '/nhap-kho' });
    const receipts = await ImportReceipt.findAll(DEFAULT_PAGE_SIZE, pagination.offset);
    res.render('warehouse-import/index', { title: 'Nhập kho Thuốc', receipts, pagination });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi tải dữ liệu'); res.redirect('/dashboard'); }
};

// Form tạo phiếu nhập
exports.showCreate = async (req, res) => {
  try {
    const suppliers = await Warehouse.getSuppliers();
    const drugs = await Drug.getActiveDrugs();
    const warehouses = await Warehouse.findByType('kho_tong');
    res.render('warehouse-import/form', { title: 'Tạo phiếu nhập kho', suppliers, drugs, warehouses });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi tải dữ liệu'); res.redirect('/nhap-kho'); }
};

// Lưu phiếu nhập
exports.save = async (req, res) => {
  // --- Validation cơ bản trước khi mở connection (tránh connection leak) ---
  const { so_hoa_don, nha_cung_cap_id, kho_id, ghi_chu, items } = req.body;
  if (!so_hoa_don || !nha_cung_cap_id) { req.flash('error', 'Số hóa đơn và Nhà cung cấp không được để trống'); return res.redirect('/nhap-kho/tao'); }
  const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
  if (!parsedItems || parsedItems.length === 0) { req.flash('error', 'Phiếu nhập phải có ít nhất 1 thuốc'); return res.redirect('/nhap-kho/tao'); }
  for (const item of parsedItems) {
    if (!item.so_lo) { req.flash('error', 'Số lô bắt buộc để quản lý FEFO'); return res.redirect('/nhap-kho/tao'); }
    const hanDung = new Date(item.han_dung);
    const sixMonthsLater = new Date(); sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
    if (hanDung < sixMonthsLater) { req.flash('error', `Hạn dùng lô ${item.so_lo} phải lớn hơn ngày hiện tại ít nhất 6 tháng`); return res.redirect('/nhap-kho/tao'); }
    if (parseInt(item.so_luong) <= 0) { req.flash('error', 'Số lượng phải là số nguyên dương'); return res.redirect('/nhap-kho/tao'); }
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Validate giá nhập <= giá thầu (cần DB)
    for (const item of parsedItems) {
      const drug = await ImportReceipt.getDrugPrice(conn, item.thuoc_id);
      if (drug.length > 0 && parseFloat(item.don_gia) > drug[0].don_gia_thau) {
        throw new Error('Đơn giá nhập không được cao hơn đơn giá trúng thầu');
      }
    }

    let tongTien = 0;
    // Insert phiếu nhập
    const result = await ImportReceipt.create(conn, { so_hoa_don, nha_cung_cap_id, kho_id: kho_id || 1, nguoi_lap_id: req.session.user.id, ghi_chu });
    const phieuId = result.insertId;

    // Insert chi tiết & cập nhật tồn kho
    for (const item of parsedItems) {
      const thanhTien = parseInt(item.so_luong) * parseFloat(item.don_gia) * (1 + parseFloat(item.thue_vat || 0) / 100);
      tongTien += thanhTien;

      await ImportReceipt.createDetail(conn, {
        phieu_nhap_id: phieuId, thuoc_id: item.thuoc_id, so_lo: item.so_lo,
        han_dung: item.han_dung, so_luong: item.so_luong, don_gia: item.don_gia, thue_vat: item.thue_vat || 0
      });

      // Cập nhật hoặc tạo mới lô thuốc
      await ImportReceipt.upsertLot(conn, {
        thuoc_id: item.thuoc_id, so_lo: item.so_lo, han_dung: item.han_dung,
        gia_nhap: item.don_gia, thue_vat: item.thue_vat || 0,
        kho_id: kho_id || 1, so_luong: item.so_luong
      });

      // Ghi biến động kho
      await recordStockMovement(conn, {
        kho_id: kho_id || 1, thuoc_id: item.thuoc_id,
        loai_bien_dong: 'nhap', so_luong: item.so_luong,
        phieu_lien_quan: `NK-${so_hoa_don}`, nguoi_thuc_hien_id: req.session.user.id
      });
    }

    await ImportReceipt.updateTotal(conn, phieuId, tongTien);
    await conn.commit();
    req.flash('success', 'Nhập kho thành công và đã cập nhật tồn kho');
    res.redirect('/nhap-kho');
  } catch (err) {
    await conn.rollback();
    console.error(err);
    req.flash('error', 'Lỗi nhập kho: ' + err.message);
    res.redirect('/nhap-kho/tao');
  } finally { conn.release(); }
};

// API: Lấy chi tiết phiếu nhập
exports.getDetails = async (req, res) => {
  try {
    const details = await ImportReceipt.getDetails(req.params.id);
    res.json({ success: true, data: details });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Lỗi lấy chi tiết phiếu nhập' });
  }
};

// API: Lấy thông tin thuốc
exports.getDrug = async (req, res) => {
  const drug = await ImportReceipt.findDrugById(req.params.id);
  res.json(drug);
};
