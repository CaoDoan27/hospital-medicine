const db = require('../config/database');

class EmergencyCabinet {
  static async getKhoInfo(khoId) {
    const [rows] = await db.query("SELECT * FROM kho WHERE id = ?", [khoId]);
    return rows;
  }

  static async getStock(khoId) {
    const [stock] = await db.query(`
      SELECT tt.*, t.ten_thuoc, t.ham_luong, t.don_vi_tinh, t.don_gia_thau, t.ty_le_thanh_toan
      FROM ton_kho_tu_truc tt JOIN thuoc t ON tt.thuoc_id = t.id
      WHERE tt.kho_id = ? AND tt.so_luong_ton > 0
        AND (tt.han_dung IS NULL OR tt.han_dung > CURDATE())
      ORDER BY t.ten_thuoc
    `, [khoId]);
    return stock;
  }

  static async getPatients(khoa) {
    const [patients] = await db.query(`
      SELECT bn.*, d.id as dot_id, d.ma_benh, d.chan_doan_lam_sang, d.muc_huong, d.khoa
      FROM dot_dieu_tri d JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
      WHERE d.loai_hinh = 'noi_tru' AND d.trang_thai = 'dang_dieu_tri' AND d.khoa = ?
    `, [khoa]);
    return patients;
  }

  static async getStockItem(conn, khoId, thuocId, soLuong) {
    const [stockItem] = await conn.query(
      'SELECT * FROM ton_kho_tu_truc WHERE kho_id = ? AND thuoc_id = ? AND so_luong_ton >= ? AND (han_dung IS NULL OR han_dung > CURDATE())',
      [khoId, thuocId, soLuong]
    );
    return stockItem;
  }

  static async deductStock(conn, id, soLuong) {
    await conn.query('UPDATE ton_kho_tu_truc SET so_luong_ton = so_luong_ton - ? WHERE id = ?', [soLuong, id]);
  }

  static async getDrug(conn, thuocId) {
    const [drug] = await conn.query('SELECT * FROM thuoc WHERE id = ?', [thuocId]);
    return drug;
  }

  static async getDotDieuTri(conn, id) {
    const [rows] = await conn.query('SELECT * FROM dot_dieu_tri WHERE id = ?', [id]);
    return rows;
  }

  static async getPatientById(conn, id) {
    const [rows] = await conn.query('SELECT * FROM benh_nhan WHERE id = ?', [id]);
    return rows;
  }

  static async createCost(conn, data) {
    await conn.query('INSERT INTO chi_phi_bhyt SET ?', data);
  }

  static async addPendingReplenishment(conn, data) {
    await conn.query('INSERT INTO hang_cho_hoan_ung SET ?', data);
  }
}

module.exports = EmergencyCabinet;
