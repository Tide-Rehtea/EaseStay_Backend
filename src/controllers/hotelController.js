// controllers/hotelController.js

const { Hotel, User } = require('../models');
const { Op } = require('sequelize');

class HotelController {
  // 创建酒店
  static async createHotel(req, res) {
    try {
      const merchantId = req.user.id;
      const hotelData = req.body;

      // 验证图片数量
      if (hotelData.images && hotelData.images.length > 10) {
        return res.status(400).json({
          success: false,
          message: '最多上传10张图片'
        });
      }

      // 验证图片URL格式
      if (hotelData.images) {
        for (const image of hotelData.images) {
          if (!image.startsWith('/uploads/')) {
            return res.status(400).json({
              success: false,
              message: '图片URL格式不正确'
            });
          }
        }
      }

      const hotel = await Hotel.create({
        ...hotelData,
        merchant_id: merchantId,
        review_status: 'pending',  // 新创建酒店审核状态为待审核
        publish_status: 'unpublished' // 新创建酒店发布状态为未发布
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
      const { page = 1, limit = 10, review_status, publish_status } = req.query;
      const offset = (page - 1) * limit;

      // 构建查询条件
      const where = { merchant_id: merchantId };
      if (review_status) where.review_status = review_status;
      if (publish_status) where.publish_status = publish_status;

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

      // 转换数据格式 - 将字符串转换为数字
      const processedHotels = hotels.map(hotel => {
        const hotelData = hotel.toJSON();
        return {
          ...hotelData,
          price: parseFloat(hotelData.price),
          discount: hotelData.discount ? parseFloat(hotelData.discount) : null
        };
      });

      res.json({
        success: true,
        data: {
          hotels: processedHotels,
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

      // 转换数据格式
      const hotelData = hotel.toJSON();
      const processedHotel = {
        ...hotelData,
        price: parseFloat(hotelData.price),
        discount: hotelData.discount ? parseFloat(hotelData.discount) : null
      };

      res.json({
        success: true,
        data: { hotel: processedHotel }
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

      // 商户修改酒店后的状态处理逻辑
      if (req.user.role === 'merchant') {
        // 情况1: 已审核通过的酒店 - 修改后需要重新审核，并自动下线
        // 情况2: 被拒绝的酒店 - 修改后需要重新审核
        // 情况3: 待审核的酒店 - 保持待审核状态

        if (hotel.review_status === 'approved' || hotel.review_status === 'rejected') {
          updateData.review_status = 'pending';
          updateData.publish_status = 'unpublished'; // 修改后自动下线

          // 如果是被拒绝的酒店，清除拒绝原因
          if (hotel.review_status === 'rejected') {
            updateData.reject_reason = null;
          }
        }
        // 如果审核状态是 pending，保持不变
      }

      // 更新酒店
      await hotel.update(updateData);

      // 返回成功响应
      const responseData = {
        success: true,
        message: '酒店更新成功',
        data: { hotel }
      };

      // 添加额外的提示信息
      if (updateData.review_status === 'pending' && hotel.review_status !== 'pending') {
        responseData.message = '酒店信息更新成功，已重新提交审核';
      }

      res.json(responseData);
    } catch (error) {
      console.error('更新酒店错误:', error);
      res.status(500).json({
        success: false,
        message: '更新酒店失败',
        error: error.message
      });
    }
  }

  // 商户自行发布/下线酒店
  static async togglePublishStatus(req, res) {
    try {
      const { id } = req.params;
      const { action } = req.body; // 'publish' 或 'unpublish'

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

      // 权限检查
      if (hotel.merchant_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: '无权操作此酒店'
        });
      }

      // 发布检查
      if (action === 'publish') {
        if (hotel.review_status !== 'approved') {
          return res.status(400).json({
            success: false,
            message: '只有审核通过的酒店才能发布'
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
        message: `酒店已${action === 'publish' ? '发布' : '下线'}`,
        data: {
          publish_status: hotel.publish_status
        }
      });
    } catch (error) {
      console.error('切换发布状态错误:', error);
      res.status(500).json({
        success: false,
        message: '操作失败',
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

      // 管理员可以直接删除，商户只能下线（取消发布）
      if (req.user.role === 'admin') {
        await hotel.destroy();
        return res.json({
          success: true,
          message: '酒店删除成功'
        });
      } else {
        await hotel.update({ publish_status: 'unpublished' });
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