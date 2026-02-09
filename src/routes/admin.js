const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

// 所有管理路由都需要管理员权限
router.use(authenticate);
router.use(authorize('admin'));

// 获取待审核酒店
router.get('/hotels/pending', AdminController.getPendingHotels);

// 审核酒店
router.post('/hotels/:id/review', AdminController.reviewHotel);

// 发布/下线酒店
router.post('/hotels/:id/toggle', AdminController.toggleHotelStatus);

// 获取所有酒店
router.get('/hotels', AdminController.getAllHotels);

// 获取统计信息
router.get('/statistics', AdminController.getStatistics);

module.exports = router;