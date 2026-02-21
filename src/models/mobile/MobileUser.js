const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');
const User = require('../User');

/**
 * 移动端用户扩展信息模型
 * 与基础User表一对一关联，存储移动端特有的用户信息
 */
const MobileUser = sequelize.define('MobileUser', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: User,
      key: 'id'
    },
    comment: '关联的基础用户ID'
  },
  nickname: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: '携友',
    comment: '用户昵称'
  },
  avatar: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: '/uploads/default-avatar.png',
    comment: '头像URL'
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
    comment: '手机号'
  },
  member_level: {
    type: DataTypes.ENUM('普通会员', '白银会员', '黄金会员', '铂金会员', '钻石会员'),
    allowNull: false,
    defaultValue: '普通会员',
    comment: '会员等级'
  },
  points: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '积分'
  },
  birthday: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: '生日'
  },
  gender: {
    type: DataTypes.ENUM('男', '女', '保密'),
    allowNull: false,
    defaultValue: '保密',
    comment: '性别'
  },
  last_login_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '最后登录时间'
  },
  login_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '登录次数'
  }
}, {
  tableName: 'mobile_users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = MobileUser;