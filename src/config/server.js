/**
 * 服务端地址配置
 * 修改 API_BASE 或通过环境变量 API_HOST、API_PORT 可统一更换域名
 */
require('dotenv').config();

const API_HOST = process.env.API_HOST || 'localhost';
const API_PORT = process.env.API_PORT || process.env.PORT || 3001;

/** 服务端基础地址（供日志、重定向等使用） */
const API_BASE = `http://${API_HOST}:${API_PORT}`;

module.exports = {
  API_HOST,
  API_PORT,
  API_BASE,
};
