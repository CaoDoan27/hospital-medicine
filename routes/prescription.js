const express = require('express');
const router = express.Router();
const { isAuthenticated, authorize } = require('../middleware/authMiddleware');
const controller = require('../controllers/prescriptionController');

// Danh sách đơn thuốc của bác sĩ
router.get('/', isAuthenticated, authorize('bac_si'), controller.list);

// Form kê đơn mới
router.get('/tao', isAuthenticated, authorize('bac_si'), controller.showCreate);

// API: tìm bệnh nhân
router.get('/api/benh-nhan', isAuthenticated, authorize('bac_si'), controller.searchPatient);

// Lưu đơn thuốc mới
router.post('/luu', isAuthenticated, authorize('bac_si'), controller.save);

// Xem chi tiết đơn thuốc
router.get('/chi-tiet/:id', isAuthenticated, authorize('bac_si'), controller.showDetail);

// Hủy đơn thuốc
router.post('/huy/:id', isAuthenticated, authorize('bac_si'), controller.cancel);

module.exports = router;
