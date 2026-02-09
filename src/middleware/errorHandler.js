const errorHandler = (err, req, res, next) => {
  console.error('❌ 错误:', err);

  let statusCode = 500;
  let message = '服务器内部错误';

  // Sequelize 验证错误
  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = err.errors.map(e => e.message).join(', ');
  }

  // Sequelize 唯一约束错误
  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 400;
    message = '数据已存在';
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = '无效的token';
  }

  // Token 过期
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = '登录已过期';
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

module.exports = errorHandler;