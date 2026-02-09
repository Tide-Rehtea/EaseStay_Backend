const { Hotel, User } = require('../models');

class HotelController {
  // 创建酒店
  static async createHotel(req, res) {
    try {
      const merchantId = req.user.id;
      const hotelData = req.body;

      // 验证商户身份
      if (req.user.role !== 'merchant') {
        return res.status(403).json({
          success: false,
          message: '只有商户可以创建酒店'
        });
      }

      // 创建酒店
      const hotel = await Hotel.create({
        ...hotelData,
        merchant_id: merchantId,
        status: 'pending' // 默认待审核状态
      });

      res.status(201).json({
        success: true,
        message: '酒店创建成功，等待审核',
        data: { hotel }
      });
    } catch (error) {
      console.error('创建酒店错误:', error);
      res.status(500).json({
        success: false,
        message: '创建酒店失败',
        error: error.message
      });
    }
  }

  // 获取酒店列表（商户端）
  static async getMerchantHotels(req, res) {
    try {
      const merchantId = req.user.id;
      const { page = 1, limit = 10, status } = req.query;
      const offset = (page - 1) * limit;

      // 构建查询条件
      const where = { merchant_id: merchantId };
      if (status) where.status = status;

      // 查询酒店
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
      console.error('获取酒店列表错误:', error);
      res.status(500).json({
        success: false,
        message: '获取酒店列表失败',
        error: error.message
      });
    }
  }

  // 获取单个酒店详情
  static async getHotelById(req, res) {
    try {
      const { id } = req.params;
      const hotel = await Hotel.findByPk(id, {
        include: [{
          model: User,
          as: 'merchant',
          attributes: ['id', 'email']
        }]
      });

      if (!hotel) {
        return res.status(404).json({
          success: false,
          message: '酒店不存在'
        });
      }

      // 权限检查：商户只能查看自己的酒店，管理员可以查看所有
      if (req.user.role === 'merchant' && hotel.merchant_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: '无权查看此酒店'
        });
      }

      res.json({
        success: true,
        data: { hotel }
      });
    } catch (error) {
      console.error('获取酒店详情错误:', error);
      res.status(500).json({
        success: false,
        message: '获取酒店详情失败',
        error: error.message
      });
    }
  }

  // 更新酒店信息
  static async updateHotel(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const hotel = await Hotel.findByPk(id);
      if (!hotel) {
        return res.status(404).json({
          success: false,
          message: '酒店不存在'
        });
      }

      // 权限检查
      if (req.user.role === 'merchant' && hotel.merchant_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: '无权修改此酒店'
        });
      }

      // 商户修改后需要重新审核
      if (req.user.role === 'merchant' && hotel.status === 'approved') {
        updateData.status = 'pending';
      }

      // 更新酒店
      await hotel.update(updateData);

      res.json({
        success: true,
        message: '酒店更新成功',
        data: { hotel }
      });
    } catch (error) {
      console.error('更新酒店错误:', error);
      res.status(500).json({
        success: false,
        message: '更新酒店失败',
        error: error.message
      });
    }
  }

  // 删除酒店（软删除）
  static async deleteHotel(req, res) {
    try {
      const { id } = req.params;

      const hotel = await Hotel.findByPk(id);
      if (!hotel) {
        return res.status(404).json({
          success: false,
          message: '酒店不存在'
        });
      }

      // 权限检查
      if (req.user.role === 'merchant' && hotel.merchant_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: '无权删除此酒店'
        });
      }

      // 管理员可以直接删除，商户只能标记为offline
      if (req.user.role === 'admin') {
        await hotel.destroy();
        return res.json({
          success: true,
          message: '酒店删除成功'
        });
      } else {
        await hotel.update({ status: 'offline' });
        return res.json({
          success: true,
          message: '酒店已下线'
        });
      }
    } catch (error) {
      console.error('删除酒店错误:', error);
      res.status(500).json({
        success: false,
        message: '删除酒店失败',
        error: error.message
      });
    }
  }
}

module.exports = HotelController;