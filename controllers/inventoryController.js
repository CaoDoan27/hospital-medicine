const db = require('../config/database');
const Inventory = require('../models/Inventory');
const Warehouse = require('../models/Warehouse');
const { recordStockMovement } = require('../utils/stockMovement');

// Trang kiểm kê & cảnh báo
exports.index = async (req, res) => {
  try {
    // Chỉ dùng kho được gán cho user hiện tại (bất kể vai trò)
    const khoId = req.session.user.kho_id || 1;
    
    const warehouses = await Inventory.getWarehouses(req.session.user.id, req.session.user.vai_tro, khoId);
    const expiringDrugs = await Inventory.getExpiringDrugs(khoId);
    const lowStock = await Inventory.getLowStock(khoId);
    const isKhoLe = req.session.user.vai_tro === 'duoc_si_kho_le';
    const sessions = await Inventory.getSessions(khoId, isKhoLe);
    res.render('inventory/index', { title: 'Kiểm kê & Cảnh báo tồn kho', warehouses, expiringDrugs, lowStock, sessions, khoId: parseInt(khoId) });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/dashboard'); }
};

// Bắt đầu kiểm kê
exports.start = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { kho_id } = req.body;
    
    // Bảo mật: Đảm bảo user chỉ kiểm kê đúng kho mình quản lý
    const userKhoId = req.session.user.kho_id || 1;
    if (parseInt(kho_id) !== userKhoId) {
      await conn.rollback();
      req.flash('error', 'Bạn không có quyền kiểm kê kho này.');
      return res.redirect('/kiem-ke');
    }

    // Khóa kho
    await Warehouse.updateStatus(conn, kho_id, 'dang_kiem_ke');
    // Tạo phiên kiểm kê
    const result = await Inventory.createSession(conn, { kho_id, nguoi_kiem_ke_id: req.session.user.id });
    // Chốt số liệu tồn kho
    await Inventory.snapshotLots(conn, result.insertId, kho_id);
    await conn.commit();
    req.flash('success', 'Đã bắt đầu kiểm kê. Kho đã được khóa.');
    res.redirect(`/kiem-ke/thuc-hien/${result.insertId}`);
  } catch (err) { await conn.rollback(); console.error(err); req.flash('error', 'Lỗi'); res.redirect('/kiem-ke'); }
  finally { conn.release(); }
};

// Trang thực hiện kiểm kê
exports.showCheck = async (req, res) => {
  try {
    const session = await Inventory.getSessionById(req.params.id);
    const details = await Inventory.getSessionDetails(req.params.id);
    res.render('inventory/check', { title: 'Thực hiện kiểm kê', session: session[0], details });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/kiem-ke'); }
};

// API: Chi tiết phiên kiểm kê
exports.getSessionDetails = async (req, res) => {
  try {
    const sessions = await Inventory.getSessionFullInfo(req.params.id);
    if (!sessions.length) return res.status(404).json({ success: false, error: 'Không tìm thấy phiên kiểm kê' });
    const details = await Inventory.getSessionDetails(req.params.id);
    res.json({ success: true, session: sessions[0], details });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Lỗi lấy chi tiết kiểm kê' });
  }
};

// Hoàn tất kiểm kê
exports.complete = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const kiemKeId = req.params.id;
    const { items } = req.body;
    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;

    // Build a map of uploaded files: key = field name index -> file
    const fileMap = {};
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        // Field name format: hinh_anh_<index>
        const match = file.fieldname.match(/^hinh_anh_(\d+)$/);
        if (match) {
          fileMap[match[1]] = '/uploads/kiem-ke/' + file.filename;
        }
      });
    }

    const session = await Inventory.getSessionByIdWithConn(conn, kiemKeId);

    for (let idx = 0; idx < parsedItems.length; idx++) {
      const item = parsedItems[idx];
      const slThucTe = parseInt(item.so_luong_thuc_te);
      if (isNaN(slThucTe) || slThucTe < 0) continue;

      const lyDo = item.ly_do || null;
      const hinhAnh = fileMap[item.row_index] || item.hinh_anh || null;

      await Inventory.updateDetail(conn, item.id, slThucTe, lyDo, hinhAnh);
      // Cập nhật tồn kho
      if (item.lo_thuoc_id) {
        const lot = await Inventory.getLot(conn, item.lo_thuoc_id);
        await Inventory.updateLotStock(conn, item.lo_thuoc_id, slThucTe);
        const diff = slThucTe - (lot[0]?.so_luong_ton || 0);
        if (diff !== 0) {
          await recordStockMovement(conn, {
            kho_id: session[0].kho_id,
            thuoc_id: lot[0].thuoc_id,
            loai_bien_dong: diff > 0 ? 'kiem_ke_tang' : 'kiem_ke_giam',
            so_luong: Math.abs(diff),
            phieu_lien_quan: `KK-${kiemKeId}`,
            nguoi_thuc_hien_id: req.session.user.id
          });
        }
      }
    }

    await Inventory.completeSession(conn, kiemKeId);
    await Warehouse.updateStatus(conn, session[0].kho_id, 'binh_thuong');
    await conn.commit();
    req.flash('success', 'Hoàn tất kiểm kê và đã điều chỉnh tồn kho');
  } catch (err) { await conn.rollback(); console.error(err); req.flash('error', 'Lỗi: ' + err.message); }
  finally { conn.release(); }
  res.redirect('/kiem-ke');
};
