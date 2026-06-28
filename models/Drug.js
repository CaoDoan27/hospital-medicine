const db = require('../config/database');

class Drug {
  static async count(whereSql, params) {
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM thuoc' + whereSql, params);
    return total;
  }

  static async findAll(whereSql, params, limit, offset) {
    const [drugs] = await db.query(
      'SELECT * FROM thuoc' + whereSql + ' ORDER BY ten_thuoc ASC LIMIT ? OFFSET ?',
      [...params, limit, offset]
    );
    return drugs;
  }

  static async findById(id) {
    const [drugs] = await db.query('SELECT * FROM thuoc WHERE id = ?', [id]);
    return drugs;
  }

  static async getGroups() {
    const [groups] = await db.query(
      'SELECT DISTINCT nhom_thuoc FROM thuoc WHERE trang_thai = 1 AND nhom_thuoc IS NOT NULL ORDER BY nhom_thuoc'
    );
    return groups;
  }

  static async getIcd10() {
    const [icd10] = await db.query('SELECT * FROM danh_muc_icd10 ORDER BY ma_benh');
    return icd10;
  }

  static async checkDuplicateBhyt(maBhyt, excludeId) {
    if (excludeId) {
      const [existing] = await db.query('SELECT id FROM thuoc WHERE ma_bhyt = ? AND id != ?', [maBhyt, excludeId]);
      return existing;
    }
    const [existing] = await db.query('SELECT id FROM thuoc WHERE ma_bhyt = ?', [maBhyt]);
    return existing;
  }

  static async create(data) {
    const [result] = await db.query('INSERT INTO thuoc SET ?', [data]);
    return result;
  }

  static async update(id, data) {
    const [result] = await db.query('UPDATE thuoc SET ? WHERE id = ?', [data, id]);
    return result;
  }

  static async softDelete(id) {
    await db.query('UPDATE thuoc SET trang_thai = 0 WHERE id = ?', [id]);
  }

  static async getActiveDrugs() {
    const [drugs] = await db.query(
      'SELECT id, ma_bhyt, ten_thuoc, ham_luong, don_vi_tinh, don_gia_thau FROM thuoc WHERE trang_thai = 1 ORDER BY ten_thuoc'
    );
    return drugs;
  }

  static async getActiveDrugsWithStock(khoId) {
    const [drugs] = await db.query(`
      SELECT t.*, COALESCE(SUM(l.so_luong_ton),0) as ton_kho FROM thuoc t
      LEFT JOIN lo_thuoc l ON t.id = l.thuoc_id AND l.kho_id = ? AND l.han_dung > CURDATE()
      WHERE t.trang_thai = 1 GROUP BY t.id ORDER BY t.ten_thuoc
    `, [khoId]);
    return drugs;
  }
}

module.exports = Drug;
