const express = require('express');
const router = express.Router();
const { isAuthenticated, authorize } = require('../middleware/authMiddleware');
const { checkKhoNgoaiTru, list, showPrescription, dispense } = require('../controllers/outpatientController');

// Trang cấp phát ngoại trú
router.get('/', isAuthenticated, authorize('duoc_si_kho_le'), checkKhoNgoaiTru, list);

// Chi tiết đơn thuốc & tính BHYT
router.get('/don/:id', isAuthenticated, authorize('duoc_si_kho_le'), checkKhoNgoaiTru, showPrescription);

// Xác nhận cấp phát
router.post('/cap-phat', isAuthenticated, authorize('duoc_si_kho_le'), checkKhoNgoaiTru, dispense);

module.exports = router;
