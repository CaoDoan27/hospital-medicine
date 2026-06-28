const db = require('../config/database');

class Report {
  static async getNxtReport(khoId, tuNgay, denNgay) {
    const [data] = await db.query(`
      SELECT t.ten_thuoc, t.don_vi_tinh, t.ham_luong,
        -- Tồn đầu kỳ = Tồn hiện tại - SUM(nhập sau tuNgay) + SUM(xuất sau tuNgay)
        COALESCE((SELECT SUM(l.so_luong_ton) FROM lo_thuoc l WHERE l.thuoc_id = t.id AND l.kho_id = ?), 0)
          - COALESCE(SUM(CASE WHEN bd.loai_bien_dong IN ('nhap','nhap_dieu_chuyen','kiem_ke_tang','hoan_ung')
              AND bd.ngay_bien_dong >= ? THEN bd.so_luong ELSE 0 END), 0)
          + COALESCE(SUM(CASE WHEN bd.loai_bien_dong IN ('xuat_cap_phat','xuat_dieu_chuyen','xuat_tu_truc','kiem_ke_giam')
              AND bd.ngay_bien_dong >= ? THEN bd.so_luong ELSE 0 END), 0)
        as ton_dau_ky,
        -- Nhập trong kỳ (tất cả loại nhập)
        COALESCE(SUM(CASE WHEN bd.loai_bien_dong IN ('nhap','nhap_dieu_chuyen','kiem_ke_tang','hoan_ung')
          AND bd.ngay_bien_dong BETWEEN ? AND ? THEN bd.so_luong ELSE 0 END), 0) as nhap,
        -- Xuất trong kỳ (tất cả loại xuất)
        COALESCE(SUM(CASE WHEN bd.loai_bien_dong IN ('xuat_cap_phat','xuat_dieu_chuyen','xuat_tu_truc','kiem_ke_giam')
          AND bd.ngay_bien_dong BETWEEN ? AND ? THEN bd.so_luong ELSE 0 END), 0) as xuat,
        -- Tồn cuối kỳ
        COALESCE((SELECT SUM(l.so_luong_ton) FROM lo_thuoc l WHERE l.thuoc_id = t.id AND l.kho_id = ?), 0)
          - COALESCE(SUM(CASE WHEN bd.loai_bien_dong IN ('nhap','nhap_dieu_chuyen','kiem_ke_tang','hoan_ung')
              AND bd.ngay_bien_dong > ? THEN bd.so_luong ELSE 0 END), 0)
          + COALESCE(SUM(CASE WHEN bd.loai_bien_dong IN ('xuat_cap_phat','xuat_dieu_chuyen','xuat_tu_truc','kiem_ke_giam')
              AND bd.ngay_bien_dong > ? THEN bd.so_luong ELSE 0 END), 0)
        as ton_cuoi
      FROM thuoc t
      LEFT JOIN bien_dong_kho bd ON t.id = bd.thuoc_id AND bd.kho_id = ?
      WHERE t.trang_thai = 1
      GROUP BY t.id HAVING nhap > 0 OR xuat > 0 OR ton_cuoi > 0
      ORDER BY t.ten_thuoc
    `, [khoId, tuNgay, tuNgay, tuNgay, denNgay + ' 23:59:59', tuNgay, denNgay + ' 23:59:59', khoId, denNgay + ' 23:59:59', denNgay + ' 23:59:59', khoId]);
    return data;
  }

  static async getExpiryReport(khoId) {
    const [data] = await db.query(`
      SELECT t.ten_thuoc, t.don_vi_tinh, l.so_lo, l.han_dung, l.so_luong_ton, k.ten_kho,
        DATEDIFF(l.han_dung, CURDATE()) as ngay_con_lai
      FROM lo_thuoc l JOIN thuoc t ON l.thuoc_id = t.id JOIN kho k ON l.kho_id = k.id
      WHERE l.kho_id = ? AND l.so_luong_ton > 0 ORDER BY l.han_dung ASC
    `, [khoId]);
    return data;
  }

  // ====== DASHBOARD ANALYTICS ======

  // Tổng quan tồn kho theo từng kho
  static async getStockOverview() {
    const [data] = await db.query(`
      SELECT k.id, k.ten_kho, k.loai_kho,
        COUNT(DISTINCT l.thuoc_id) as so_thuoc,
        COALESCE(SUM(l.so_luong_ton), 0) as tong_ton,
        COALESCE(SUM(l.so_luong_ton * l.gia_nhap), 0) as gia_tri_ton_kho
      FROM kho k
      LEFT JOIN lo_thuoc l ON k.id = l.kho_id AND l.so_luong_ton > 0
      GROUP BY k.id
      ORDER BY k.id
    `);
    return data;
  }

  // Biến động nhập/xuất 7 ngày gần nhất
  static async getMovementTrend(days = 7) {
    const [data] = await db.query(`
      SELECT DATE(ngay_bien_dong) as ngay,
        SUM(CASE WHEN loai_bien_dong IN ('nhap','nhap_dieu_chuyen','kiem_ke_tang','hoan_ung') THEN so_luong ELSE 0 END) as tong_nhap,
        SUM(CASE WHEN loai_bien_dong IN ('xuat_cap_phat','xuat_dieu_chuyen','xuat_tu_truc','kiem_ke_giam') THEN so_luong ELSE 0 END) as tong_xuat
      FROM bien_dong_kho
      WHERE ngay_bien_dong >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(ngay_bien_dong)
      ORDER BY ngay ASC
    `, [days]);
    return data;
  }

  // Top 10 thuốc xuất nhiều nhất (30 ngày)
  static async getTopDispensedDrugs(days = 30) {
    const [data] = await db.query(`
      SELECT t.ten_thuoc, t.don_vi_tinh, SUM(bd.so_luong) as tong_xuat
      FROM bien_dong_kho bd
      JOIN thuoc t ON bd.thuoc_id = t.id
      WHERE bd.loai_bien_dong IN ('xuat_cap_phat','xuat_tu_truc')
        AND bd.ngay_bien_dong >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY bd.thuoc_id
      ORDER BY tong_xuat DESC
      LIMIT 10
    `, [days]);
    return data;
  }

  // Phân bổ loại biến động
  static async getMovementDistribution(days = 30) {
    const [data] = await db.query(`
      SELECT loai_bien_dong, SUM(so_luong) as tong_so_luong, COUNT(*) as so_lan
      FROM bien_dong_kho
      WHERE ngay_bien_dong >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY loai_bien_dong
      ORDER BY tong_so_luong DESC
    `, [days]);
    return data;
  }

  // Tổng hợp thuốc sắp hết hạn theo nhóm thời gian
  static async getExpiryOverview() {
    const [data] = await db.query(`
      SELECT 
        SUM(CASE WHEN l.han_dung <= CURDATE() THEN 1 ELSE 0 END) as da_het_han,
        SUM(CASE WHEN l.han_dung > CURDATE() AND l.han_dung <= DATE_ADD(CURDATE(), INTERVAL 1 MONTH) THEN 1 ELSE 0 END) as duoi_1_thang,
        SUM(CASE WHEN l.han_dung > DATE_ADD(CURDATE(), INTERVAL 1 MONTH) AND l.han_dung <= DATE_ADD(CURDATE(), INTERVAL 3 MONTH) THEN 1 ELSE 0 END) as tu_1_den_3_thang,
        SUM(CASE WHEN l.han_dung > DATE_ADD(CURDATE(), INTERVAL 3 MONTH) AND l.han_dung <= DATE_ADD(CURDATE(), INTERVAL 6 MONTH) THEN 1 ELSE 0 END) as tu_3_den_6_thang,
        SUM(CASE WHEN l.han_dung > DATE_ADD(CURDATE(), INTERVAL 6 MONTH) THEN 1 ELSE 0 END) as con_han
      FROM lo_thuoc l
      WHERE l.so_luong_ton > 0
    `);
    return data[0];
  }

  // Thống kê đơn thuốc theo ngày (7 ngày)
  static async getPrescriptionTrend(days = 7) {
    const [data] = await db.query(`
      SELECT DATE(ngay_ke) as ngay,
        COUNT(*) as tong_don,
        SUM(CASE WHEN trang_thai = 'da_cap_phat' THEN 1 ELSE 0 END) as da_cap_phat,
        SUM(CASE WHEN trang_thai = 'moi' THEN 1 ELSE 0 END) as cho_cap_phat
      FROM don_thuoc
      WHERE ngay_ke >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(ngay_ke)
      ORDER BY ngay ASC
    `, [days]);
    return data;
  }

  // Tổng giá trị nhập kho theo tháng (6 tháng gần nhất)
  static async getImportValueTrend() {
    const [data] = await db.query(`
      SELECT DATE_FORMAT(p.ngay_lap, '%Y-%m') as thang,
        COUNT(DISTINCT p.id) as so_phieu,
        COALESCE(SUM(p.tong_tien), 0) as tong_gia_tri
      FROM phieu_nhap_kho p
      WHERE p.ngay_lap >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(p.ngay_lap, '%Y-%m')
      ORDER BY thang ASC
    `);
    return data;
  }

  // Thống kê cảnh báo tồn kho
  static async getStockAlertSummary() {
    const [[lowStock]] = await db.query(`
      SELECT COUNT(*) as total FROM (
        SELECT t.id
        FROM thuoc t
        LEFT JOIN lo_thuoc l ON t.id = l.thuoc_id
        WHERE t.trang_thai = 1
        GROUP BY t.id, t.dinh_muc_toi_thieu
        HAVING COALESCE(SUM(l.so_luong_ton), 0) < t.dinh_muc_toi_thieu
      ) sub
    `);
    const [[expiring]] = await db.query(`
      SELECT COUNT(DISTINCT l.thuoc_id) as total
      FROM lo_thuoc l
      WHERE l.so_luong_ton > 0 AND l.han_dung <= DATE_ADD(CURDATE(), INTERVAL 6 MONTH)
    `);
    const [[expired]] = await db.query(`
      SELECT COUNT(DISTINCT l.thuoc_id) as total
      FROM lo_thuoc l
      WHERE l.so_luong_ton > 0 AND l.han_dung <= CURDATE()
    `);
    const [[pendingTransfers]] = await db.query(`
      SELECT COUNT(*) as total FROM phieu_dieu_chuyen WHERE trang_thai = 'cho_duyet'
    `);
    return {
      lowStock: lowStock.total,
      expiring: expiring.total,
      expired: expired.total,
      pendingTransfers: pendingTransfers.total
    };
  }
}

module.exports = Report;
