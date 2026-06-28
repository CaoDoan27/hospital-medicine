const express = require('express');
const router = express.Router();
const controller = require('../controllers/authController');

// GET /login
router.get('/login', controller.showLogin);

// POST /login
router.post('/login', controller.login);

// GET /logout
router.get('/logout', controller.logout);

// Redirect root to dashboard or login
router.get('/', controller.redirectRoot);

module.exports = router;
