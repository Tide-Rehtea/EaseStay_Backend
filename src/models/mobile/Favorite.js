const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');
const User = require('../User');
const Hotel = require('../Hotel');

/**
 * 收藏模型
 * 用户收藏的酒店
 */
const Favorite = sequelize.define('Favorite', {
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
  }
}, {
  tableName: 'favorites',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'hotel_id'],
      name: 'unique_user_hotel'
    }
  ]
});

module.exports = Favorite;