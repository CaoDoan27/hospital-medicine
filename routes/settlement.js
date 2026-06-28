const express = require('express');
const router = express.Router();
const { isAuthenticated, authorize } = require('../middleware/authMiddleware');
const controller = require('../controllers/settlementController');

router.get('/', isAuthenticated, authorize('ke_toan'), controller.index);

module.exports = router;
