const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Hotel = require('./Hotel');
const User = require('./User');

const Review = sequelize.define('Review', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  hotel_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Hotel,
      key: 'id'
    }
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'reviews',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// 定义关联关系
Review.belongsTo(Hotel, { foreignKey: 'hotel_id' });
Review.belongsTo(User, { foreignKey: 'user_id' });
Hotel.hasMany(Review, { foreignKey: 'hotel_id' });
User.hasMany(Review, { foreignKey: 'user_id' });

module.exports = Review;