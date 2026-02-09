const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// 用户注册
router.post('/register', AuthController.register);

// 用户登录
router.post('/login', AuthController.login);

// 获取当前用户信息（需要登录）
router.get('/profile', authenticate, AuthController.getProfile);

module.exports = router;