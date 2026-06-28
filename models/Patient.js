const db = require('../config/database');

class Patient {
  static async search(query) {
    const [rows] = await db.query(`
      SELECT id, ma_benh_nhan, ho_ten, ngay_sinh, gioi_tinh, so_the_bhyt, dia_chi, dien_thoai
      FROM benh_nhan
      WHERE ho_ten LIKE ? OR ma_benh_nhan LIKE ? OR so_the_bhyt LIKE ?
      ORDER BY ho_ten LIMIT 20
    `, [`%${query}%`, `%${query}%`, `%${query}%`]);
    return rows;
  }

  static async create(conn, data) {
    const [result] = await conn.query('INSERT INTO benh_nhan SET ?', data);
    return result;
  }

  static async findById(conn, id) {
    const [rows] = await conn.query('SELECT * FROM benh_nhan WHERE id = ?', [id]);
    return rows;
  }
}

module.exports = Patient;
