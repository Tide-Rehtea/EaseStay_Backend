const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');
const User = require('../User');
const Hotel = require('../Hotel');

/**
 * 浏览历史模型
 * 记录用户浏览过的酒店
 */
const BrowseHistory = sequelize.define('BrowseHistory', {
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
  hotel_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Hotel,
      key: 'id'
    }
  },
  browse_time: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '浏览时间'
  }
}, {
  tableName: 'browse_histories',
  timestamps: true,
  createdAt: 'browse_time',
  updatedAt: false
});

module.exports = BrowseHistory;