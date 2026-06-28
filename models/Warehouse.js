const db = require('../config/database');

class Warehouse {
  static async findAll() {
    const [warehouses] = await db.query('SELECT * FROM kho ORDER BY id');
    return warehouses;
  }

  static async findById(id) {
    const [warehouses] = await db.query('SELECT * FROM kho WHERE id = ?', [id]);
    return warehouses;
  }

  static async findByType(type) {
    const [warehouses] = await db.query("SELECT * FROM kho WHERE loai_kho = ?", [type]);
    return warehouses;
  }

  static async findByTypes(types) {
    const [warehouses] = await db.query("SELECT * FROM kho WHERE loai_kho IN (?)", [types]);
    return warehouses;
  }

  static async findKhoTong() {
    const [rows] = await db.query("SELECT id FROM kho WHERE loai_kho = 'kho_tong' LIMIT 1");
    return rows;
  }

  static async findKhoTongWithConn(conn) {
    const [rows] = await conn.query("SELECT id FROM kho WHERE loai_kho = 'kho_tong' LIMIT 1");
    return rows;
  }

  static async updateStatus(conn, id, status) {
    await conn.query("UPDATE kho SET trang_thai_kho = ? WHERE id = ?", [status, id]);
  }

  static async checkStatus(conn, id) {
    const [rows] = await conn.query('SELECT trang_thai_kho FROM kho WHERE id = ?', [id]);
    return rows;
  }

  static async getSuppliers() {
    const [suppliers] = await db.query('SELECT * FROM nha_cung_cap WHERE trang_thai = 1 ORDER BY ten_nha_cung_cap');
    return suppliers;
  }
}

module.exports = Warehouse;
