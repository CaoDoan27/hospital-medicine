const express = require('express');
const router = express.Router();
const { isAuthenticated, authorize } = require('../middleware/authMiddleware');
const controller = require('../controllers/drugCatalogController');

// Danh sách thuốc
router.get('/', isAuthenticated, authorize('duoc_si_tong'), controller.list);

// Form thêm thuốc
router.get('/them', isAuthenticated, authorize('duoc_si_tong'), controller.showCreate);

// Form sửa thuốc
router.get('/sua/:id', isAuthenticated, authorize('duoc_si_tong'), controller.showEdit);

// Thêm/Sửa thuốc
router.post('/luu', isAuthenticated, authorize('duoc_si_tong'), controller.save);

// Xóa thuốc (soft delete)
router.post('/xoa/:id', isAuthenticated, authorize('duoc_si_tong'), controller.remove);

module.exports = router;
