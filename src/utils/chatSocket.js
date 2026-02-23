/**
 * WebSocket 聊天工具（接入真实酒店/订单数据）
 */

const WebSocket = require('ws');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { Hotel } = require('../models');
const { Order, MobileUser } = require('../models/mobile');
const PriceCalculator = require('./priceCalculator');

class ChatSocket {
  constructor(server) {
    this.wss = null;
    this.clients = new Map(); // sessionId -> { ws, userId, sessionId, context }
    this.server = server;
  }

  /**
   * 初始化 WebSocket 服务器
   */
  initialize() {
    this.wss = new WebSocket.Server({
      server: this.server,
      path: '/chat'
    });

    console.log('📡 WebSocket 聊天服务初始化完成，路径: /chat');
    console.log('📡 服务器地址:', this.getServerAddress());

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    this.wss.on('error', (error) => {
      console.error('❌ WebSocket 服务器错误:', error);
    });
  }

  /**
   * 获取服务器地址
   */
  getServerAddress() {
    const address = this.server.address();
    if (typeof address === 'string') {
      return address;
    }
    return `http://localhost:${address?.port || 3001}`;
  }

  /**
   * 处理新连接
   */
  handleConnection(ws, req) {
    try {
      // 解析 URL 参数
      const url = new URL(req.url, `http://${req.headers.host}`);
      const sessionId = url.searchParams.get('sessionId') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const token = url.searchParams.get('token');

      let userId = null;
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          userId = decoded.userId;
        } catch (e) {
          console.error('❌ WebSocket token 验证失败:', e.message);
        }
      }

      console.log(`🔌 新客户端连接，会话ID: ${sessionId}, token: ${token ? '已提供' : '未提供'}, userId: ${userId || '未识别'}`);
      console.log(`🔌 完整URL: ${req.url}`);

      // 存储客户端信息
      const clientInfo = {
        ws,
        sessionId,
        userId,
        connectedAt: new Date(),
        lastActivity: new Date(),
        // 会话上下文：当前意图、已选择酒店/房型等
        context: {
          intent: null,
          selectedHotel: null,
          selectedRoom: null,
          pendingDates: null
        }
      };
      
      this.clients.set(sessionId, clientInfo);

      // 发送欢迎消息
      this.sendToClient(ws, {
        type: 'system',
        content: '欢迎使用智能客服！有什么可以帮您？',
        timestamp: new Date().toISOString()
      });

      // 处理消息
      ws.on('message', (data) => {
        this.handleMessage(sessionId, data);
      });

      // 处理关闭
      ws.on('close', (code, reason) => {
        console.log(`🔌 客户端断开连接，会话ID: ${sessionId}, code: ${code}, reason: ${reason}`);
        this.clients.delete(sessionId);
      });

      // 处理错误
      ws.on('error', (error) => {
        console.error(`❌ 客户端错误，会话ID: ${sessionId}:`, error);
      });

      // 发送连接成功确认
      this.sendToClient(ws, {
        type: 'system',
        content: '连接成功',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ 处理连接失败:', error);
      ws.close(1011, 'Internal Server Error');
    }
  }

  /**
   * 处理收到的消息
   */
  async handleMessage(sessionId, data) {
    const client = this.clients.get(sessionId);
    if (!client) return;

    try {
      const message = JSON.parse(data);
      console.log(`📨 收到消息 [${sessionId}]:`, message);

      client.lastActivity = new Date();

      if (message.type === 'message') {
        await this.handleUserMessage(sessionId, message.content);
      } else if (message.type === 'action') {
        await this.handleUserAction(sessionId, message.action, message.data);
      } else if (message.type === 'quick_reply') {
        await this.handleQuickReply(sessionId, message.actionId, message.data || {});
      } else if (message.type === 'user_info') {
        // 前端在连接成功后会发送 user_info，这里补充绑定 userId
        if (message.userId && !client.userId) {
          client.userId = message.userId;
          console.log(`👤 更新 WebSocket 用户ID: ${message.userId} (session: ${sessionId})`);
        }
      }

    } catch (error) {
      console.error('❌ 处理消息失败:', error);
      this.sendToClient(client.ws, {
        type: 'error',
        content: '消息处理失败，请稍后重试',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 处理用户文本消息
   */
  async handleUserMessage(sessionId, content) {
    const client = this.clients.get(sessionId);
    if (!client) return;

    // 发送"正在输入"状态
    this.sendToClient(client.ws, {
      type: 'status',
      status: 'typing',
      timestamp: new Date().toISOString()
    });

    // 模拟思考时间
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 意图分析
    const intent = this.analyzeIntent(content);
    client.context.intent = intent.type;

    switch (intent.type) {
      case 'BOOK_HOTEL':
        await this.replyHotelList(sessionId);
        break;
      case 'CHECK_ORDERS':
        await this.replyUserOrders(sessionId);
        break;
      case 'CANCEL_ORDER':
        await this.replyCancelableOrders(sessionId);
        break;
      case 'RECOMMEND':
        await this.replyHotelRecommendations(sessionId);
        break;
      default:
        this.sendToClient(client.ws, {
          type: 'help',
          content: `收到您的消息："${content}"。我可以帮您 **预订酒店、查看订单、取消订单**。`,
          timestamp: new Date().toISOString(),
          data: {
            features: [
              '输入「预订酒店」或点击下方快捷入口开始预订',
              '输入「我的订单」查看最近订单',
              '输入「取消订单」快速取消未入住订单'
            ]
          }
        });
    }
  }

  /**
   * 处理用户操作
   */
  async handleUserAction(sessionId, action, data) {
    const client = this.clients.get(sessionId);
    if (!client) return;

    console.log(`🖱️ 用户操作 [${sessionId}]: ${action}`, data);

    switch (action) {
      case 'select_hotel':
        await this.handleSelectHotel(sessionId, data);
        break;
      case 'custom_date':
        await this.handleCustomDateBooking(sessionId, data);
        break;
      case 'cancel_order':
        await this.handleCancelOrder(sessionId, data);
        break;
      default:
        this.sendToClient(client.ws, {
          type: 'system',
          content: '操作已收到，正在处理...',
          timestamp: new Date().toISOString()
        });
    }
  }

  /**
   * 处理快捷回复（按钮）
   */
  async handleQuickReply(sessionId, actionId, data) {
    const client = this.clients.get(sessionId);
    if (!client) return;

    console.log(`💬 快捷回复 [${sessionId}]: ${actionId}`, data);

    switch (actionId) {
      case 'book_hotel':
        client.context.intent = 'BOOK_HOTEL';
        this.sendToClient(client.ws, {
          type: 'system',
          content: '好的，我们来预订酒店～',
          timestamp: new Date().toISOString()
        });
        await this.replyHotelList(sessionId);
        break;
      case 'check_orders':
        client.context.intent = 'CHECK_ORDERS';
        await this.replyUserOrders(sessionId);
        break;
      case 'cancel_order':
        client.context.intent = 'CANCEL_ORDER';
        await this.replyCancelableOrders(sessionId);
        break;
      default:
        this.sendToClient(client.ws, {
          type: 'system',
          content: '暂不支持该快捷操作',
          timestamp: new Date().toISOString()
        });
    }
  }

  /**
   * 从数据库获取酒店列表并回复
   */
  async replyHotelList(sessionId) {
    const client = this.clients.get(sessionId);
    if (!client) return;

    try {
      const hotels = await Hotel.findAll({
        where: {
          review_status: 'approved',
          publish_status: 'published'
        },
        attributes: ['id', 'name', 'address', 'star', 'price', 'images'],
        limit: 5,
        order: [['price', 'ASC']]
      });

      if (!hotels || hotels.length === 0) {
        this.sendToClient(client.ws, {
          type: 'no_hotels',
          content: '当前暂无可预订酒店，请稍后再试。',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const hotelList = hotels.map((h, index) => {
        const data = h.toJSON();
        return {
          index: index + 1,
          id: data.id,
          name: data.name,
          price: parseFloat(data.price),
          star: data.star,
          address: data.address
        };
      });

      this.sendToClient(client.ws, {
        type: 'hotel_list',
        content: '为您找到以下热门酒店，请选择其一继续预订：',
        timestamp: new Date().toISOString(),
        data: {
          hotels: hotelList
        },
        actions: hotelList.map(h => ({
          id: 'select_hotel',
          title: `${h.index}. ${h.name}`,
          type: 'hotel_option',
          data: {
            hotelId: h.id
          }
        }))
      });
    } catch (error) {
      console.error('❌ 获取酒店列表失败(聊天):', error);
      this.sendToClient(client.ws, {
        type: 'error',
        content: '获取酒店列表失败，请稍后重试',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 用户选择酒店后，提示选择日期
   */
  async handleSelectHotel(sessionId, data) {
    const client = this.clients.get(sessionId);
    if (!client) return;

    const hotelId = data?.hotelId;
    if (!hotelId) {
      this.sendToClient(client.ws, {
        type: 'error',
        content: '未获取到酒店信息，请重试选择酒店',
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      const hotel = await Hotel.findOne({
        where: {
          id: hotelId,
          review_status: 'approved',
          publish_status: 'published'
        },
        attributes: ['id', 'name', 'address', 'star', 'price', 'images', 'discount', 'discount_description']
      });

      if (!hotel) {
        this.sendToClient(client.ws, {
          type: 'error',
          content: '该酒店已下架或不存在，请重新选择',
          timestamp: new Date().toISOString()
        });
        return;
      }

      client.context.selectedHotel = hotel.toJSON();

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
      const dayAfterTomorrow = new Date(now.getTime() + 86400000 * 2).toISOString().split('T')[0];

      this.sendToClient(client.ws, {
        type: 'date_picker',
        content: `已为您选择「${client.context.selectedHotel.name}」，请选择入住和离店日期：`,
        timestamp: new Date().toISOString(),
        actions: [
          {
            id: 'date_option_today',
            title: `今天(${today}) - 明天(${tomorrow})`,
            type: 'button',
            data: { checkIn: today, checkOut: tomorrow }
          },
          {
            id: 'date_option_tomorrow',
            title: `明天(${tomorrow}) - 后天(${dayAfterTomorrow})`,
            type: 'button',
            data: { checkIn: tomorrow, checkOut: dayAfterTomorrow }
          },
          {
            id: 'custom_date',
            title: '自定义日期',
            type: 'date_picker'
          }
        ]
      });
    } catch (error) {
      console.error('❌ 处理选择酒店失败:', error);
      this.sendToClient(client.ws, {
        type: 'error',
        content: '处理酒店选择失败，请稍后重试',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 自定义日期选择后，创建真实订单
   */
  async handleCustomDateBooking(sessionId, data) {
    const client = this.clients.get(sessionId);
    if (!client) return;

    if (!client.userId) {
      this.sendToClient(client.ws, {
        type: 'error',
        content: '请先登录后再通过客服预订酒店。',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const hotel = client.context.selectedHotel;
    if (!hotel) {
      this.sendToClient(client.ws, {
        type: 'error',
        content: '尚未选择酒店，请先选择酒店。',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const checkIn = data?.checkIn;
    const checkOut = data?.checkOut;

    if (!checkIn || !checkOut) {
      this.sendToClient(client.ws, {
        type: 'error',
        content: '请选择完整的入住和离店日期。',
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      const diff = (checkOutDate - checkInDate) / 86400000;
      const nights = Number.isNaN(diff) || diff <= 0 ? 1 : diff;

      const mobileUser = await MobileUser.findOne({ where: { user_id: client.userId } });

      if (!mobileUser || !mobileUser.phone) {
        this.sendToClient(client.ws, {
          type: 'error',
          content: '您的手机号信息不完整，请先在个人中心完善资料后再通过客服预订。',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const basePrice = parseFloat(hotel.price);
      const memberDiscount = mobileUser ? PriceCalculator.getMemberDiscount(mobileUser.member_level) : 1;

      const priceCalculation = PriceCalculator.calculateTotalPrice(basePrice, {
        nights,
        rooms: 1,
        discount: hotel.discount ? parseFloat(hotel.discount) : null,
        memberDiscount: memberDiscount < 1 ? memberDiscount : null
      });

      const order = await Order.create({
        user_id: client.userId,
        hotel_id: hotel.id,
        room_info: {
          name: '标准房',
          price: basePrice,
          booked_price: basePrice
        },
        check_in_date: checkIn,
        check_out_date: checkOut,
        nights,
        rooms_count: 1,
        adults: 2,
        children: 0,
        room_price: basePrice,
        total_price: priceCalculation.originalTotal,
        discount_amount: priceCalculation.totalDiscount,
        actual_payment: priceCalculation.finalTotal,
        contact_name: mobileUser.nickname || `用户${client.userId}`,
        contact_phone: mobileUser.phone,
        special_requests: null,
        order_status: '待支付'
      });

      this.sendToClient(client.ws, {
        type: 'booking_success',
        content: '预订成功！请在订单详情中完成支付。',
        timestamp: new Date().toISOString(),
        data: {
          orderId: order.id,
          hotel: hotel.name,
          totalPrice: order.actual_payment
        }
      });
    } catch (error) {
      console.error('❌ 通过聊天创建订单失败:', error);
      this.sendToClient(client.ws, {
        type: 'error',
        content: '创建订单失败，请稍后在酒店详情页尝试预订。',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 回复用户订单列表（查看订单）
   */
  async replyUserOrders(sessionId) {
    const client = this.clients.get(sessionId);
    if (!client) return;

    if (!client.userId) {
      this.sendToClient(client.ws, {
        type: 'error',
        content: '请先登录后再查看订单。',
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      const orders = await Order.findAll({
        where: { user_id: client.userId },
        include: [
          {
            model: Hotel,
            as: 'hotel',
            attributes: ['id', 'name', 'address']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: 5
      });

      if (!orders || orders.length === 0) {
        this.sendToClient(client.ws, {
          type: 'order_list',
          content: '您当前还没有任何订单。',
          timestamp: new Date().toISOString(),
          data: { orders: [] }
        });
        return;
      }

      const list = orders.map((order, index) => {
        const statusInfo = this.mapOrderStatusInfo(order.order_status);
        return {
          index: index + 1,
          id: order.id,
          hotelName: order.hotel?.name || '未知酒店',
          checkIn: order.check_in_date,
          checkOut: order.check_out_date,
          totalPrice: order.actual_payment,
          status: order.order_status,
          statusInfo
        };
      });

      this.sendToClient(client.ws, {
        type: 'order_list',
        content: '这是您最近的订单：',
        timestamp: new Date().toISOString(),
        data: { orders: list }
      });
    } catch (error) {
      console.error('❌ 获取订单列表失败(聊天):', error);
      this.sendToClient(client.ws, {
        type: 'error',
        content: '获取订单列表失败，请稍后重试。',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 回复用户可取消的订单列表
   */
  async replyCancelableOrders(sessionId) {
    const client = this.clients.get(sessionId);
    if (!client) return;

    if (!client.userId) {
      this.sendToClient(client.ws, {
        type: 'error',
        content: '请先登录后再取消订单。',
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      const orders = await Order.findAll({
        where: {
          user_id: client.userId,
          order_status: { [Op.in]: ['待支付', '已支付'] }
        },
        include: [
          {
            model: Hotel,
            as: 'hotel',
            attributes: ['id', 'name', 'address']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: 5
      });

      if (!orders || orders.length === 0) {
        this.sendToClient(client.ws, {
          type: 'order_list',
          content: '当前没有可取消的订单。',
          timestamp: new Date().toISOString(),
          data: { orders: [] }
        });
        return;
      }

      const list = orders.map((order, index) => {
        const statusInfo = this.mapOrderStatusInfo(order.order_status);
        return {
          index: index + 1,
          id: order.id,
          hotelName: order.hotel?.name || '未知酒店',
          checkIn: order.check_in_date,
          checkOut: order.check_out_date,
          totalPrice: order.actual_payment,
          status: order.order_status,
          statusInfo
        };
      });

      this.sendToClient(client.ws, {
        type: 'order_list',
        content: '以下订单支持取消，请选择要取消的订单：',
        timestamp: new Date().toISOString(),
        data: { orders: list },
        actions: list.map(order => ({
          id: 'cancel_order',
          title: `取消订单 ${order.index}`,
          type: 'danger_button',
          data: { orderId: order.id }
        }))
      });
    } catch (error) {
      console.error('❌ 获取可取消订单失败(聊天):', error);
      this.sendToClient(client.ws, {
        type: 'error',
        content: '获取可取消订单失败，请稍后重试。',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 取消指定订单
   */
  async handleCancelOrder(sessionId, data) {
    const client = this.clients.get(sessionId);
    if (!client) return;

    if (!client.userId) {
      this.sendToClient(client.ws, {
        type: 'error',
        content: '请先登录后再取消订单。',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const orderId = data?.orderId;
    if (!orderId) {
      this.sendToClient(client.ws, {
        type: 'error',
        content: '未获取到订单信息，请重新选择要取消的订单。',
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      const order = await Order.findOne({
        where: {
          id: orderId,
          user_id: client.userId
        }
      });

      if (!order) {
        this.sendToClient(client.ws, {
          type: 'error',
          content: '订单不存在。',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!['待支付', '已支付'].includes(order.order_status)) {
        this.sendToClient(client.ws, {
          type: 'error',
          content: '当前订单状态不可取消。',
          timestamp: new Date().toISOString()
        });
        return;
      }

      await order.update({
        order_status: '已取消',
        cancel_reason: '用户通过智能客服取消',
        cancel_time: new Date()
      });

      this.sendToClient(client.ws, {
        type: 'cancel_success',
        content: `订单已成功取消（订单号：${order.order_no}）。`,
        timestamp: new Date().toISOString(),
        data: {
          orderId: order.id,
          orderNo: order.order_no
        }
      });
    } catch (error) {
      console.error('❌ 取消订单失败(聊天):', error);
      this.sendToClient(client.ws, {
        type: 'error',
        content: '取消订单失败，请稍后在订单详情页尝试操作。',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 推荐酒店（简单复用列表逻辑）
   */
  async replyHotelRecommendations(sessionId) {
    await this.replyHotelList(sessionId);
  }

  /**
   * 将订单状态映射为前端展示用的颜色/文案
   */
  mapOrderStatusInfo(status) {
    const map = {
      '待支付': { text: '待支付', color: '#FF9500' },
      '已支付': { text: '待入住', color: '#007AFF' },
      '已确认': { text: '待入住', color: '#007AFF' },
      '入住中': { text: '入住中', color: '#4CD964' },
      '已完成': { text: '已完成', color: '#4CD964' },
      '已取消': { text: '已取消', color: '#999999' },
      '已退款': { text: '已退款', color: '#999999' }
    };
    return map[status] || { text: status, color: '#999999' };
  }

  /**
   * 意图分析
   */
  analyzeIntent(text) {
    text = text.toLowerCase();
    
    if (text.includes('订酒店') || text.includes('预订') || text.includes('订房')) {
      return { type: 'BOOK_HOTEL', confidence: 0.9 };
    }
    if (text.includes('订单') || text.includes('查订单')) {
      return { type: 'CHECK_ORDERS', confidence: 0.8 };
    }
    if (text.includes('取消') || text.includes('退订')) {
      return { type: 'CANCEL_ORDER', confidence: 0.7 };
    }
    if (text.includes('推荐') || text.includes('有什么酒店')) {
      return { type: 'RECOMMEND', confidence: 0.8 };
    }
    
    return { type: 'UNKNOWN', confidence: 0 };
  }

  /**
   * 发送消息给指定客户端
   */
  sendToClient(ws, data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(data));
      } catch (error) {
        console.error('❌ 发送消息失败:', error);
      }
    }
  }

  /**
   * 获取在线人数
   */
  getOnlineCount() {
    return this.clients.size;
  }

  /**
   * 广播消息给所有客户端
   */
  broadcast(data, excludeSessionId = null) {
    const message = JSON.stringify(data);
    this.clients.forEach((client, sessionId) => {
      if (sessionId !== excludeSessionId && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(message);
        } catch (error) {
          console.error(`❌ 广播消息给 ${sessionId} 失败:`, error);
        }
      }
    });
  }
}

module.exports = ChatSocket;