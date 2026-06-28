const Report = require('../models/Report');
const Warehouse = require('../models/Warehouse');

exports.index = async (req, res) => {
  try {
    const loai = req.query.loai || 'nxt';
    const khoId = req.query.kho_id || 1;
    const tuNgay = req.query.tu_ngay || '';
    const denNgay = req.query.den_ngay || '';
    const warehouses = await Warehouse.findAll();
    let reportData = [];

    if (tuNgay && denNgay) {
      if (loai === 'nxt') {
        reportData = await Report.getNxtReport(khoId, tuNgay, denNgay);
      } else if (loai === 'han_dung') {
        reportData = await Report.getExpiryReport(khoId);
      }
    }

    res.render('reports/index', { title: 'Báo cáo thống kê', warehouses, reportData, loai, khoId: parseInt(khoId), tuNgay, denNgay });
  } catch (err) { console.error(err); req.flash('error', 'Lỗi'); res.redirect('/dashboard'); }
};

// Dashboard tổng hợp cho DS Tổng
exports.dashboard = async (req, res) => {
  try {
    const [
      stockOverview,
      movementTrend,
      topDrugs,
      movementDist,
      expiryOverview,
      prescriptionTrend,
      importTrend,
      alertSummary
    ] = await Promise.all([
      Report.getStockOverview(),
      Report.getMovementTrend(14),
      Report.getTopDispensedDrugs(30),
      Report.getMovementDistribution(30),
      Report.getExpiryOverview(),
      Report.getPrescriptionTrend(14),
      Report.getImportValueTrend(),
      Report.getStockAlertSummary()
    ]);

    res.render('reports/dashboard', {
      title: 'Dashboard Quản trị',
      stockOverview,
      movementTrend,
      topDrugs,
      movementDist,
      expiryOverview,
      prescriptionTrend,
      importTrend,
      alertSummary
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Lỗi tải dashboard');
    res.redirect('/bao-cao');
  }
};
