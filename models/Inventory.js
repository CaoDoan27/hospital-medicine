const db = require('../config/database');

class Inventory {
  static async getWarehouses(userId, vaiTro, khoId) {
    // Luôn trả về đúng kho mà user quản lý, không phân biệt vai trò
    const [warehouses] = await db.query('SELECT * FROM kho WHERE id = ?', [khoId]);
    return warehouses;
  }

  static async getExpiringDrugs(khoId) {
    const [drugs] = await db.query(`
      SELECT t.ten_thuoc, t.don_vi_tinh, l.so_lo, l.han_dung, l.so_luong_ton, k.ten_kho
      FROM lo_thuoc l JOIN thuoc t ON l.thuoc_id = t.id JOIN kho k ON l.kho_id = k.id
      WHERE l.kho_id = ? AND l.so_luong_ton > 0
        AND (l.han_dung <= DATE_ADD(CURDATE(), INTERVAL 6 MONTH))
      ORDER BY l.han_dung ASC
    `, [khoId]);
    return drugs;
  }

  static async getLowStock(khoId) {
    const [drugs] = await db.query(`
      SELECT t.ten_thuoc, t.don_vi_tinh, t.dinh_muc_toi_thieu, COALESCE(SUM(l.so_luong_ton),0) as tong_ton
      FROM thuoc t LEFT JOIN lo_thuoc l ON t.id = l.thuoc_id AND l.kho_id = ?
      WHERE t.trang_thai = 1 GROUP BY t.id HAVING tong_ton < t.dinh_muc_toi_thieu ORDER BY tong_ton
    `, [khoId]);
    return drugs;
  }

  static async getSessions(khoId, isKhoLe) {
    let sessionCondition = '';
    let sessionParams = [];
    if (isKhoLe) {
      sessionCondition = 'WHERE kk.kho_id = ?';
      sessionParams.push(khoId);
    }
    const [sessions] = await db.query(`
      SELECT kk.*, k.ten_kho, nd.ho_ten FROM kiem_ke kk
      JOIN kho k ON kk.kho_id = k.id JOIN nguoi_dung nd ON kk.nguoi_kiem_ke_id = nd.id
      ${sessionCondition}
      ORDER BY kk.ngay_bat_dau DESC LIMIT 10
    `, sessionParams);
    return sessions;
  }

  static async createSession(conn, data) {
    const [result] = await conn.query('INSERT INTO kiem_ke SET ?', data);
    return result;
  }

  static async snapshotLots(conn, kiemKeId, khoId) {
    const [lots] = await conn.query('SELECT * FROM lo_thuoc WHERE kho_id = ? AND so_luong_ton > 0', [khoId]);
    for (const lot of lots) {
      await conn.query(
        'INSERT INTO chi_tiet_kiem_ke (kiem_ke_id, thuoc_id, lo_thuoc_id, so_lo, so_luong_he_thong) VALUES (?,?,?,?,?)',
        [kiemKeId, lot.thuoc_id, lot.id, lot.so_lo, lot.so_luong_ton]
      );
    }
    return lots;
  }

  static async getSessionById(id) {
    const [session] = await db.query(
      'SELECT kk.*, k.ten_kho FROM kiem_ke kk JOIN kho k ON kk.kho_id = k.id WHERE kk.id = ?',
      [id]
    );
    return session;
  }

  static async getSessionDetails(id) {
    const [details] = await db.query(`
      SELECT ck.*, t.ten_thuoc, t.don_vi_tinh FROM chi_tiet_kiem_ke ck
      JOIN thuoc t ON ck.thuoc_id = t.id WHERE ck.kiem_ke_id = ? ORDER BY t.ten_thuoc
    `, [id]);
    return details;
  }

  static async getSessionFullInfo(id) {
    const [sessions] = await db.query(`
      SELECT kk.*, k.ten_kho, nd.ho_ten FROM kiem_ke kk
      JOIN kho k ON kk.kho_id = k.id JOIN nguoi_dung nd ON kk.nguoi_kiem_ke_id = nd.id
      WHERE kk.id = ?
    `, [id]);
    return sessions;
  }

  static async getSessionByIdWithConn(conn, id) {
    const [session] = await conn.query('SELECT * FROM kiem_ke WHERE id = ?', [id]);
    return session;
  }

  static async updateDetail(conn, id, slThucTe, lyDo, hinhAnh) {
    const updateFields = { so_luong_thuc_te: slThucTe };
    if (lyDo !== undefined) updateFields.ly_do = lyDo;
    if (hinhAnh !== undefined) updateFields.hinh_anh = hinhAnh;
    await conn.query('UPDATE chi_tiet_kiem_ke SET ? WHERE id = ?', [updateFields, id]);
  }

  static async getLot(conn, loThuocId) {
    const [lot] = await conn.query('SELECT so_luong_ton, thuoc_id FROM lo_thuoc WHERE id = ?', [loThuocId]);
    return lot;
  }

  static async updateLotStock(conn, loThuocId, slThucTe) {
    await conn.query('UPDATE lo_thuoc SET so_luong_ton = ? WHERE id = ?', [slThucTe, loThuocId]);
  }

  static async completeSession(conn, id) {
    await conn.query("UPDATE kiem_ke SET trang_thai = 'hoan_thanh', ngay_ket_thuc = NOW() WHERE id = ?", [id]);
  }
}

module.exports = Inventory;
