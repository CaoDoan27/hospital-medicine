const db = require('../config/database');

class ImportReceipt {
  static async count() {
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM phieu_nhap_kho');
    return total;
  }

  static async findAll(limit, offset) {
    const [receipts] = await db.query(`
      SELECT p.*, ncc.ten_nha_cung_cap, nd.ho_ten as nguoi_lap, k.ten_kho
      FROM phieu_nhap_kho p
      JOIN nha_cung_cap ncc ON p.nha_cung_cap_id = ncc.id
      JOIN nguoi_dung nd ON p.nguoi_lap_id = nd.id
      JOIN kho k ON p.kho_id = k.id
      ORDER BY p.ngay_lap DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);
    return receipts;
  }

  static async create(conn, data) {
    const [result] = await conn.query('INSERT INTO phieu_nhap_kho SET ?', data);
    return result;
  }

  static async createDetail(conn, data) {
    await conn.query(
      'INSERT INTO chi_tiet_nhap_kho (phieu_nhap_id, thuoc_id, so_lo, han_dung, so_luong, don_gia, thue_vat) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [data.phieu_nhap_id, data.thuoc_id, data.so_lo, data.han_dung, data.so_luong, data.don_gia, data.thue_vat]
    );
  }

  static async updateTotal(conn, id, total) {
    await conn.query('UPDATE phieu_nhap_kho SET tong_tien = ? WHERE id = ?', [total, id]);
  }

  static async getDetails(id) {
    const [details] = await db.query(`
      SELECT cd.*, t.ten_thuoc, t.don_vi_tinh
      FROM chi_tiet_nhap_kho cd
      JOIN thuoc t ON cd.thuoc_id = t.id
      WHERE cd.phieu_nhap_id = ?
    `, [id]);
    return details;
  }

  static async getDrugPrice(conn, thuocId) {
    const [drug] = await conn.query('SELECT don_gia_thau FROM thuoc WHERE id = ?', [thuocId]);
    return drug;
  }

  static async upsertLot(conn, data) {
    const [existingLot] = await conn.query(
      'SELECT id, so_luong_ton FROM lo_thuoc WHERE thuoc_id = ? AND so_lo = ? AND kho_id = ?',
      [data.thuoc_id, data.so_lo, data.kho_id]
    );
    if (existingLot.length > 0) {
      await conn.query(
        'UPDATE lo_thuoc SET so_luong_ton = so_luong_ton + ?, gia_nhap = ?, thue_vat = ?, han_dung = ? WHERE id = ?',
        [parseInt(data.so_luong), parseFloat(data.gia_nhap), parseFloat(data.thue_vat), data.han_dung, existingLot[0].id]
      );
    } else {
      await conn.query('INSERT INTO lo_thuoc SET ?', {
        thuoc_id: data.thuoc_id, so_lo: data.so_lo, han_dung: data.han_dung,
        gia_nhap: parseFloat(data.gia_nhap), thue_vat: parseFloat(data.thue_vat),
        kho_id: data.kho_id, so_luong_ton: data.so_luong
      });
    }
  }

  static async findDrugById(id) {
    const [drugs] = await db.query('SELECT * FROM thuoc WHERE id = ?', [id]);
    return drugs[0] || {};
  }
}

module.exports = ImportReceipt;
