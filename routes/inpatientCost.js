const express = require('express');
const router = express.Router();
const { isAuthenticated, authorize } = require('../middleware/authMiddleware');
const controller = require('../controllers/inpatientCostController');

// Danh sách bệnh nhân nội trú
router.get('/', isAuthenticated, authorize('ke_toan'), controller.list);

// Chi tiết chi phí
router.get('/chi-tiet/:dotId', isAuthenticated, authorize('ke_toan'), controller.showDetail);

// Chốt viện phí
router.post('/chot/:dotId', isAuthenticated, authorize('ke_toan'), controller.finalize);

module.exports = router;
