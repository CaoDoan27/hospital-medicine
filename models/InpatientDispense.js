const db = require('../config/database');

class InpatientDispense {
  static async getPendingPhieuLinh() {
    const [phieuLinh] = await db.query(`
      SELECT pl.*, nd.ho_ten as nguoi_lap FROM phieu_linh pl
      JOIN nguoi_dung nd ON pl.nguoi_lap_id = nd.id
      WHERE pl.trang_thai = 'dang_cho_duyet' ORDER BY pl.ngay_lap DESC
    `);
    return phieuLinh;
  }

  static async getCompletedPhieuLinh() {
    const [phieuLinh] = await db.query(`
      SELECT pl.*, nd.ho_ten as nguoi_lap FROM phieu_linh pl
      JOIN nguoi_dung nd ON pl.nguoi_lap_id = nd.id
      WHERE pl.trang_thai = 'da_cap_phat' ORDER BY pl.ngay_lap DESC LIMIT 20
    `);
    return phieuLinh;
  }

  static async getPhieuLinh(id) {
    const [phieu] = await db.query('SELECT * FROM phieu_linh WHERE id = ?', [id]);
    return phieu;
  }

  static async getPhieuLinhDetails(id) {
    const [details] = await db.query(`
      SELECT ct.*, t.ten_thuoc, t.ham_luong, t.don_vi_tinh, t.don_gia_thau
      FROM chi_tiet_phieu_linh ct JOIN thuoc t ON ct.thuoc_id = t.id WHERE ct.phieu_linh_id = ?
    `, [id]);
    return details;
  }

  static async checkPhieuLinhValid(conn, id) {
    const [rows] = await conn.query(
      "SELECT id FROM phieu_linh WHERE id = ? AND trang_thai = 'dang_cho_duyet'", [id]
    );
    return rows;
  }

  static async getPhieuLinhDetailsWithConn(conn, id) {
    const [details] = await conn.query(`
      SELECT ct.*, t.don_gia_thau, t.ty_le_thanh_toan, t.ten_thuoc
      FROM chi_tiet_phieu_linh ct
      JOIN thuoc t ON ct.thuoc_id = t.id WHERE ct.phieu_linh_id = ?
    `, [id]);
    return details;
  }

  static async getYLenhLinks(conn, phieuLinhId) {
    const [rows] = await conn.query(
      'SELECT y_lenh_id FROM phieu_linh_y_lenh WHERE phieu_linh_id = ?', [phieuLinhId]
    );
    return rows;
  }

  static async updateDetailQty(conn, id, qty) {
    await conn.query('UPDATE chi_tiet_phieu_linh SET so_luong_cap_phat = ? WHERE id = ?', [qty, id]);
  }

  static async updatePhieuLinhStatus(conn, id, status) {
    await conn.query("UPDATE phieu_linh SET trang_thai = ? WHERE id = ?", [status, id]);
  }

  static async updateYLenhStatus(conn, yLenhIds, status) {
    await conn.query("UPDATE y_lenh SET trang_thai = ? WHERE id IN (?)", [status, yLenhIds]);
  }

  static async getYLenhCostDetails(conn, yLenhIds) {
    const [details] = await conn.query(`
      SELECT yl.id, yl.dot_dieu_tri_id, yl.thuoc_id, yl.so_luong,
             t.don_gia_thau, t.ty_le_thanh_toan,
             d.ma_benh, d.muc_huong, bn.so_the_bhyt
      FROM y_lenh yl
      JOIN thuoc t ON yl.thuoc_id = t.id
      JOIN dot_dieu_tri d ON yl.dot_dieu_tri_id = d.id
      JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
      WHERE yl.id IN (?)
    `, [yLenhIds]);
    return details;
  }

  static async createCost(conn, data) {
    await conn.query('INSERT INTO chi_phi_bhyt SET ?', data);
  }
}

module.exports = InpatientDispense;
