const express = require('express');
const router = express.Router();
const { isAuthenticated, authorize } = require('../middleware/authMiddleware');
const { checkKhoNoiTru, list, showDetail, confirm } = require('../controllers/inpatientDispenseController');

// Danh sách phiếu lĩnh
router.get('/', isAuthenticated, authorize('duoc_si_kho_le'), checkKhoNoiTru, list);

// Chi tiết phiếu lĩnh
router.get('/chi-tiet/:id', isAuthenticated, authorize('duoc_si_kho_le'), checkKhoNoiTru, showDetail);

// Xác nhận cấp phát
router.post('/xac-nhan/:id', isAuthenticated, authorize('duoc_si_kho_le'), checkKhoNoiTru, confirm);

module.exports = router;
