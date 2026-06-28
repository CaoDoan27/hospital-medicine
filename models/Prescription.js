const db = require('../config/database');

class Prescription {
  static async count(where, params) {
    const [[{ total }]] = await db.query(`
      SELECT COUNT(*) AS total FROM don_thuoc dt
      JOIN dot_dieu_tri d ON dt.dot_dieu_tri_id = d.id
      JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
      ${where}
    `, params);
    return total;
  }

  static async findAll(where, params, limit, offset) {
    const [prescriptions] = await db.query(`
      SELECT dt.*, bn.ho_ten, bn.so_the_bhyt, bn.ma_benh_nhan, d.ma_benh, d.chan_doan_lam_sang
      FROM don_thuoc dt
      JOIN dot_dieu_tri d ON dt.dot_dieu_tri_id = d.id
      JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
      ${where}
      ORDER BY dt.ngay_ke DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);
    return prescriptions;
  }

  static async findById(id, bsName) {
    const [rows] = await db.query(`
      SELECT dt.id, dt.bac_si_ke, dt.ngay_ke, dt.trang_thai, dt.chan_doan,
             bn.ma_benh_nhan, bn.ho_ten, bn.ngay_sinh, bn.gioi_tinh, bn.so_the_bhyt, bn.dia_chi, bn.dien_thoai,
             d.id as dot_id, d.ma_benh, d.chan_doan_lam_sang, d.muc_huong
      FROM don_thuoc dt
      JOIN dot_dieu_tri d ON dt.dot_dieu_tri_id = d.id
      JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
      WHERE dt.id = ? AND dt.bac_si_ke = ?
    `, [id, bsName]);
    return rows;
  }

  static async getItems(donThuocId) {
    const [items] = await db.query(`
      SELECT ct.*, t.ten_thuoc, t.ham_luong, t.don_vi_tinh FROM chi_tiet_don_thuoc ct
      JOIN thuoc t ON ct.thuoc_id = t.id WHERE ct.don_thuoc_id = ?
    `, [donThuocId]);
    return items;
  }

  static async createTreatment(conn, data) {
    const [result] = await conn.query('INSERT INTO dot_dieu_tri SET ?', data);
    return result;
  }

  static async create(conn, data) {
    const [result] = await conn.query('INSERT INTO don_thuoc SET ?', data);
    return result;
  }

  static async createDetail(conn, data) {
    await conn.query('INSERT INTO chi_tiet_don_thuoc SET ?', data);
  }

  static async checkStatus(id, bsName) {
    const [check] = await db.query(
      "SELECT trang_thai FROM don_thuoc WHERE id = ? AND bac_si_ke = ?",
      [id, bsName]
    );
    return check;
  }

  static async cancel(id) {
    await db.query("UPDATE don_thuoc SET trang_thai = 'huy' WHERE id = ?", [id]);
  }
}

module.exports = Prescription;
