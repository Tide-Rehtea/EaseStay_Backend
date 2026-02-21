const ResponseUtil = require('../../utils/response');

/**
 * 聊天机器人控制器（占位）
 * 后续可集成第三方AI客服
 */
class ChatController {
  /**
   * 发送消息（占位）
   * POST /api/mobile/chat/message
   */
  static async sendMessage(req, res) {
    try {
      const { message, session_id } = req.body;

      // 简单的自动回复逻辑（占位用）
      const responses = [
        '您好，我是智能客服小易，请问有什么可以帮您？',
        '您想查询酒店信息吗？请告诉我您的需求。',
        '如需帮助，请拨打客服热线 400-123-4567。',
        '预订酒店请点击首页搜索框，输入目的地和日期。',
        '取消订单请在"我的订单"中操作。',
        '会员等级和积分可以在个人中心查看。'
      ];

      const randomResponse = responses[Math.floor(Math.random() * responses.length)];

      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 500));

      return ResponseUtil.success(res, {
        session_id: session_id || `chat_${Date.now()}`,
        message: randomResponse,
        timestamp: new Date().toISOString(),
        type: 'text'
      }, '发送成功');

    } catch (error) {
      console.error('聊天机器人错误:', error);
      return ResponseUtil.error(res, '消息发送失败', 500);
    }
  }

  /**
   * 获取会话历史（占位）
   * GET /api/mobile/chat/history
   */
  static async getHistory(req, res) {
    try {
      const { session_id, page, pageSize } = req.query;

      // 返回空历史记录（占位）
      return ResponseUtil.paginate(res, [], {
        page: parseInt(page) || 1,
        pageSize: parseInt(pageSize) || 20,
        total: 0
      });

    } catch (error) {
      console.error('获取聊天历史错误:', error);
      return ResponseUtil.error(res, '获取历史记录失败', 500);
    }
  }

  /**
   * 获取常见问题（占位）
   * GET /api/mobile/chat/faq
   */
  static async getFaq(req, res) {
    try {
      const faqList = [
        {
          id: 1,
          question: '如何预订酒店？',
          answer: '打开首页，选择目的地、入住日期和离店日期，点击搜索按钮，在列表页选择合适的酒店，进入详情页选择房型后点击立即预订即可。'
        },
        {
          id: 2,
          question: '如何取消订单？',
          answer: '进入"我的订单"，找到需要取消的订单，点击订单详情，在页面底部点击"取消订单"按钮即可。部分订单可能有取消政策，请以订单页提示为准。'
        },
        {
          id: 3,
          question: '会员等级如何提升？',
          answer: '会员等级根据消费金额累计积分自动提升。消费越多，积分越多，等级越高，享受的折扣和权益也越多。'
        },
        {
          id: 4,
          question: '如何联系客服？',
          answer: '您可以通过在线客服、客服热线 400-123-4567 或发送邮件至 service@easestay.com 联系我们。'
        },
        {
          id: 5,
          question: '支持哪些支付方式？',
          answer: '我们支持微信支付、支付宝、银联在线支付等多种支付方式。'
        }
      ];

      return ResponseUtil.success(res, faqList);

    } catch (error) {
      console.error('获取FAQ错误:', error);
      return ResponseUtil.error(res, '获取常见问题失败', 500);
    }
  }
}

module.exports = ChatController;