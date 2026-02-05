const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');

const Hotel = sequelize.define('Hotel', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  name_en: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  star: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  room_type: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  open_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  images: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  facilities: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  nearby_attractions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  discount: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: null
  },
  discount_description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'offline'),
    allowNull: false,
    defaultValue: 'pending'
  },
  reject_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  merchant_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'hotels',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  
  hooks: {
    beforeUpdate: (hotel) => {
      hotel.updated_at = new Date();
    }
  }
});

// 定义关联关系
Hotel.belongsTo(User, { foreignKey: 'merchant_id', as: 'merchant' });
User.hasMany(Hotel, { foreignKey: 'merchant_id', as: 'hotels' });

module.exports = Hotel;