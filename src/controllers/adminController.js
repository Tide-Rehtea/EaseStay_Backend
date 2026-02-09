const { Hotel, User } = require('../models');

class AdminController {
  // 获取所有待审核酒店
  static async getPendingHotels(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows: hotels } = await Hotel.findAndCountAll({
        where: { status: 'pending' },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'ASC']],
        include: [{
          model: User,
          as: 'merchant',
          attributes: ['id', 'email', 'created_at']
        }]
      });

      res.json({
        success: true,
        data: {
          hotels,
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

      if (hotel.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: '酒店当前状态不可审核'
        });
      }

      // 更新酒店状态
      if (action === 'approve') {
        await hotel.update({ status: 'approved' });
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
          status: 'rejected',
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

      if (action === 'publish') {
        if (hotel.status !== 'approved') {
          return res.status(400).json({
            success: false,
            message: '只有已审核通过的酒店可以发布'
          });
        }
        await hotel.update({ status: 'approved' }); // 保持approved状态，可以添加published状态
      } else {
        if (hotel.status === 'offline') {
          return res.status(400).json({
            success: false,
            message: '酒店已处于下线状态'
          });
        }
        await hotel.update({ status: 'offline' });
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
        status,
        merchant_id,
        start_date,
        end_date
      } = req.query;
      
      const offset = (page - 1) * limit;
      
      // 构建查询条件
      const where = {};
      if (status) where.status = status;
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

      res.json({
        success: true,
        data: {
          hotels,
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
      const pendingHotels = await Hotel.count({ where: { status: 'pending' } });
      const approvedHotels = await Hotel.count({ where: { status: 'approved' } });
      const totalMerchants = await User.count({ where: { role: 'merchant' } });

      res.json({
        success: true,
        data: {
          total_hotels: totalHotels,
          pending_hotels: pendingHotels,
          approved_hotels: approvedHotels,
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