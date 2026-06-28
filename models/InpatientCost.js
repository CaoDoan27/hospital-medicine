const db = require('../config/database');

class InpatientCost {
  static async count() {
    const [[{ total }]] = await db.query("SELECT COUNT(*) AS total FROM dot_dieu_tri WHERE loai_hinh = 'noi_tru'");
    return total;
  }

  static async findAll(limit, offset) {
    const [patients] = await db.query(`
      SELECT bn.*, d.id as dot_id, d.khoa, d.ngay_vao, d.ma_benh, d.chan_doan_lam_sang, d.trang_thai as trang_thai_dt
      FROM dot_dieu_tri d JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
      WHERE d.loai_hinh = 'noi_tru' ORDER BY d.ngay_vao DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);
    return patients;
  }

  static async getCosts(dotId) {
    const [costs] = await db.query(`
      SELECT cp.*, t.ten_thuoc, t.don_vi_tinh, t.ham_luong FROM chi_phi_bhyt cp
      JOIN thuoc t ON cp.thuoc_id = t.id WHERE cp.dot_dieu_tri_id = ? ORDER BY cp.ngay_ghi_nhan DESC
    `, [dotId]);
    return costs;
  }

  static async getDotDieuTri(dotId) {
    const [rows] = await db.query(`
      SELECT d.*, bn.ho_ten, bn.so_the_bhyt FROM dot_dieu_tri d
      JOIN benh_nhan bn ON d.benh_nhan_id = bn.id WHERE d.id = ?
    `, [dotId]);
    return rows;
  }

  static async checkDotStatus(dotId) {
    const [rows] = await db.query('SELECT trang_thai, ngay_ra FROM dot_dieu_tri WHERE id = ?', [dotId]);
    return rows;
  }

  static async finalize(dotId) {
    await db.query("UPDATE dot_dieu_tri SET trang_thai = 'da_chot_vien_phi' WHERE id = ? AND trang_thai = 'dang_dieu_tri'", [dotId]);
  }
}

module.exports = InpatientCost;
