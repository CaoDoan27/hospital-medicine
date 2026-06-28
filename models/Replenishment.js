const db = require('../config/database');

class Replenishment {
  static async getKhoInfo(khoId) {
    const [rows] = await db.query("SELECT * FROM kho WHERE id = ?", [khoId]);
    return rows;
  }

  static async getPendingItems(khoId) {
    const [items] = await db.query(`
      SELECT h.thuoc_id, t.ten_thuoc, t.don_vi_tinh, SUM(h.so_luong) as tong_sl
      FROM hang_cho_hoan_ung h JOIN thuoc t ON h.thuoc_id = t.id
      WHERE h.kho_tu_truc_id = ? AND h.trang_thai = 'cho_lap_phieu'
      GROUP BY h.thuoc_id ORDER BY t.ten_thuoc
    `, [khoId]);
    return items;
  }

  static async getRequests(khoId) {
    const [requests] = await db.query(`
      SELECT phu.*, nd.ho_ten as nguoi_lap FROM phieu_hoan_ung phu
      JOIN nguoi_dung nd ON phu.nguoi_lap_id = nd.id
      WHERE phu.kho_tu_truc_id = ? ORDER BY phu.ngay_lap DESC LIMIT 10
    `, [khoId]);
    return requests;
  }

  static async createRequest(conn, data) {
    const [result] = await conn.query('INSERT INTO phieu_hoan_ung SET ?', data);
    return result;
  }

  static async createRequestDetail(conn, phieuId, thuocId, soLuong) {
    await conn.query(
      'INSERT INTO chi_tiet_phieu_hoan_ung (phieu_hoan_ung_id, thuoc_id, so_luong_yeu_cau) VALUES (?,?,?)',
      [phieuId, thuocId, parseInt(soLuong)]
    );
  }

  static async updatePendingStatus(conn, khoId, thuocIds) {
    if (thuocIds.length > 0) {
      await conn.query(
        "UPDATE hang_cho_hoan_ung SET trang_thai = 'da_lap_phieu' WHERE kho_tu_truc_id = ? AND trang_thai = 'cho_lap_phieu' AND thuoc_id IN (?)",
        [khoId, thuocIds]
      );
    }
  }

  static async getPendingApprovals() {
    const [requests] = await db.query(`
      SELECT phu.*, k.ten_kho, nd.ho_ten as nguoi_lap FROM phieu_hoan_ung phu
      JOIN kho k ON phu.kho_tu_truc_id = k.id JOIN nguoi_dung nd ON phu.nguoi_lap_id = nd.id
      WHERE phu.trang_thai = 'cho_duyet' ORDER BY phu.ngay_lap DESC
    `);
    return requests;
  }

  static async getRequestById(conn, id) {
    const [rows] = await conn.query('SELECT * FROM phieu_hoan_ung WHERE id = ?', [id]);
    return rows;
  }

  static async getRequestDetails(conn, id) {
    const [details] = await conn.query('SELECT * FROM chi_tiet_phieu_hoan_ung WHERE phieu_hoan_ung_id = ?', [id]);
    return details;
  }

  static async getKhoNoiTru(conn, khoId) {
    const [rows] = await conn.query("SELECT id, trang_thai_kho FROM kho WHERE id = ? AND loai_kho = 'kho_le_noi_tru'", [khoId]);
    return rows;
  }

  static async upsertCabinetStock(conn, khoTuTrucId, thuocId, soLuong) {
    const [existing] = await conn.query(
      'SELECT id FROM ton_kho_tu_truc WHERE kho_id = ? AND thuoc_id = ?',
      [khoTuTrucId, thuocId]
    );
    if (existing.length > 0) {
      await conn.query('UPDATE ton_kho_tu_truc SET so_luong_ton = so_luong_ton + ? WHERE id = ?', [soLuong, existing[0].id]);
    } else {
      await conn.query('INSERT INTO ton_kho_tu_truc SET ?', { kho_id: khoTuTrucId, thuoc_id: thuocId, so_luong_ton: soLuong });
    }
  }

  static async updateRequestDetailQty(conn, id, qty) {
    await conn.query('UPDATE chi_tiet_phieu_hoan_ung SET so_luong_thuc_xuat = ? WHERE id = ?', [qty, id]);
  }

  static async completeRequest(conn, id, userId) {
    await conn.query(
      "UPDATE phieu_hoan_ung SET trang_thai = 'da_hoan_thanh', nguoi_duyet_id = ?, ngay_duyet = NOW() WHERE id = ?",
      [userId, id]
    );
  }

  static async markReplenished(conn, khoTuTrucId, thuocIds) {
    if (thuocIds.length > 0) {
      await conn.query(
        "UPDATE hang_cho_hoan_ung SET trang_thai = 'da_hoan_ung' WHERE kho_tu_truc_id = ? AND trang_thai = 'da_lap_phieu' AND thuoc_id IN (?)",
        [khoTuTrucId, thuocIds]
      );
    }
  }

  static async getRequestDetailForApi(id) {
    const [phieu] = await db.query(`
      SELECT phu.*, k.ten_kho, nl.ho_ten as nguoi_lap, nd.ho_ten as nguoi_duyet
      FROM phieu_hoan_ung phu
      JOIN kho k ON phu.kho_tu_truc_id = k.id
      JOIN nguoi_dung nl ON phu.nguoi_lap_id = nl.id
      LEFT JOIN nguoi_dung nd ON phu.nguoi_duyet_id = nd.id
      WHERE phu.id = ?
    `, [id]);
    if (!phieu.length) return { phieu: null, details: [] };
    const [details] = await db.query(`
      SELECT ct.*, t.ten_thuoc, t.don_vi_tinh FROM chi_tiet_phieu_hoan_ung ct
      JOIN thuoc t ON ct.thuoc_id = t.id WHERE ct.phieu_hoan_ung_id = ? ORDER BY t.ten_thuoc
    `, [id]);
    return { phieu: phieu[0], details };
  }
}

module.exports = Replenishment;
