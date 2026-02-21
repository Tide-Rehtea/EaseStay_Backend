const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');
const User = require('../User');

/**
 * 搜索历史模型
 * 记录用户的搜索关键词
 */
const SearchHistory = sequelize.define('SearchHistory', {
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
  keyword: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '搜索关键词'
  },
  search_time: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '搜索时间'
  }
}, {
  tableName: 'search_histories',
  timestamps: true,
  createdAt: 'search_time',
  updatedAt: false,
  indexes: [
    {
      fields: ['user_id', 'search_time']
    }
  ]
});

module.exports = SearchHistory;