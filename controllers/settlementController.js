const Settlement = require('../models/Settlement');

exports.index = async (req, res) => {
  try {
    const tuNgay = req.query.tu_ngay || '';
    const denNgay = req.query.den_ngay || '';
    const loaiHinh = req.query.loai_hinh || '';
    let data = [];
    if (tuNgay && denNgay) {
      data = await Settlement.getData(tuNgay, denNgay, loaiHinh);
    }
    const tongDoanhThu = data.reduce((s, d) => s + parseFloat(d.tong_tien || 0), 0);
    const tongBHYT = data.reduce((s, d) => s + parseFloat(d.tong_bhyt || 0), 0);
    res.render('reports/settlement', { title: 'Quyết toán BHYT', data, tuNgay, denNgay, loaiHinh, tongDoanhThu, tongBHYT });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/dashboard'); }
};
