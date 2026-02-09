const express = require('express');
const router = express.Router();
const HotelController = require('../controllers/hotelController');
const { authenticate, authorize } = require('../middleware/auth');

// 所有酒店路由都需要认证
router.use(authenticate);

// 商户创建酒店
router.post('/', authorize('merchant'), HotelController.createHotel);

// 商户获取自己的酒店列表
router.get('/my-hotels', authorize('merchant'), HotelController.getMerchantHotels);

// 获取单个酒店详情
router.get('/:id', HotelController.getHotelById);

// 更新酒店信息
router.put('/:id', HotelController.updateHotel);

// 删除/下线酒店
router.delete('/:id', HotelController.deleteHotel);

module.exports = router;