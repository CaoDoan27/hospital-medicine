/**
 * BHYT Service - Tính toán chi phí BHYT theo Thông tư 130
 */
const db = require('../config/database');

class BhytService {
  /**
   * Xác định mức hưởng BHYT cho bệnh nhân
   * @param {Object} patient - Thông tin bệnh nhân
   * @param {string} maBenh - Mã bệnh ICD-10
   * @param {Object} bhxhData - Dữ liệu từ BHXH API (mock)
   * @returns {number} Mức hưởng (80, 95, 100)
   */
  static async determineCoverageRate(patient, maBenh, bhxhData = {}) {
    // Ưu tiên 1: Kiểm tra miễn đồng chi trả (5 năm liên tục + lũy kế > 6 tháng lương cơ sở)
    if (bhxhData.nam_lien_tuc >= 5 && bhxhData.luy_ke_vuot_6_thang) {
      return 100;
    }
    // Ưu tiên 2: Bệnh lý thuộc Phụ lục II (Thông tư 01/2025)
    if (maBenh) {
      const [result] = await db.query(
        'SELECT thuoc_phu_luc_2 FROM danh_muc_icd10 WHERE ma_benh = ?',
        [maBenh]
      );
      if (result.length > 0 && result[0].thuoc_phu_luc_2 === 1) {
        return 100;
      }
      // Kiểm tra mã cha (VD: E11.2 → E11)
      const parentCode = maBenh.split('.')[0];
      if (parentCode !== maBenh) {
        const [parentResult] = await db.query(
          'SELECT thuoc_phu_luc_2 FROM danh_muc_icd10 WHERE ma_benh = ?',
          [parentCode]
        );
        if (parentResult.length > 0 && parentResult[0].thuoc_phu_luc_2 === 1) {
          return 100;
        }
      }
    }
    // Mặc định: Mức hưởng gốc của thẻ BHYT (80% hoặc 95%)
    return bhxhData.muc_huong_goc || 80;
  }

  /**
   * Bóc tách chi phí theo Thông tư 130
   * Công thức:
   *   T_BHYT = Số lượng × Đơn giá thầu × TLTT × Mức hưởng
   *   T_BNCCT = (Số lượng × Đơn giá thầu × TLTT) - T_BHYT
   *   T_BNTT = (Số lượng × Đơn giá thực tế) - (T_BHYT + T_BNCCT)
   */
  static calculateCostSplit(soLuong, donGiaThau, donGiaThucTe, tyLeTT, mucHuong) {
    const tltt = tyLeTT / 100;
    const mh = mucHuong / 100;

    // Tiền BHYT chi trả
    const tienQuyBHYT = Math.round(soLuong * donGiaThau * tltt * mh);
    // Tiền BN đồng chi trả
    const tienBNCCT = Math.round(soLuong * donGiaThau * tltt) - tienQuyBHYT;
    // Tiền BN tự túc (ngoài danh mục hoặc chênh lệch giá)
    const tongThucTe = Math.round(soLuong * donGiaThucTe);
    const tienBNTT = Math.max(0, tongThucTe - tienQuyBHYT - tienBNCCT);

    return {
      tien_bhyt: tienQuyBHYT,
      tien_bn_cung_tra: tienBNCCT,
      tien_bn_tu_tuc: tienBNTT,
      tong_chi_phi: tongThucTe
    };
  }

  /**
   * Kiểm tra hiệu lực thẻ BHYT (Mock BHXH API)
   */
  static async checkInsuranceCard(soTheBHYT) {
    if (!soTheBHYT || soTheBHYT.trim() === '') {
      return { valid: false, message: 'Không có thẻ BHYT', muc_huong_goc: 0 };
    }
    // Mock: Decode card prefix for coverage level
    const prefix = soTheBHYT.substring(0, 2);
    let mucHuong = 80;
    if (['BT', 'HN', 'CH'].includes(prefix)) mucHuong = 100;
    else if (['DN', 'HT'].includes(prefix)) mucHuong = 80;
    else if (['TE', 'CK'].includes(prefix)) mucHuong = 100;

    return {
      valid: true,
      so_the: soTheBHYT,
      muc_huong_goc: mucHuong,
      nam_lien_tuc: 3,
      luy_ke_vuot_6_thang: false,
      ngay_het_han: '2026-12-31',
      message: 'Thẻ BHYT hợp lệ'
    };
  }
}

module.exports = BhytService;
