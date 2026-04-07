/**
 * FEFO Service - First Expired, First Out
 * Thuật toán phân bổ lô hàng theo hạn dùng gần nhất
 */
const db = require('../config/database');

class FefoService {
  /**
   * Gợi ý phân bổ lô hàng theo FEFO
   * @param {number} thuocId - ID thuốc
   * @param {number} khoId - ID kho xuất
   * @param {number} soLuongCanXuat - Số lượng cần xuất
   * @returns {Array} Danh sách lô được phân bổ [{lo_thuoc_id, so_lo, han_dung, so_luong_xuat, so_luong_ton}]
   */
  static async allocate(thuocId, khoId, soLuongCanXuat) {
    // Lấy danh sách lô còn tồn, sắp xếp theo hạn dùng tăng dần (FEFO)
    const [lots] = await db.query(`
      SELECT id as lo_thuoc_id, so_lo, han_dung, so_luong_ton, gia_nhap
      FROM lo_thuoc
      WHERE thuoc_id = ? AND kho_id = ? AND so_luong_ton > 0
        AND han_dung > CURDATE()
      ORDER BY han_dung ASC
    `, [thuocId, khoId]);

    const totalAvailable = lots.reduce((sum, l) => sum + l.so_luong_ton, 0);
    if (totalAvailable < soLuongCanXuat) {
      return { success: false, message: 'Không đủ tồn kho', totalAvailable, lots: [] };
    }

    let remaining = soLuongCanXuat;
    const allocation = [];

    for (const lot of lots) {
      if (remaining <= 0) break;
      const qty = Math.min(remaining, lot.so_luong_ton);
      allocation.push({
        lo_thuoc_id: lot.lo_thuoc_id,
        so_lo: lot.so_lo,
        han_dung: lot.han_dung,
        gia_nhap: lot.gia_nhap,
        so_luong_xuat: qty,
        so_luong_ton: lot.so_luong_ton
      });
      remaining -= qty;
    }

    return { success: true, allocation, totalAvailable };
  }

  /**
   * Thực hiện trừ kho theo phân bổ FEFO
   */
  static async deductStock(connection, allocation) {
    for (const item of allocation) {
      await connection.query(
        'UPDATE lo_thuoc SET so_luong_ton = so_luong_ton - ? WHERE id = ? AND so_luong_ton >= ?',
        [item.so_luong_xuat, item.lo_thuoc_id, item.so_luong_xuat]
      );
    }
  }

  /**
   * Kiểm tra tồn kho tổng của thuốc tại kho
   */
  static async checkStock(thuocId, khoId) {
    const [result] = await db.query(
      'SELECT COALESCE(SUM(so_luong_ton), 0) as total FROM lo_thuoc WHERE thuoc_id = ? AND kho_id = ? AND han_dung > CURDATE()',
      [thuocId, khoId]
    );
    return result[0].total;
  }
}

module.exports = FefoService;
