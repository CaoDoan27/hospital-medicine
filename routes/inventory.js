const express = require('express');
const router = express.Router();
const { isAuthenticated, authorize } = require('../middleware/authMiddleware');
const controller = require('../controllers/inventoryController');
const upload = require('../config/upload');

// Trang kiểm kê & cảnh báo
router.get('/', isAuthenticated, authorize('duoc_si_tong', 'duoc_si_kho_le'), controller.index);

// Bắt đầu kiểm kê
router.post('/bat-dau', isAuthenticated, authorize('duoc_si_tong', 'duoc_si_kho_le'), controller.start);

// Trang thực hiện kiểm kê
router.get('/thuc-hien/:id', isAuthenticated, authorize('duoc_si_tong', 'duoc_si_kho_le'), controller.showCheck);

// API: Chi tiết phiên kiểm kê
router.get('/api/chi-tiet/:id', isAuthenticated, controller.getSessionDetails);

// Hoàn tất kiểm kê (with file upload support)
router.post('/hoan-tat/:id', isAuthenticated, authorize('duoc_si_tong', 'duoc_si_kho_le'), upload.any(), controller.complete);

module.exports = router;
