// controllers/adminController.js

const { Hotel, User } = require('../models');
const { Op } = require('sequelize');

class AdminController {
  // 获取所有待审核酒店
  static async getPendingHotels(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows: hotels } = await Hotel.findAndCountAll({
        where: { review_status: 'pending' },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'ASC']],
        include: [{
          model: User,
          as: 'merchant',
          attributes: ['id', 'email', 'created_at']
        }]
      });

      // 转换酒店数据中的价格和折扣类型
      const formattedHotels = hotels.map(hotel => {
        const hotelData = hotel.toJSON();
        return {
          ...hotelData,
          price: parseFloat(hotelData.price),
          discount: hotelData.discount ? parseFloat(hotelData.discount) : null,
          room_type: hotelData.room_type ? hotelData.room_type.map(room => ({
            ...room,
            price: parseFloat(room.price)
          })) : []
        };
      });

      res.json({
        success: true,
        data: {
          hotels: formattedHotels,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('获取待审核酒店错误:', error);
      res.status(500).json({
        success: false,
        message: '获取待审核酒店失败',
        error: error.message
      });
    }
  }

  // 审核酒店
  static async reviewHotel(req, res) {
    try {
      const { id } = req.params;
      const { action, reject_reason } = req.body;

      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: '无效的操作类型'
        });
      }

      const hotel = await Hotel.findByPk(id);
      if (!hotel) {
        return res.status(404).json({
          success: false,
          message: '酒店不存在'
        });
      }

      if (hotel.review_status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: '酒店当前状态不可审核'
        });
      }

      // 更新酒店审核状态
      if (action === 'approve') {
        await hotel.update({ 
          review_status: 'approved'
          // 注意：不改变 publish_status，保持原有的发布状态
        });
        return res.json({
          success: true,
          message: '酒店审核通过'
        });
      } else {
        if (!reject_reason) {
          return res.status(400).json({
            success: false,
            message: '拒绝审核必须提供原因'
          });
        }
        await hotel.update({
          review_status: 'rejected',
          reject_reason
        });
        return res.json({
          success: true,
          message: '酒店审核拒绝'
        });
      }
    } catch (error) {
      console.error('审核酒店错误:', error);
      res.status(500).json({
        success: false,
        message: '审核酒店失败',
        error: error.message
      });
    }
  }

  // 发布/下线酒店
  static async toggleHotelStatus(req, res) {
    try {
      const { id } = req.params;
      const { action } = req.body;

      if (!['publish', 'unpublish'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: '无效的操作类型'
        });
      }

      const hotel = await Hotel.findByPk(id);
      if (!hotel) {
        return res.status(404).json({
          success: false,
          message: '酒店不存在'
        });
      }

      // 检查审核状态
      if (action === 'publish') {
        if (hotel.review_status !== 'approved') {
          return res.status(400).json({
            success: false,
            message: '只有审核通过的酒店可以发布'
          });
        }
        if (hotel.publish_status === 'published') {
          return res.status(400).json({
            success: false,
            message: '酒店已处于发布状态'
          });
        }
        await hotel.update({ publish_status: 'published' });
      } else {
        if (hotel.publish_status === 'unpublished') {
          return res.status(400).json({
            success: false,
            message: '酒店已处于下线状态'
          });
        }
        await hotel.update({ publish_status: 'unpublished' });
      }

      res.json({
        success: true,
        message: `酒店已${action === 'publish' ? '发布' : '下线'}`
      });
    } catch (error) {
      console.error('切换酒店状态错误:', error);
      res.status(500).json({
        success: false,
        message: '操作失败',
        error: error.message
      });
    }
  }

  // 获取所有酒店（管理员）
  static async getAllHotels(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        review_status,  // 审核状态
        publish_status, // 发布状态
        merchant_id,
        start_date,
        end_date
      } = req.query;
      
      const offset = (page - 1) * limit;
      
      // 构建查询条件
      const where = {};
      if (review_status) where.review_status = review_status;
      if (publish_status) where.publish_status = publish_status;
      if (merchant_id) where.merchant_id = merchant_id;
      
      // 日期范围查询
      if (start_date || end_date) {
        where.created_at = {};
        if (start_date) where.created_at[Op.gte] = new Date(start_date);
        if (end_date) where.created_at[Op.lte] = new Date(end_date);
      }

      const { count, rows: hotels } = await Hotel.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        include: [{
          model: User,
          as: 'merchant',
          attributes: ['id', 'email']
        }]
      });

      // 转换所有酒店的价格和折扣类型
      const formattedHotels = hotels.map(hotel => {
        const hotelData = hotel.toJSON();
        return {
          ...hotelData,
          price: parseFloat(hotelData.price),
          discount: hotelData.discount ? parseFloat(hotelData.discount) : null,
          room_type: hotelData.room_type ? hotelData.room_type.map(room => ({
            ...room,
            price: parseFloat(room.price)
          })) : []
        };
      });

      res.json({
        success: true,
        data: {
          hotels: formattedHotels,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('获取所有酒店错误:', error);
      res.status(500).json({
        success: false,
        message: '获取酒店列表失败',
        error: error.message
      });
    }
  }

  // 获取统计信息
  static async getStatistics(req, res) {
    try {
      const totalHotels = await Hotel.count();
      const pendingReview = await Hotel.count({ where: { review_status: 'pending' } });
      const approvedReview = await Hotel.count({ where: { review_status: 'approved' } });
      const rejectedReview = await Hotel.count({ where: { review_status: 'rejected' } });
      const publishedHotels = await Hotel.count({ where: { publish_status: 'published' } });
      const unpublishedHotels = await Hotel.count({ where: { publish_status: 'unpublished' } });
      const totalMerchants = await User.count({ where: { role: 'merchant' } });

      res.json({
        success: true,
        data: {
          total_hotels: totalHotels,
          review_stats: {
            pending: pendingReview,
            approved: approvedReview,
            rejected: rejectedReview
          },
          publish_stats: {
            published: publishedHotels,
            unpublished: unpublishedHotels
          },
          total_merchants: totalMerchants
        }
      });
    } catch (error) {
      console.error('获取统计信息错误:', error);
      res.status(500).json({
        success: false,
        message: '获取统计信息失败',
        error: error.message
      });
    }
  }
}

module.exports = AdminController;