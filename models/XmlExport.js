const db = require('../config/database');

class XmlExport {
  static async getEligible() {
    const [eligible] = await db.query(`
      SELECT d.id, bn.ho_ten, bn.so_the_bhyt, d.loai_hinh, d.ngay_vao, d.ngay_ra, d.ma_benh, d.trang_thai
      FROM dot_dieu_tri d JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
      WHERE d.trang_thai IN ('da_chot_vien_phi', 'da_xuat_xml')
      ORDER BY d.ngay_vao DESC
    `);
    return eligible;
  }

  static async getDotDieuTri(conn, id) {
    const [rows] = await conn.query(`
      SELECT d.*, bn.* FROM dot_dieu_tri d JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
      WHERE d.id = ? AND d.trang_thai IN ('da_chot_vien_phi', 'da_xuat_xml')
    `, [id]);
    return rows;
  }

  static async getCosts(conn, dotId) {
    const [costs] = await conn.query(`
      SELECT cp.*, t.ma_bhyt, t.ten_thuoc, t.don_vi_tinh, t.so_dang_ky, t.duong_dung
      FROM chi_phi_bhyt cp JOIN thuoc t ON cp.thuoc_id = t.id WHERE cp.dot_dieu_tri_id = ?
    `, [dotId]);
    return costs;
  }

  static async markExported(conn, dotId) {
    await conn.query("UPDATE dot_dieu_tri SET trang_thai = 'da_xuat_xml' WHERE id = ?", [dotId]);
  }
}

module.exports = XmlExport;
