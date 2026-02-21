const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');
const User = require('../User');

/**
 * 用户地址模型
 * 存储用户常用的地址信息（用于定位和城市选择）
 */
const UserAddress = sequelize.define('UserAddress', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '城市'
  },
  city_code: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: '城市代码'
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    comment: '纬度'
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
    comment: '经度'
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '详细地址'
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否默认地址'
  }
}, {
  tableName: 'user_addresses',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = UserAddress;