const express = require('express');
const router = express.Router();
const { isAuthenticated, authorize } = require('../middleware/authMiddleware');
const controller = require('../controllers/transferController');

// Danh sách phiếu điều chuyển
router.get('/', isAuthenticated, authorize('duoc_si_tong', 'duoc_si_kho_le'), controller.list);

// Form tạo phiếu dự trù (Kho lẻ)
router.get('/tao', isAuthenticated, authorize('duoc_si_kho_le'), controller.showCreate);

// Lưu phiếu dự trù
router.post('/luu', isAuthenticated, authorize('duoc_si_kho_le'), controller.save);

// Duyệt xuất (Kho tổng)
router.post('/duyet/:id', isAuthenticated, authorize('duoc_si_tong'), controller.approve);

// Xác nhận nhập kho (Kho lẻ)
router.post('/xac-nhan/:id', isAuthenticated, authorize('duoc_si_kho_le'), controller.confirm);

// API: Lấy chi tiết phiếu để duyệt (có tồn kho)
router.get('/api/duyet-chi-tiet/:id', isAuthenticated, authorize('duoc_si_tong'), controller.getApprovalDetails);

// API: Lấy chi tiết phiếu điều chuyển
router.get('/api/chi-tiet/:id', isAuthenticated, controller.getDetails);

module.exports = router;
