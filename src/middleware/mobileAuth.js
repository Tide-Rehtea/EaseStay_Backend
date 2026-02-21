const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { MobileUser } = require('../models/mobile');

/**
 * 移动端认证中间件
 * 验证用户Token，并加载移动端扩展信息
 */
const mobileAuth = async (req, res, next) => {
  try {
    // 获取token
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '请先登录',
        code: 'UNAUTHORIZED'
      });
    }

    // 验证token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 查找用户
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在',
        code: 'USER_NOT_FOUND'
      });
    }

    // 移动端只允许普通用户访问（商户和管理员不能登录移动端）
    // 如果需要允许商户登录移动端，可以去掉这个限制
    if (user.role !== 'merchant' && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权访问移动端',
        code: 'ACCESS_DENIED'
      });
    }

    // 获取或创建移动端扩展信息
    let mobileUser = await MobileUser.findOne({
      where: { user_id: user.id }
    });

    // 如果不存在移动端扩展信息，自动创建
    if (!mobileUser) {
      mobileUser = await MobileUser.create({
        user_id: user.id,
        nickname: `用户${user.id}`,
        avatar: '/uploads/default-avatar.png'
      });
    }

    // 更新最后登录时间
    await mobileUser.update({
      last_login_at: new Date(),
      login_count: mobileUser.login_count + 1
    });

    // 将用户信息挂载到req对象
    req.user = user;
    req.mobileUser = mobileUser;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '登录已过期，请重新登录',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '无效的token',
        code: 'INVALID_TOKEN'
      });
    }

    console.error('认证中间件错误:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * 可选的认证中间件
 * 如果有token则验证，没有也可以继续访问
 */
const optionalMobileAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.userId, {
        attributes: { exclude: ['password'] }
      });
      
      if (user) {
        req.user = user;
        
        // 获取移动端扩展信息
        const mobileUser = await MobileUser.findOne({
          where: { user_id: user.id }
        });
        
        if (mobileUser) {
          req.mobileUser = mobileUser;
        }
      }
    }
    
    next();
  } catch (error) {
    // token无效也继续，只是不设置用户信息
    next();
  }
};

module.exports = {
  mobileAuth,
  optionalMobileAuth
};