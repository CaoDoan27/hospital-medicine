const db = require('../config/database');

class Settlement {
  static async getData(tuNgay, denNgay, loaiHinh) {
    let sql = `SELECT cp.nguon, t.ten_thuoc, t.don_vi_tinh,
      SUM(cp.so_luong) as tong_sl, AVG(cp.don_gia) as don_gia,
      SUM(cp.so_luong * cp.don_gia) as tong_tien,
      SUM(cp.tien_bhyt) as tong_bhyt, SUM(cp.tien_bn_cung_tra) as tong_bncct,
      SUM(cp.tien_bn_tu_tuc) as tong_bntt
      FROM chi_phi_bhyt cp JOIN thuoc t ON cp.thuoc_id = t.id
      WHERE cp.ngay_ghi_nhan BETWEEN ? AND ?`;
    const params = [tuNgay, denNgay + ' 23:59:59'];
    if (loaiHinh) { sql += ' AND cp.nguon = ?'; params.push(loaiHinh); }
    sql += ' GROUP BY cp.thuoc_id, cp.nguon ORDER BY t.ten_thuoc';
    const [data] = await db.query(sql, params);
    return data;
  }
}

module.exports = Settlement;
