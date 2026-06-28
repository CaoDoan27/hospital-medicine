const express = require('express');
const router = express.Router();
const { isAuthenticated, authorize } = require('../middleware/authMiddleware');
const controller = require('../controllers/reportController');

router.get('/', isAuthenticated, authorize('duoc_si_tong', 'ke_toan'), controller.index);

// Dashboard quản trị (chỉ DS Tổng)
router.get('/dashboard', isAuthenticated, authorize('duoc_si_tong'), controller.dashboard);

module.exports = router;
