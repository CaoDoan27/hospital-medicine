const db = require('../config/database');

class Transfer {
  static async count() {
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM phieu_dieu_chuyen');
    return total;
  }

  static async findAll(limit, offset) {
    const [transfers] = await db.query(`
      SELECT p.*, kx.ten_kho as kho_xuat, kn.ten_kho as kho_nhan,
        nl.ho_ten as nguoi_lap_ten, nd.ho_ten as nguoi_duyet_ten
      FROM phieu_dieu_chuyen p
      JOIN kho kx ON p.kho_xuat_id = kx.id
      JOIN kho kn ON p.kho_nhan_id = kn.id
      JOIN nguoi_dung nl ON p.nguoi_lap_id = nl.id
      LEFT JOIN nguoi_dung nd ON p.nguoi_duyet_id = nd.id
      ORDER BY p.ngay_lap DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);
    return transfers;
  }

  static async findById(conn, id) {
    const [rows] = await conn.query('SELECT * FROM phieu_dieu_chuyen WHERE id = ?', [id]);
    return rows;
  }

  static async create(conn, data) {
    const [result] = await conn.query('INSERT INTO phieu_dieu_chuyen SET ?', data);
    return result;
  }

  static async createDetail(conn, phieuId, thuocId, soLuong) {
    await conn.query(
      'INSERT INTO chi_tiet_dieu_chuyen (phieu_id, thuoc_id, so_luong_yeu_cau) VALUES (?, ?, ?)',
      [phieuId, thuocId, parseInt(soLuong)]
    );
  }

  static async getDetails(conn, phieuId) {
    const [details] = await conn.query(`
      SELECT cd.*, t.ten_thuoc FROM chi_tiet_dieu_chuyen cd
      JOIN thuoc t ON cd.thuoc_id = t.id WHERE cd.phieu_id = ?`, [phieuId]);
    return details;
  }

  static async getDetailsForApi(id) {
    const [details] = await db.query(`
      SELECT cd.*, t.ten_thuoc, t.don_vi_tinh
      FROM chi_tiet_dieu_chuyen cd
      JOIN thuoc t ON cd.thuoc_id = t.id
      WHERE cd.phieu_id = ?
    `, [id]);
    return details;
  }

  static async getDetailsForApproval(id) {
    const [details] = await db.query(`
      SELECT cd.*, t.ten_thuoc, t.don_vi_tinh,
        COALESCE((SELECT SUM(l.so_luong_ton) FROM lo_thuoc l 
          WHERE l.thuoc_id = cd.thuoc_id AND l.kho_id = p.kho_xuat_id 
          AND l.han_dung > CURDATE() AND l.so_luong_ton > 0), 0) as ton_kho
      FROM chi_tiet_dieu_chuyen cd
      JOIN thuoc t ON cd.thuoc_id = t.id
      JOIN phieu_dieu_chuyen p ON cd.phieu_id = p.id
      WHERE cd.phieu_id = ?
    `, [id]);
    return details;
  }

  static async updateDetailAllocation(conn, detailId, data) {
    await conn.query(
      'UPDATE chi_tiet_dieu_chuyen SET so_luong_thuc_xuat = ?, lo_thuoc_id = ?, so_lo = ?, han_dung = ? WHERE id = ?',
      [data.so_luong_thuc_xuat, data.lo_thuoc_id, data.so_lo, data.han_dung, detailId]
    );
  }

  static async addDetailAllocation(conn, data) {
    await conn.query(
      'INSERT INTO chi_tiet_dieu_chuyen (phieu_id, thuoc_id, lo_thuoc_id, so_lo, han_dung, so_luong_yeu_cau, so_luong_thuc_xuat) VALUES (?,?,?,?,?,0,?)',
      [data.phieu_id, data.thuoc_id, data.lo_thuoc_id, data.so_lo, data.han_dung, data.so_luong_thuc_xuat]
    );
  }

  static async updateStatus(conn, id, status, userId) {
    await conn.query(
      "UPDATE phieu_dieu_chuyen SET trang_thai = ?, nguoi_duyet_id = ?, ngay_duyet = NOW() WHERE id = ?",
      [status, userId, id]
    );
  }

  static async completeTransfer(conn, id) {
    await conn.query("UPDATE phieu_dieu_chuyen SET trang_thai = 'hoan_thanh' WHERE id = ?", [id]);
  }

  static async getDrugsWithStock(khoTongId) {
    const [drugs] = await db.query(`
      SELECT t.id, t.ten_thuoc, t.ham_luong, t.don_vi_tinh,
        COALESCE(SUM(l.so_luong_ton), 0) as ton_kho_tong
      FROM thuoc t
      LEFT JOIN lo_thuoc l ON t.id = l.thuoc_id AND l.kho_id = ? AND l.han_dung > CURDATE()
      WHERE t.trang_thai = 1
      GROUP BY t.id ORDER BY t.ten_thuoc
    `, [khoTongId]);
    return drugs;
  }

  static async getReceivingWarehouses() {
    const [warehouses] = await db.query(
      "SELECT * FROM kho WHERE loai_kho IN ('kho_le_ngoai_tru','kho_le_noi_tru','tu_truc')"
    );
    return warehouses;
  }

  static async getConfirmDetails(conn, phieuId) {
    const [details] = await conn.query('SELECT * FROM chi_tiet_dieu_chuyen WHERE phieu_id = ?', [phieuId]);
    return details;
  }

  static async addLotToWarehouse(conn, data) {
    const [existingLot] = await conn.query(
      'SELECT id FROM lo_thuoc WHERE thuoc_id = ? AND so_lo = ? AND kho_id = ?',
      [data.thuoc_id, data.so_lo, data.kho_nhan_id]
    );
    if (existingLot.length > 0) {
      await conn.query(
        'UPDATE lo_thuoc SET so_luong_ton = so_luong_ton + ? WHERE id = ?',
        [data.so_luong, existingLot[0].id]
      );
    } else {
      const [originalLot] = await conn.query('SELECT gia_nhap FROM lo_thuoc WHERE id = ?', [data.lo_thuoc_id]);
      const giaNhap = originalLot.length ? originalLot[0].gia_nhap : 0;
      await conn.query('INSERT INTO lo_thuoc SET ?', {
        thuoc_id: data.thuoc_id, so_lo: data.so_lo, han_dung: data.han_dung,
        gia_nhap: giaNhap, kho_id: data.kho_nhan_id, so_luong_ton: data.so_luong
      });
    }
  }
}

module.exports = Transfer;
