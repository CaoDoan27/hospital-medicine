const express = require('express');
const router = express.Router();
const { isAuthenticated, authorize } = require('../middleware/authMiddleware');
const controller = require('../controllers/emergencyCabinetController');

// Trang tủ trực
router.get('/', isAuthenticated, authorize('dieu_duong'), controller.index);

// Xuất thuốc tủ trực
router.post('/xuat', isAuthenticated, authorize('dieu_duong'), controller.dispense);

module.exports = router;
