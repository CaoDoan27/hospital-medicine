const express = require('express');
const router = express.Router();
const { isAuthenticated, authorize } = require('../middleware/authMiddleware');
const controller = require('../controllers/xmlExportController');

router.get('/', isAuthenticated, authorize('ke_toan', 'duoc_si_tong'), controller.index);

router.post('/generate', isAuthenticated, authorize('ke_toan', 'duoc_si_tong'), controller.generate);

module.exports = router;
