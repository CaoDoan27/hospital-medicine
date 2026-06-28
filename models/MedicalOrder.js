const db = require('../config/database');

class MedicalOrder {
  static async findPending(khoa, ngay) {
    const [orders] = await db.query(`
      SELECT yl.*, t.ten_thuoc, t.ham_luong, t.don_vi_tinh, bn.ho_ten, d.khoa
      FROM y_lenh yl
      JOIN thuoc t ON yl.thuoc_id = t.id
      JOIN dot_dieu_tri d ON yl.dot_dieu_tri_id = d.id
      JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
      WHERE yl.trang_thai = 'chua_linh' AND d.khoa = ? AND yl.ngay_y_lenh = ?
      ORDER BY bn.ho_ten, t.ten_thuoc
    `, [khoa, ngay]);
    return orders;
  }

  static async getPhieuLinh(khoa) {
    const [phieuLinh] = await db.query(`
      SELECT pl.*, nd.ho_ten as nguoi_lap FROM phieu_linh pl
      JOIN nguoi_dung nd ON pl.nguoi_lap_id = nd.id
      WHERE pl.khoa = ? ORDER BY pl.ngay_lap DESC LIMIT 10
    `, [khoa]);
    return phieuLinh;
  }

  static async getKhoTuTruc(khoId) {
    const [rows] = await db.query("SELECT khoa FROM kho WHERE id = ?", [khoId]);
    return rows;
  }

  static async getKhoTuTrucWithConn(conn, khoId) {
    const [rows] = await conn.query("SELECT khoa FROM kho WHERE id = ?", [khoId]);
    return rows;
  }

  static async createPhieuLinh(conn, data) {
    const [result] = await conn.query('INSERT INTO phieu_linh SET ?', data);
    return result;
  }

  static async groupByDrug(conn, orderIds) {
    const [orders] = await conn.query(
      'SELECT thuoc_id, SUM(so_luong) as tong FROM y_lenh WHERE id IN (?) GROUP BY thuoc_id',
      [orderIds]
    );
    return orders;
  }

  static async createPhieuLinhDetail(conn, phieuLinhId, thuocId, soLuong) {
    await conn.query(
      'INSERT INTO chi_tiet_phieu_linh (phieu_linh_id, thuoc_id, so_luong_yeu_cau) VALUES (?,?,?)',
      [phieuLinhId, thuocId, soLuong]
    );
  }

  static async linkOrders(conn, phieuLinhId, orderIds) {
    for (const orderId of orderIds) {
      await conn.query('INSERT INTO phieu_linh_y_lenh (phieu_linh_id, y_lenh_id) VALUES (?,?)', [phieuLinhId, orderId]);
    }
  }

  static async updateStatus(conn, orderIds, status) {
    await conn.query("UPDATE y_lenh SET trang_thai = ? WHERE id IN (?)", [status, orderIds]);
  }

  static async getPhieuLinhDetail(id) {
    const [phieu] = await db.query(`
      SELECT pl.*, nd.ho_ten as nguoi_lap FROM phieu_linh pl
      JOIN nguoi_dung nd ON pl.nguoi_lap_id = nd.id WHERE pl.id = ?
    `, [id]);
    if (!phieu.length) return { phieu: null, details: [] };
    const [details] = await db.query(`
      SELECT ct.*, t.ten_thuoc, t.ham_luong, t.don_vi_tinh FROM chi_tiet_phieu_linh ct
      JOIN thuoc t ON ct.thuoc_id = t.id WHERE ct.phieu_linh_id = ? ORDER BY t.ten_thuoc
    `, [id]);
    return { phieu: phieu[0], details };
  }
}

module.exports = MedicalOrder;
