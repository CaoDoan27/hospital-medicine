const express = require('express');
const router = express.Router();
const { isAuthenticated, authorize } = require('../middleware/authMiddleware');
const controller = require('../controllers/warehouseImportController');

// Danh sách phiếu nhập
router.get('/', isAuthenticated, authorize('duoc_si_tong'), controller.list);

// Form tạo phiếu nhập
router.get('/tao', isAuthenticated, authorize('duoc_si_tong'), controller.showCreate);

// Lưu phiếu nhập
router.post('/luu', isAuthenticated, authorize('duoc_si_tong'), controller.save);

// API: Lấy chi tiết phiếu nhập
router.get('/api/chi-tiet/:id', isAuthenticated, controller.getDetails);

// API: Lấy thông tin thuốc
router.get('/api/thuoc/:id', isAuthenticated, controller.getDrug);

module.exports = router;
