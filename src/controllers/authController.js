const jwt = require('jsonwebtoken');
const { User } = require('../models');

class AuthController {
  // 用户注册
  static async register(req, res) {
    try {
      const { email, password, role = 'merchant' } = req.body;

      // 验证邮箱是否已存在
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: '邮箱已被注册'
        });
      }

      // 创建用户
      const user = await User.create({
        email,
        password,
        role
      });

      // 生成JWT token
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      res.status(201).json({
        success: true,
        message: '注册成功',
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            created_at: user.created_at
          },
          token
        }
      });
    } catch (error) {
      console.error('注册错误:', error);
      res.status(500).json({
        success: false,
        message: '注册失败',
        error: error.message
      });
    }
  }

  // 用户登录
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // 查找用户
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: '邮箱或密码错误'
        });
      }

      // 验证密码
      const isValidPassword = await user.verifyPassword(password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: '邮箱或密码错误'
        });
      }

      // 生成JWT token
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      res.json({
        success: true,
        message: '登录成功',
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            created_at: user.created_at
          },
          token
        }
      });
    } catch (error) {
      console.error('登录错误:', error);
      res.status(500).json({
        success: false,
        message: '登录失败',
        error: error.message
      });
    }
  }

  // 获取当前用户信息
  static async getProfile(req, res) {
    try {
      const user = req.user;
      
      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            created_at: user.created_at
          }
        }
      });
    } catch (error) {
      console.error('获取用户信息错误:', error);
      res.status(500).json({
        success: false,
        message: '获取用户信息失败',
        error: error.message
      });
    }
  }
}

module.exports = AuthController;