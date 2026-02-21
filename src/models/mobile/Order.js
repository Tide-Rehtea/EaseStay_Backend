const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');
const User = require('../User');
const Hotel = require('../Hotel');

/**
 * 订单模型
 * 存储用户预订酒店的订单信息
 */
const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  order_no: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '订单号'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    },
    comment: '用户ID'
  },
  hotel_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Hotel,
      key: 'id'
    },
    comment: '酒店ID'
  },
  // 预订的房型信息（快照，防止酒店修改房型后订单变化）
  room_info: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: '房型信息快照'
  },
  check_in_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: '入住日期'
  },
  check_out_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: '离店日期'
  },
  nights: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '入住晚数'
  },
  rooms_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: '房间数量'
  },
  adults: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2,
    comment: '成人人数'
  },
  children: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '儿童人数'
  },
  // 价格信息
  room_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '房单价'
  },
  total_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '总价'
  },
  discount_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: '优惠金额'
  },
  actual_payment: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '实付金额'
  },
  // 联系人信息
  contact_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '联系人姓名'
  },
  contact_phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '联系人电话'
  },
  special_requests: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '特殊要求'
  },
  // 订单状态
  order_status: {
    type: DataTypes.ENUM(
      '待支付', 
      '已支付', 
      '已确认', 
      '入住中', 
      '已完成', 
      '已取消', 
      '已退款'
    ),
    allowNull: false,
    defaultValue: '待支付',
    comment: '订单状态'
  },
  payment_method: {
    type: DataTypes.ENUM('微信支付', '支付宝', '银联', '余额'),
    allowNull: true,
    comment: '支付方式'
  },
  payment_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '支付时间'
  },
  cancel_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '取消原因'
  },
  cancel_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '取消时间'
  }
}, {
  tableName: 'orders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',

  hooks: {
    beforeCreate: async (order) => {
      // 生成唯一订单号：日期+随机数
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      order.order_no = `E${year}${month}${day}${random}`;
    }
  }
});

module.exports = Order;