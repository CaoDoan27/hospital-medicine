const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated, authorize } = require('../middleware/authMiddleware');
const { create } = require('xmlbuilder2');

router.get('/', isAuthenticated, authorize('ke_toan', 'duoc_si_tong'), async (req, res) => {
  try {
    const [eligible] = await db.query(`
      SELECT d.id, bn.ho_ten, bn.so_the_bhyt, d.loai_hinh, d.ngay_vao, d.ngay_ra, d.ma_benh, d.trang_thai
      FROM dot_dieu_tri d JOIN benh_nhan bn ON d.benh_nhan_id = bn.id
      WHERE d.trang_thai IN ('da_chot_vien_phi', 'da_xuat_xml')
      ORDER BY d.ngay_vao DESC
    `);
    res.render('xml/export', { title: 'Xuất XML 130', eligible });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/dashboard'); }
});

router.post('/generate', isAuthenticated, authorize('ke_toan', 'duoc_si_tong'), async (req, res) => {
  try {
    const { dot_ids } = req.body;
    const ids = Array.isArray(dot_ids) ? dot_ids : [dot_ids];

    const xmlDocs = [];
    for (const dotId of ids) {
      const [dotDT] = await db.query(`
        SELECT d.*, bn.* FROM dot_dieu_tri d JOIN benh_nhan bn ON d.benh_nhan_id = bn.id WHERE d.id = ?
      `, [dotId]);
      const [costs] = await db.query(`
        SELECT cp.*, t.ma_bhyt, t.ten_thuoc, t.don_vi_tinh, t.so_dang_ky, t.duong_dung
        FROM chi_phi_bhyt cp JOIN thuoc t ON cp.thuoc_id = t.id WHERE cp.dot_dieu_tri_id = ?
      `, [dotId]);

      if (!dotDT.length) continue;
      const dt = dotDT[0];

      // Bảng 1: Tổng hợp KCB
      const table1 = {
        MA_LK: `LK${String(dt.id).padStart(8, '0')}`,
        STT: 1,
        MA_BN: dt.ma_benh_nhan,
        HO_TEN: dt.ho_ten,
        SO_CCCD: dt.so_dinh_danh || '',
        NGAY_SINH: dt.ngay_sinh ? new Date(dt.ngay_sinh).toISOString().split('T')[0].replace(/-/g, '') : '',
        GIOI_TINH: dt.gioi_tinh === 'Nam' ? 1 : 2,
        MA_THE_BHYT: dt.so_the_bhyt || '',
        MA_BENH: dt.ma_benh || '',
        NGAY_VAO: new Date(dt.ngay_vao).toISOString().replace('T', ' ').substring(0, 19),
        NGAY_RA: dt.ngay_ra ? new Date(dt.ngay_ra).toISOString().replace('T', ' ').substring(0, 19) : '',
        T_THUOC: costs.reduce((s, c) => s + c.so_luong * parseFloat(c.don_gia), 0),
        T_BHTT: costs.reduce((s, c) => s + parseFloat(c.tien_bhyt), 0),
        T_BNCCT: costs.reduce((s, c) => s + parseFloat(c.tien_bn_cung_tra), 0),
        T_BNTT: costs.reduce((s, c) => s + parseFloat(c.tien_bn_tu_tuc), 0)
      };

      // Bảng 2: Chi tiết thuốc
      const table2 = costs.map((c, i) => ({
        MA_LK: table1.MA_LK,
        STT: i + 1,
        MA_THUOC: c.ma_bhyt,
        TEN_THUOC: c.ten_thuoc,
        DON_VI_TINH: c.don_vi_tinh,
        SO_DANG_KY: c.so_dang_ky || '',
        DUONG_DUNG: c.duong_dung || '',
        SO_LUONG: c.so_luong,
        DON_GIA: parseFloat(c.don_gia),
        TYLE_TT: c.ty_le_tt,
        THANH_TIEN: c.so_luong * parseFloat(c.don_gia),
        T_BHTT: parseFloat(c.tien_bhyt),
        T_BNCCT: parseFloat(c.tien_bn_cung_tra),
        T_BNTT: parseFloat(c.tien_bn_tu_tuc),
        MUC_HUONG: c.muc_huong
      }));

      xmlDocs.push({ table1, table2 });
      await db.query("UPDATE dot_dieu_tri SET trang_thai = 'da_xuat_xml' WHERE id = ?", [dotId]);
    }

    // Build XML
    const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('DULIEU');
    root.ele('THONG_TIN_DON_VI').ele('MA_CSKCB').txt('00000').up().up();

    for (const doc of xmlDocs) {
      const giamDinhNode = root.ele('GIAM_DINH');
      const b1 = giamDinhNode.ele('BANG_1');
      for (const [key, val] of Object.entries(doc.table1)) { b1.ele(key).txt(String(val)); }
      for (const row of doc.table2) {
        const b2 = giamDinhNode.ele('BANG_2');
        for (const [key, val] of Object.entries(row)) { b2.ele(key).txt(String(val)); }
      }
    }

    const xmlString = root.end({ prettyPrint: true });
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename=XML130_${Date.now()}.xml`);
    res.send(xmlString);
  } catch (err) { console.error(err); req.flash('error', 'Lỗi xuất XML: ' + err.message); res.redirect('/xuat-xml'); }
});

module.exports = router;
