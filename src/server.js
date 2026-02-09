const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./config/db');
const authRoutes = require('./routes/auth');
const hotelRoutes = require('./routes/hotels');
const adminRoutes = require('./routes/admin');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// ✅ 修复：将 404 处理放在所有路由之后，但错误处理之前
// 方法1：直接使用中间件函数（推荐）
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: '接口不存在',
    path: req.originalUrl,
    method: req.method
  });
});

// ✅ 方法2：如果要保留路径匹配，确保它在 app 上，而不是 router 上
// app.use('*', (req, res) => {
//   res.status(404).json({
//     success: false,
//     message: '接口不存在'
//   });
// });

// 错误处理中间件（必须在最后）
app.use(errorHandler);

// 启动服务器
const startServer = async () => {
  try {
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ 数据库连接失败，服务器启动中止');
      process.exit(1);
    }

    app.listen(PORT, () => {
      console.log(`✅ 服务器运行在: http://localhost:${PORT}`);
      console.log(`📊 健康检查: http://localhost:${PORT}/health`);
      console.log(`🔐 认证接口: http://localhost:${PORT}/api/auth`);
      console.log(`🏨 酒店接口: http://localhost:${PORT}/api/hotels`);
      console.log(`👑 管理接口: http://localhost:${PORT}/api/admin`);
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
};

startServer();