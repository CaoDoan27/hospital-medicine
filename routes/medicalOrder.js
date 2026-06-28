const express = require('express');
const router = express.Router();
const { isAuthenticated, authorize } = require('../middleware/authMiddleware');
const controller = require('../controllers/medicalOrderController');

// Trang y lệnh
router.get('/', isAuthenticated, authorize('dieu_duong'), controller.index);

// Tổng hợp y lệnh
router.post('/tong-hop', isAuthenticated, authorize('dieu_duong'), controller.aggregate);

// API: Lấy y lệnh chưa tổng hợp
router.get('/api/y-lenh', isAuthenticated, authorize('dieu_duong'), controller.getOrders);

// API: Chi tiết phiếu lĩnh
router.get('/api/phieu-linh/:id', isAuthenticated, controller.getPhieuLinhDetail);

module.exports = router;
