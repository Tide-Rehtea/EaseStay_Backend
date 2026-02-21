const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');
const Hotel = require('../Hotel');

/**
 * 广告位模型
 * 管理首页Banner广告
 */
const Banner = sequelize.define('Banner', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '广告标题'
  },
  image_url: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '广告图片URL'
  },
  // 跳转类型：hotel-跳转酒店详情，url-跳转H5页面
  link_type: {
    type: DataTypes.ENUM('hotel', 'url'),
    allowNull: false,
    defaultValue: 'hotel'
  },
  // 跳转目标：hotel_id 或 URL
  link_target: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '跳转目标'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '排序顺序'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    allowNull: false,
    defaultValue: 'active',
    comment: '状态'
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '生效开始时间'
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '生效结束时间'
  }
}, {
  tableName: 'banners',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 关联酒店（当link_type为hotel时）
Banner.belongsTo(Hotel, { 
  foreignKey: 'link_target', 
  targetKey: 'id',
  constraints: false,
  as: 'hotel'
});

module.exports = Banner;