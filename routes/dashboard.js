const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/authMiddleware');
const controller = require('../controllers/dashboardController');

router.get('/', isAuthenticated, controller.index);

module.exports = router;
