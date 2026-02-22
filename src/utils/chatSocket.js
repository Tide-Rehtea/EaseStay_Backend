/**
 * WebSocket 聊天工具
 */

const WebSocket = require('ws');
const http = require('http');

class ChatSocket {
  constructor(server) {
    this.wss = null;
    this.clients = new Map(); // sessionId -> { ws, userId, sessionId }
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

      console.log(`🔌 新客户端连接，会话ID: ${sessionId}, token: ${token ? '已提供' : '未提供'}`);
      console.log(`🔌 完整URL: ${req.url}`);

      // 存储客户端信息
      const clientInfo = {
        ws,
        sessionId,
        userId: token || null,
        connectedAt: new Date(),
        lastActivity: new Date()
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
    
    let reply;

    switch(intent.type) {
      case 'BOOK_HOTEL':
        const hotels = [
          { id: 1, name: '上海外滩华尔道夫酒店', price: 1899 },
          { id: 2, name: '上海迪士尼乐园酒店', price: 1599 },
          { id: 3, name: '上海浦东丽思卡尔顿酒店', price: 2199 }
        ];
        
        reply = {
          type: 'message',
          content: `为您找到 ${hotels.length} 家酒店，请选择：`,
          intent: 'book_hotel',
          data: { hotels },
          timestamp: new Date().toISOString()
        };
        break;

      case 'CHECK_ORDERS':
        reply = {
          type: 'message',
          content: '您有 3 个订单，需要查看详情吗？',
          intent: 'show_orders',
          data: { orderCount: 3 },
          timestamp: new Date().toISOString()
        };
        break;

      case 'CANCEL_ORDER':
        reply = {
          type: 'message',
          content: '请提供您要取消的订单号',
          intent: 'awaiting_order_id',
          timestamp: new Date().toISOString()
        };
        break;

      case 'RECOMMEND':
        reply = {
          type: 'message',
          content: '为您推荐热门酒店：上海外滩华尔道夫酒店、上海迪士尼乐园酒店',
          timestamp: new Date().toISOString()
        };
        break;

      default:
        reply = {
          type: 'message',
          content: `收到您的消息："${content}"。我是智能客服小易，可以帮您预订酒店、查询订单等。`,
          timestamp: new Date().toISOString()
        };
    }

    this.sendToClient(client.ws, reply);
  }

  /**
   * 处理用户操作
   */
  async handleUserAction(sessionId, action, data) {
    const client = this.clients.get(sessionId);
    if (!client) return;

    console.log(`🖱️ 用户操作 [${sessionId}]: ${action}`, data);

    switch(action) {
      case 'select_hotel':
        const hotelId = data.hotelId;
        
        this.sendToClient(client.ws, {
          type: 'message',
          content: `您已选择酒店 ID: ${hotelId}，正在为您预订...`,
          timestamp: new Date().toISOString()
        });

        setTimeout(() => {
          this.sendToClient(client.ws, {
            type: 'message',
            content: '预订成功！订单号：ORD' + Date.now(),
            timestamp: new Date().toISOString()
          });
        }, 1500);
        break;

      default:
        this.sendToClient(client.ws, {
          type: 'message',
          content: '操作已收到，正在处理...',
          timestamp: new Date().toISOString()
        });
    }
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