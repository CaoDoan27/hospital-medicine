const express = require('express');
const router = express.Router();
const { isAuthenticated, authorize } = require('../middleware/authMiddleware');
const controller = require('../controllers/replenishmentController');

// Lập yêu cầu hoàn ứng (Điều dưỡng)
router.get('/yeu-cau', isAuthenticated, authorize('dieu_duong'), controller.showRequest);

// Lưu yêu cầu hoàn ứng
router.post('/yeu-cau/luu', isAuthenticated, authorize('dieu_duong'), controller.saveRequest);

// Duyệt hoàn ứng (Dược sĩ Kho lẻ)
router.get('/duyet', isAuthenticated, authorize('duoc_si_kho_le'), controller.showApproval);

// Xác nhận duyệt hoàn ứng
router.post('/duyet/xac-nhan/:id', isAuthenticated, authorize('duoc_si_kho_le'), controller.approve);

// API: Chi tiết phiếu hoàn ứng
router.get('/api/chi-tiet/:id', isAuthenticated, controller.getDetail);

module.exports = router;
