const db = require('../config/database');
const Transfer = require('../models/Transfer');
const Warehouse = require('../models/Warehouse');
const FefoService = require('../services/fefoService');
const { recordStockMovement } = require('../utils/stockMovement');
const { parsePage, buildPagination, DEFAULT_PAGE_SIZE } = require('../utils/pagination');

// Danh sách phiếu điều chuyển
exports.list = async (req, res) => {
  try {
    const page = parsePage(req.query.page);
    const total = await Transfer.count();
    const pagination = buildPagination({ page, total, baseUrl: '/dieu-chuyen' });
    const transfers = await Transfer.findAll(DEFAULT_PAGE_SIZE, pagination.offset);
    res.render('transfer/index', { title: 'Điều chuyển nội bộ', transfers, pagination });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi tải dữ liệu'); res.redirect('/dashboard'); }
};

// Form tạo phiếu dự trù (Kho lẻ)
exports.showCreate = async (req, res) => {
  try {
    const khoTongRows = await Warehouse.findKhoTong();
    const khoTongId = khoTongRows.length ? khoTongRows[0].id : 1;
    const drugs = await Transfer.getDrugsWithStock(khoTongId);
    const warehouses = await Transfer.getReceivingWarehouses();
    res.render('transfer/form', { title: 'Lập phiếu dự trù', drugs, warehouses });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/dieu-chuyen'); }
};

// Lưu phiếu dự trù
exports.save = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { kho_nhan_id, ghi_chu, items } = req.body;
    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
    if (!parsedItems || parsedItems.length === 0) { req.flash('error', 'Phiếu phải có ít nhất 1 thuốc'); return res.redirect('/dieu-chuyen/tao'); }

    // Tìm kho tổng động từ DB
    const khoTongRows = await Warehouse.findKhoTongWithConn(conn);
    if (!khoTongRows.length) { await conn.rollback(); req.flash('error', 'Không tìm thấy Kho tổng trong hệ thống'); return res.redirect('/dieu-chuyen/tao'); }
    const khoTongId = khoTongRows[0].id;

    const result = await Transfer.create(conn, {
      loai_phieu: 'DIEU_CHUYEN', kho_xuat_id: khoTongId, kho_nhan_id,
      nguoi_lap_id: req.session.user.id, trang_thai: 'cho_duyet', ghi_chu
    });

    for (const item of parsedItems) {
      await Transfer.createDetail(conn, result.insertId, item.thuoc_id, item.so_luong);
    }

    await conn.commit();
    req.flash('success', 'Đã gửi yêu cầu tới Kho tổng');
    res.redirect('/dieu-chuyen');
  } catch (err) { await conn.rollback(); console.error(err); req.flash('error', 'Lỗi: ' + err.message); res.redirect('/dieu-chuyen/tao'); }
  finally { conn.release(); }
};

// API: Lấy chi tiết phiếu để duyệt (có kèm tồn kho)
exports.getApprovalDetails = async (req, res) => {
  try {
    const details = await Transfer.getDetailsForApproval(req.params.id);
    res.json({ success: true, data: details });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Lỗi lấy chi tiết phiếu' });
  }
};

// Duyệt xuất (Kho tổng) - có điều chỉnh số lượng thực xuất
exports.approve = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const phieuId = req.params.id;
    const { items } = req.body;
    const adjustedItems = typeof items === 'string' ? JSON.parse(items) : items;

    // Lấy phiếu điều chuyển để biết kho xuất
    const phieuDC = await Transfer.findById(conn, phieuId);
    if (!phieuDC.length) { await conn.rollback(); req.flash('error', 'Không tìm thấy phiếu điều chuyển'); return res.redirect('/dieu-chuyen'); }
    const khoXuatId = phieuDC[0].kho_xuat_id;

    // Kiểm tra kho xuất đang kiểm kê
    const khoXuatCheck = await Warehouse.checkStatus(conn, khoXuatId);
    if (khoXuatCheck.length && khoXuatCheck[0].trang_thai_kho === 'dang_kiem_ke') {
      await conn.rollback();
      req.flash('error', 'Kho xuất đang kiểm kê, không thể duyệt điều chuyển');
      return res.redirect('/dieu-chuyen');
    }

    const details = await Transfer.getDetails(conn, phieuId);

    // Build a map of adjusted quantities: detail_id -> so_luong_duyet
    const adjustedMap = {};
    if (adjustedItems && adjustedItems.length) {
      adjustedItems.forEach(ai => { adjustedMap[ai.id] = parseInt(ai.so_luong_duyet); });
    }

    for (const item of details) {
      // Use adjusted quantity if provided, otherwise fall back to requested
      const soLuongDuyet = adjustedMap[item.id] !== undefined ? adjustedMap[item.id] : item.so_luong_yeu_cau;
      
      // Skip if quantity is 0
      if (soLuongDuyet <= 0) continue;

      const result = await FefoService.allocate(item.thuoc_id, khoXuatId, soLuongDuyet, conn);
      if (!result.success) {
        await conn.rollback();
        req.flash('error', `Kho tổng không đủ số lượng tồn cho ${item.ten_thuoc}`);
        return res.redirect('/dieu-chuyen');
      }
      await FefoService.deductStock(conn, result.allocation);

      // Lưu chi tiết từng lô FEFO phân bổ
      for (let i = 0; i < result.allocation.length; i++) {
        const alloc = result.allocation[i];
        if (i === 0) {
          await Transfer.updateDetailAllocation(conn, item.id, {
            so_luong_thuc_xuat: alloc.so_luong_xuat, lo_thuoc_id: alloc.lo_thuoc_id,
            so_lo: alloc.so_lo, han_dung: alloc.han_dung
          });
        } else {
          await Transfer.addDetailAllocation(conn, {
            phieu_id: phieuId, thuoc_id: item.thuoc_id, lo_thuoc_id: alloc.lo_thuoc_id,
            so_lo: alloc.so_lo, han_dung: alloc.han_dung, so_luong_thuc_xuat: alloc.so_luong_xuat
          });
        }
      }

      const totalExported = result.allocation.reduce((s, a) => s + a.so_luong_xuat, 0);
      await recordStockMovement(conn, {
        kho_id: khoXuatId, thuoc_id: item.thuoc_id, loai_bien_dong: 'xuat_dieu_chuyen',
        so_luong: totalExported, phieu_lien_quan: `DC-${phieuId}`, nguoi_thuc_hien_id: req.session.user.id
      });
    }

    await Transfer.updateStatus(conn, phieuId, 'dang_van_chuyen', req.session.user.id);
    await conn.commit();
    req.flash('success', 'Duyệt xuất thành công');
  } catch (err) { await conn.rollback(); console.error(err); req.flash('error', 'Lỗi duyệt: ' + err.message); }
  finally { conn.release(); }
  res.redirect('/dieu-chuyen');
};

// Xác nhận nhập kho (Kho lẻ)
exports.confirm = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const phieuId = req.params.id;
    const phieu = await Transfer.findById(conn, phieuId);
    const details = await Transfer.getConfirmDetails(conn, phieuId);

    for (const item of details) {
      if (item.so_luong_thuc_xuat > 0) {
        await Transfer.addLotToWarehouse(conn, {
          thuoc_id: item.thuoc_id, so_lo: item.so_lo, han_dung: item.han_dung,
          lo_thuoc_id: item.lo_thuoc_id, kho_nhan_id: phieu[0].kho_nhan_id,
          so_luong: item.so_luong_thuc_xuat
        });
        await recordStockMovement(conn, {
          kho_id: phieu[0].kho_nhan_id, thuoc_id: item.thuoc_id, loai_bien_dong: 'nhap_dieu_chuyen',
          so_luong: item.so_luong_thuc_xuat, phieu_lien_quan: `DC-${phieuId}`, nguoi_thuc_hien_id: req.session.user.id
        });
      }
    }

    await Transfer.completeTransfer(conn, phieuId);
    await conn.commit();
    req.flash('success', 'Nhập kho lẻ thành công. Tồn kho đã cập nhật.');
  } catch (err) { await conn.rollback(); console.error(err); req.flash('error', 'Lỗi: ' + err.message); }
  finally { conn.release(); }
  res.redirect('/dieu-chuyen');
};

// API: Lấy chi tiết phiếu điều chuyển
exports.getDetails = async (req, res) => {
  try {
    const details = await Transfer.getDetailsForApi(req.params.id);
    res.json({ success: true, data: details });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Lỗi lấy chi tiết phiếu' });
  }
};
