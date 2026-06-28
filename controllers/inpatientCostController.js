const InpatientCost = require('../models/InpatientCost');
const { parsePage, buildPagination, DEFAULT_PAGE_SIZE } = require('../utils/pagination');

// Danh sách bệnh nhân nội trú
exports.list = async (req, res) => {
  try {
    const page = parsePage(req.query.page);
    const total = await InpatientCost.count();
    const pagination = buildPagination({ page, total, baseUrl: '/chi-phi-noi-tru' });
    const patients = await InpatientCost.findAll(DEFAULT_PAGE_SIZE, pagination.offset);
    res.render('cost/inpatient-cost', { title: 'Tổng hợp CP Nội trú', patients, pagination });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/dashboard'); }
};

// Chi tiết chi phí
exports.showDetail = async (req, res) => {
  try {
    const costs = await InpatientCost.getCosts(req.params.dotId);
    const dotDT = await InpatientCost.getDotDieuTri(req.params.dotId);
    const tongBHYT = costs.reduce((s, c) => s + parseFloat(c.tien_bhyt), 0);
    const tongBNCCT = costs.reduce((s, c) => s + parseFloat(c.tien_bn_cung_tra), 0);
    const tongBNTT = costs.reduce((s, c) => s + parseFloat(c.tien_bn_tu_tuc), 0);
    res.render('cost/inpatient-cost-detail', { title: 'Chi tiết viện phí thuốc', costs, dotDT: dotDT[0], tongBHYT, tongBNCCT, tongBNTT });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/chi-phi-noi-tru'); }
};

// Chốt viện phí
exports.finalize = async (req, res) => {
  try {
    const dotCheck = await InpatientCost.checkDotStatus(req.params.dotId);
    if (!dotCheck.length) {
      req.flash('error', 'Không tìm thấy đợt điều trị');
      return res.redirect('/chi-phi-noi-tru');
    }
    if (dotCheck[0].trang_thai === 'da_xuat_xml') {
      req.flash('error', 'Đợt điều trị đã xuất XML, không thể chốt lại');
      return res.redirect('/chi-phi-noi-tru');
    }
    if (dotCheck[0].trang_thai === 'da_chot_vien_phi') {
      req.flash('error', 'Đợt điều trị đã được chốt viện phí trước đó');
      return res.redirect('/chi-phi-noi-tru');
    }
    await InpatientCost.finalize(req.params.dotId);
    req.flash('success', 'Đã chốt viện phí thuốc cho bệnh nhân');
  } catch (err) { req.flash('error', 'Lỗi: ' + err.message); }
  res.redirect('/chi-phi-noi-tru');
};
