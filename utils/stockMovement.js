const db = require('../config/database');

/**
 * Record a stock movement (bien_dong_kho) calculating before/after quantities
 * @param {Object} conn - The database connection (for transactions)
 * @param {Object} movementData - The movement data
 * @param {number} movementData.kho_id - Warehouse ID
 * @param {number} movementData.thuoc_id - Drug ID
 * @param {number} [movementData.lo_thuoc_id] - Lot ID (optional)
 * @param {string} movementData.loai_bien_dong - Movement type (nhap, xuat_cap_phat, etc)
 * @param {number} movementData.so_luong - Quantity changed
 * @param {string} [movementData.phieu_lien_quan] - Related document reference
 * @param {number} movementData.nguoi_thuc_hien_id - User ID who performed the action
 */
async function recordStockMovement(conn, movementData) {
  // Determine if it's an import (+) or export (-)
  const isImport = ['nhap', 'nhap_dieu_chuyen', 'kiem_ke_tang', 'hoan_ung'].includes(movementData.loai_bien_dong);
  const changeQty = isImport ? movementData.so_luong : -movementData.so_luong;

  // Get current stock BEFORE the movement.
  // Note: Since this is often called AFTER FEFO deductions within the same transaction,
  // the actual current stock in DB might already reflect the change.
  // We need to calculate the *before* state by reversing the change on the *current* state.
  const [rows] = await conn.query(
    'SELECT COALESCE(SUM(so_luong_ton), 0) as current_stock FROM lo_thuoc WHERE kho_id = ? AND thuoc_id = ?',
    [movementData.kho_id, movementData.thuoc_id]
  );
  
  const currentStock = rows[0].current_stock;
  
  // If the movement has ALREADY been applied to lo_thuoc in this transaction:
  // so_luong_sau = currentStock
  // so_luong_truoc = currentStock - changeQty
  const so_luong_sau = currentStock;
  const so_luong_truoc = currentStock - changeQty;

  const insertData = {
    kho_id: movementData.kho_id,
    thuoc_id: movementData.thuoc_id,
    lo_thuoc_id: movementData.lo_thuoc_id || null,
    loai_bien_dong: movementData.loai_bien_dong,
    so_luong: movementData.so_luong,
    so_luong_truoc: so_luong_truoc,
    so_luong_sau: so_luong_sau,
    phieu_lien_quan: movementData.phieu_lien_quan || null,
    nguoi_thuc_hien_id: movementData.nguoi_thuc_hien_id
  };

  await conn.query('INSERT INTO bien_dong_kho SET ?', insertData);
}

module.exports = {
  recordStockMovement
};
