const { Order, MobileUser } = require('../../models/mobile');
const { Hotel } = require('../../models');
const ResponseUtil = require('../../utils/response');
const Validator = require('../../utils/validator');
const PriceCalculator = require('../../utils/priceCalculator');
const { Op } = require('sequelize');

/**
 * 订单控制器
 * 处理订单创建、查询、取消等功能
 */
class OrderController {
  /**
   * 创建订单
   * POST /api/mobile/orders
   * 需求：立即预订，跳转至订单确认页
   */
  static async createOrder(req, res) {
    try {
      if (!req.user) {
        return ResponseUtil.unauthorized(res);
      }

      const {
        hotel_id,
        room_info,
        check_in_date,
        check_out_date,
        rooms_count,
        adults,
        children,
        contact_name,
        contact_phone,
        special_requests
      } = req.body;

      // 验证必填字段
      const required = Validator.validateRequired(req.body, [
        'hotel_id', 'room_info', 'check_in_date', 'check_out_date',
        'contact_name', 'contact_phone'
      ]);
      
      if (!required.valid) {
        return ResponseUtil.error(res, required.message, 400);
      }

      // 验证日期
      const dateValidation = Validator.validateDateRange(check_in_date, check_out_date);
      if (!dateValidation.valid) {
        return ResponseUtil.error(res, dateValidation.message, 400);
      }

      // 验证手机号
      if (!Validator.isValidPhone(contact_phone)) {
        return ResponseUtil.error(res, '手机号格式不正确', 400);
      }

      // 查询酒店
      const hotel = await Hotel.findOne({
        where: {
          id: hotel_id,
          review_status: 'approved',
          publish_status: 'published'
        }
      });

      if (!hotel) {
        return ResponseUtil.notFound(res, '酒店不存在');
      }

      // 获取用户会员等级
      const mobileUser = await MobileUser.findOne({
        where: { user_id: req.user.id }
      });

      // 计算价格
      const basePrice = parseFloat(room_info.price || hotel.price);
      const memberDiscount = mobileUser ? 
        PriceCalculator.getMemberDiscount(mobileUser.member_level) : 1;

      const priceCalculation = PriceCalculator.calculateTotalPrice(basePrice, {
        nights: dateValidation.nights,
        rooms: rooms_count || 1,
        discount: hotel.discount ? parseFloat(hotel.discount) : null,
        memberDiscount: memberDiscount < 1 ? memberDiscount : null
      });

      // 创建订单
      const order = await Order.create({
        user_id: req.user.id,
        hotel_id,
        room_info: {
          ...room_info,
          booked_price: basePrice
        },
        check_in_date,
        check_out_date,
        nights: dateValidation.nights,
        rooms_count: rooms_count || 1,
        adults: adults || 2,
        children: children || 0,
        room_price: basePrice,
        total_price: priceCalculation.originalTotal,
        discount_amount: priceCalculation.totalDiscount,
        actual_payment: priceCalculation.finalTotal,
        contact_name,
        contact_phone,
        special_requests,
        order_status: '待支付'
      });

      // 返回订单信息
      return ResponseUtil.created(res, {
        order_no: order.order_no,
        order_id: order.id,
        hotel: {
          id: hotel.id,
          name: hotel.name,
          address: hotel.address,
          phone: hotel.phone,
          image: hotel.images?.[0] || '/uploads/default-hotel.jpg'
        },
        room_info: order.room_info,
        check_in_date: order.check_in_date,
        check_out_date: order.check_out_date,
        nights: order.nights,
        rooms_count: order.rooms_count,
        guests: {
          adults: order.adults,
          children: order.children
        },
        contact: {
          name: order.contact_name,
          phone: order.contact_phone
        },
        price_detail: {
          original_total: order.total_price,
          discount_amount: order.discount_amount,
          actual_payment: order.actual_payment,
          average_per_night: order.actual_payment / order.nights
        },
        order_status: order.order_status,
        created_at: order.created_at,
        cancelable: true // 待支付订单可取消
      }, '订单创建成功');

    } catch (error) {
      console.error('创建订单错误:', error);
      return ResponseUtil.error(res, '创建订单失败', 500);
    }
  }

  /**
   * 获取订单列表
   * GET /api/mobile/orders
   * 需求：订单分类（全部、待入住、已入住、已取消）
   */
  static async getOrders(req, res) {
    try {
      if (!req.user) {
        return ResponseUtil.unauthorized(res);
      }

      const { status, page, pageSize } = req.query;
      const pagination = Validator.validatePagination(page, pageSize);

      // 构建查询条件
      const where = { user_id: req.user.id };
      
      if (status && status !== '全部') {
        switch (status) {
          case '待入住':
            where.order_status = { [Op.in]: ['待支付', '已支付', '已确认'] };
            break;
          case '已入住':
            where.order_status = { [Op.in]: ['入住中', '已完成'] };
            break;
          case '已取消':
            where.order_status = { [Op.in]: ['已取消', '已退款'] };
            break;
          default:
            // 全部订单，不添加状态筛选
            break;
        }
      }

      // 查询订单
      const orders = await Order.findAndCountAll({
        where,
        include: [{
          model: Hotel,
          as: 'hotel',
          attributes: ['id', 'name', 'address', 'images']
        }],
        order: [['created_at', 'DESC']],
        limit: pagination.pageSize,
        offset: (pagination.page - 1) * pagination.pageSize
      });

      // 处理返回数据
      const list = orders.rows.map(order => ({
        id: order.id,
        order_no: order.order_no,
        hotel: {
          id: order.hotel.id,
          name: order.hotel.name,
          address: order.hotel.address,
          image: order.hotel.images?.[0] || '/uploads/default-hotel.jpg'
        },
        room_name: order.room_info?.name || '标准房',
        check_in_date: order.check_in_date,
        check_out_date: order.check_out_date,
        nights: order.nights,
        rooms_count: order.rooms_count,
        actual_payment: order.actual_payment,
        order_status: order.order_status,
        created_at: order.created_at,
        can_cancel: ['待支付', '已支付'].includes(order.order_status),
        can_pay: order.order_status === '待支付',
        can_review: order.order_status === '已完成' // 可评价
      }));

      return ResponseUtil.paginate(res, list, {
        ...pagination,
        total: orders.count
      });

    } catch (error) {
      console.error('获取订单列表错误:', error);
      return ResponseUtil.error(res, '获取订单列表失败', 500);
    }
  }

  /**
   * 获取订单详情
   * GET /api/mobile/orders/:id
   * 需求：查看订单详细信息
   */
  static async getOrderDetail(req, res) {
    try {
      if (!req.user) {
        return ResponseUtil.unauthorized(res);
      }

      const { id } = req.params;

      const order = await Order.findOne({
        where: {
          id,
          user_id: req.user.id
        },
        include: [{
          model: Hotel,
          as: 'hotel',
          attributes: ['id', 'name', 'name_en', 'address', 'phone', 'star', 'images']
        }]
      });

      if (!order) {
        return ResponseUtil.notFound(res, '订单不存在');
      }

      return ResponseUtil.success(res, {
        id: order.id,
        order_no: order.order_no,
        hotel: {
          id: order.hotel.id,
          name: order.hotel.name,
          name_en: order.hotel.name_en,
          address: order.hotel.address,
          phone: order.hotel.phone,
          star: order.hotel.star,
          image: order.hotel.images?.[0] || '/uploads/default-hotel.jpg',
          images: order.hotel.images || []
        },
        room_info: order.room_info,
        check_in_date: order.check_in_date,
        check_out_date: order.check_out_date,
        nights: order.nights,
        rooms_count: order.rooms_count,
        guests: {
          adults: order.adults,
          children: order.children
        },
        contact: {
          name: order.contact_name,
          phone: order.contact_phone
        },
        special_requests: order.special_requests,
        price_detail: {
          room_price: order.room_price,
          subtotal: order.total_price,
          discount: order.discount_amount,
          total: order.actual_payment,
          average_per_night: order.actual_payment / order.nights
        },
        order_status: order.order_status,
        payment_method: order.payment_method,
        payment_time: order.payment_time,
        cancel_reason: order.cancel_reason,
        cancel_time: order.cancel_time,
        created_at: order.created_at,
        updated_at: order.updated_at,
        can_cancel: ['待支付', '已支付'].includes(order.order_status),
        can_pay: order.order_status === '待支付',
        can_review: order.order_status === '已完成'
      });

    } catch (error) {
      console.error('获取订单详情错误:', error);
      return ResponseUtil.error(res, '获取订单详情失败', 500);
    }
  }

  /**
   * 取消订单
   * POST /api/mobile/orders/:id/cancel
   * 需求：支持取消订单
   */
  static async cancelOrder(req, res) {
    try {
      if (!req.user) {
        return ResponseUtil.unauthorized(res);
      }

      const { id } = req.params;
      const { reason } = req.body;

      const order = await Order.findOne({
        where: {
          id,
          user_id: req.user.id
        }
      });

      if (!order) {
        return ResponseUtil.notFound(res, '订单不存在');
      }

      // 检查是否可取消
      if (!['待支付', '已支付'].includes(order.order_status)) {
        return ResponseUtil.error(res, '当前订单状态不可取消', 400);
      }

      // 更新订单状态
      await order.update({
        order_status: '已取消',
        cancel_reason: reason || '用户主动取消',
        cancel_time: new Date()
      });

      // 如果已支付，需要退款（简化处理）
      if (order.order_status === '已支付') {
        // TODO: 调用支付平台退款接口
        console.log(`订单 ${order.order_no} 需要退款 ${order.actual_payment}元`);
      }

      return ResponseUtil.success(res, null, '订单已取消');

    } catch (error) {
      console.error('取消订单错误:', error);
      return ResponseUtil.error(res, '取消订单失败', 500);
    }
  }

  /**
   * 支付订单
   * POST /api/mobile/orders/:id/pay
   * 需求：订单支付（模拟）
   */
  static async payOrder(req, res) {
    try {
      if (!req.user) {
        return ResponseUtil.unauthorized(res);
      }

      const { id } = req.params;
      const { payment_method } = req.body;

      const order = await Order.findOne({
        where: {
          id,
          user_id: req.user.id
        }
      });

      if (!order) {
        return ResponseUtil.notFound(res, '订单不存在');
      }

      if (order.order_status !== '待支付') {
        return ResponseUtil.error(res, '订单状态异常，无法支付', 400);
      }

      // 模拟支付过程
      await order.update({
        order_status: '已支付',
        payment_method: payment_method || '微信支付',
        payment_time: new Date()
      });

      // 增加用户积分（消费1元积1分）
      const mobileUser = await MobileUser.findOne({
        where: { user_id: req.user.id }
      });
      
      if (mobileUser) {
        const pointsEarned = Math.floor(order.actual_payment);
        await mobileUser.update({
          points: mobileUser.points + pointsEarned
        });
      }

      return ResponseUtil.success(res, {
        order_no: order.order_no,
        payment_time: order.payment_time,
        payment_method: order.payment_method,
        points_earned: Math.floor(order.actual_payment)
      }, '支付成功');

    } catch (error) {
      console.error('支付订单错误:', error);
      return ResponseUtil.error(res, '支付失败', 500);
    }
  }

  /**
   * 再次预订
   * POST /api/mobile/orders/:id/rebook
   * 需求：一键重复预订
   */
  static async rebookOrder(req, res) {
    try {
      if (!req.user) {
        return ResponseUtil.unauthorized(res);
      }

      const { id } = req.params;

      const originalOrder = await Order.findOne({
        where: {
          id,
          user_id: req.user.id
        }
      });

      if (!originalOrder) {
        return ResponseUtil.notFound(res, '订单不存在');
      }

      // 创建新订单（基于原订单信息）
      const newOrder = await Order.create({
        user_id: req.user.id,
        hotel_id: originalOrder.hotel_id,
        room_info: originalOrder.room_info,
        check_in_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // 明天
        check_out_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // 后天
        nights: 1,
        rooms_count: originalOrder.rooms_count,
        adults: originalOrder.adults,
        children: originalOrder.children,
        room_price: originalOrder.room_price,
        total_price: originalOrder.room_price,
        discount_amount: 0,
        actual_payment: originalOrder.room_price,
        contact_name: originalOrder.contact_name,
        contact_phone: originalOrder.contact_phone,
        order_status: '待支付'
      });

      return ResponseUtil.success(res, {
        order_id: newOrder.id,
        order_no: newOrder.order_no
      }, '预订成功，请完成支付');

    } catch (error) {
      console.error('再次预订错误:', error);
      return ResponseUtil.error(res, '再次预订失败', 500);
    }
  }

  /**
   * 获取订单统计
   * GET /api/mobile/orders/statistics
   * 需求：各状态订单数量统计
   */
  static async getOrderStatistics(req, res) {
    try {
      if (!req.user) {
        return ResponseUtil.unauthorized(res);
      }

      const userId = req.user.id;

      // 统计各状态订单数量
      const all = await Order.count({ where: { user_id: userId } });
      
      const toPay = await Order.count({ 
        where: { 
          user_id: userId,
          order_status: '待支付'
        }
      });

      const toCheckIn = await Order.count({
        where: {
          user_id: userId,
          order_status: { [Op.in]: ['已支付', '已确认'] }
        }
      });

      const checkedIn = await Order.count({
        where: {
          user_id: userId,
          order_status: { [Op.in]: ['入住中', '已完成'] }
        }
      });

      const cancelled = await Order.count({
        where: {
          user_id: userId,
          order_status: { [Op.in]: ['已取消', '已退款'] }
        }
      });

      return ResponseUtil.success(res, {
        all,
        to_pay: toPay,
        to_check_in: toCheckIn,
        checked_in: checkedIn,
        cancelled
      });

    } catch (error) {
      console.error('获取订单统计错误:', error);
      return ResponseUtil.error(res, '获取订单统计失败', 500);
    }
  }
}

module.exports = OrderController;