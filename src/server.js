const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { testConnection, sequelize } = require('./config/db');
const authRoutes = require('./routes/auth');
const hotelRoutes = require('./routes/hotels');
const adminRoutes = require('./routes/admin');
const errorHandler = require('./middleware/errorHandler');
const uploadRoutes = require('./routes/upload');

// 导入移动端路由
const mobileRoutes = require('./routes/mobile');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务 - 使上传的图片可以访问
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 健康检查路由
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '服务器运行正常',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// 移动端API路由
app.use('/api/mobile', mobileRoutes);

// 404处理
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: '接口不存在',
    path: req.originalUrl,
    method: req.method
  });
});

// 错误处理中间件
app.use(errorHandler);

// 启动服务器
const startServer = async () => {
  try {
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ 数据库连接失败，服务器启动中止');
      process.exit(1);
    }

    // 同步数据库模型（仅开发环境使用）
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ 数据库模型同步完成');
    }

    app.listen(PORT, () => {
      console.log(`✅ 服务器运行在: http://localhost:${PORT}`);
      console.log(`📊 健康检查: http://localhost:${PORT}/health`);
      console.log(`🔐 认证接口: http://localhost:${PORT}/api/auth`);
      console.log(`🏨 酒店接口: http://localhost:${PORT}/api/hotels`);
      console.log(`👑 管理接口: http://localhost:${PORT}/api/admin`);
      console.log(`📱 移动端接口: http://localhost:${PORT}/api/mobile`);
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
};

startServer();