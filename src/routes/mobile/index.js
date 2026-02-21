const express = require('express');
const router = express.Router();

// 导入认证中间件
const { mobileAuth, optionalMobileAuth } = require('../../middleware/mobileAuth');

// 导入控制器
const MobileAuthController = require('../../controllers/mobile/authController');
const BannerController = require('../../controllers/mobile/bannerController');
const CityController = require('../../controllers/mobile/cityController');
const SearchController = require('../../controllers/mobile/searchController');
const MobileHotelController = require('../../controllers/mobile/hotelController');
const OrderController = require('../../controllers/mobile/orderController');
const ChatController = require('../../controllers/mobile/chatController');

/**
 * 移动端API路由配置
 * 基础路径: /api/mobile
 */

// ==================== 认证相关 ====================
router.post('/auth/register', MobileAuthController.register);
router.post('/auth/login', MobileAuthController.login);
router.post('/auth/logout', mobileAuth, MobileAuthController.logout);

// ==================== 用户相关 ====================
router.get('/user/profile', mobileAuth, MobileAuthController.getProfile);
router.put('/user/profile', mobileAuth, MobileAuthController.updateProfile);
router.put('/user/password', mobileAuth, MobileAuthController.changePassword);
router.get('/user/member-level', mobileAuth, MobileAuthController.getMemberLevelInfo);
router.get('/user/favorites', mobileAuth, MobileHotelController.getUserFavorites);
router.get('/user/browse-history', optionalMobileAuth, MobileHotelController.getBrowseHistory);
router.get('/user/addresses', mobileAuth, CityController.getUserAddresses);

// ==================== 城市相关 ====================
router.get('/city/current', optionalMobileAuth, CityController.getCurrentCity);
router.get('/cities', CityController.getAllCities);
router.post('/city/switch', optionalMobileAuth, CityController.switchCity);
router.get('/cities/search', CityController.searchCities);

// ==================== Banner相关 ====================
router.get('/banners', BannerController.getActiveBanners);

// ==================== 搜索相关 ====================
router.get('/search/hotels', optionalMobileAuth, SearchController.searchHotels);
router.get('/search/history', mobileAuth, SearchController.getSearchHistory);
router.delete('/search/history', mobileAuth, SearchController.clearSearchHistory);
router.delete('/search/history/:keyword', mobileAuth, SearchController.deleteSearchHistory);
router.get('/search/hot', SearchController.getHotSearches);

// ==================== 酒店相关 ====================
router.get('/hotels', optionalMobileAuth, MobileHotelController.getHotelList);
router.get('/hotels/filters', MobileHotelController.getFilters);
router.get('/hotels/nearby', MobileHotelController.getNearbyHotels);
router.get('/hotels/:id', optionalMobileAuth, MobileHotelController.getHotelDetail);
router.post('/hotels/:id/favorite', mobileAuth, MobileHotelController.toggleFavorite);

// ==================== 订单相关 ====================
router.post('/orders', mobileAuth, OrderController.createOrder);
router.get('/orders', mobileAuth, OrderController.getOrders);
router.get('/orders/statistics', mobileAuth, OrderController.getOrderStatistics);
router.get('/orders/:id', mobileAuth, OrderController.getOrderDetail);
router.post('/orders/:id/cancel', mobileAuth, OrderController.cancelOrder);
router.post('/orders/:id/pay', mobileAuth, OrderController.payOrder);
router.post('/orders/:id/rebook', mobileAuth, OrderController.rebookOrder);

// ==================== 聊天机器人相关（占位） ====================
router.post('/chat/message', optionalMobileAuth, ChatController.sendMessage);
router.get('/chat/history', optionalMobileAuth, ChatController.getHistory);
router.get('/chat/faq', ChatController.getFaq);

module.exports = router;