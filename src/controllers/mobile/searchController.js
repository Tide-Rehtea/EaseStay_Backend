const { Op } = require('sequelize');
const { Hotel } = require('../../models');
const { SearchHistory } = require('../../models/mobile');
const ResponseUtil = require('../../utils/response');
const Validator = require('../../utils/validator');

/**
 * 搜索控制器
 * 处理酒店搜索、搜索历史等功能
 */
class SearchController {
  /**
   * 搜索酒店
   * GET /api/mobile/search/hotels
   * 需求：关键字搜索（支持酒店名、地址模糊搜索）
   */
  static async searchHotels(req, res) {
    try {
      const { keyword, city, page, pageSize } = req.query;
      const pagination = Validator.validatePagination(page, pageSize);

      if (!keyword) {
        return ResponseUtil.error(res, '请输入搜索关键词', 400);
      }

      // 构建查询条件
      const where = {
        review_status: 'approved',
        publish_status: 'published'
      };

      // 城市筛选
      if (city) {
        where.address = {
          [Op.like]: `%${city}%`
        };
      }

      // 关键词搜索（酒店名或地址）
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { name_en: { [Op.like]: `%${keyword}%` } },
        { address: { [Op.like]: `%${keyword}%` } }
      ];

      // 查询总数
      const total = await Hotel.count({ where });

      // 查询数据
      const hotels = await Hotel.findAll({
        where,
        attributes: [
          'id', 'name', 'name_en', 'address', 'star', 
          'price', 'images', 'tags', 'facilities'
        ],
        order: [['price', 'ASC']],
        limit: pagination.pageSize,
        offset: (pagination.page - 1) * pagination.pageSize
      });

      // 如果用户已登录，保存搜索历史
      if (req.user && hotels.length > 0) {
        await SearchHistory.create({
          user_id: req.user.id,
          keyword
        });

        // 只保留最近20条
        const historyCount = await SearchHistory.count({
          where: { user_id: req.user.id }
        });
        
        if (historyCount > 20) {
          const oldest = await SearchHistory.findOne({
            where: { user_id: req.user.id },
            order: [['search_time', 'ASC']]
          });
          if (oldest) {
            await oldest.destroy();
          }
        }
      }

      return ResponseUtil.paginate(res, hotels, {
        ...pagination,
        total
      }, '搜索成功');

    } catch (error) {
      console.error('搜索酒店错误:', error);
      return ResponseUtil.error(res, '搜索失败', 500);
    }
  }

  /**
   * 获取搜索历史
   * GET /api/mobile/search/history
   * 需求：本地保存最近5条搜索记录
   */
  static async getSearchHistory(req, res) {
    try {
      if (!req.user) {
        return ResponseUtil.success(res, []); // 未登录返回空
      }

      const history = await SearchHistory.findAll({
        where: { user_id: req.user.id },
        order: [['search_time', 'DESC']],
        limit: 20,
        attributes: ['keyword', 'search_time']
      });

      return ResponseUtil.success(res, history);

    } catch (error) {
      console.error('获取搜索历史错误:', error);
      return ResponseUtil.error(res, '获取搜索历史失败', 500);
    }
  }

  /**
   * 清空搜索历史
   * DELETE /api/mobile/search/history
   * 需求：支持清空搜索记录
   */
  static async clearSearchHistory(req, res) {
    try {
      if (!req.user) {
        return ResponseUtil.unauthorized(res);
      }

      await SearchHistory.destroy({
        where: { user_id: req.user.id }
      });

      return ResponseUtil.success(res, null, '搜索历史已清空');

    } catch (error) {
      console.error('清空搜索历史错误:', error);
      return ResponseUtil.error(res, '清空搜索历史失败', 500);
    }
  }

  /**
   * 删除单条搜索历史
   * DELETE /api/mobile/search/history/:keyword
   */
  static async deleteSearchHistory(req, res) {
    try {
      const { keyword } = req.params;

      if (!req.user) {
        return ResponseUtil.unauthorized(res);
      }

      await SearchHistory.destroy({
        where: {
          user_id: req.user.id,
          keyword
        }
      });

      return ResponseUtil.success(res, null, '删除成功');

    } catch (error) {
      console.error('删除搜索历史错误:', error);
      return ResponseUtil.error(res, '删除失败', 500);
    }
  }

  /**
   * 获取热门搜索
   * GET /api/mobile/search/hot
   * 需求：展示热门目的地/酒店标签
   */
  static async getHotSearches(req, res) {
    try {
      // 从搜索历史中统计热门关键词
      const hotKeywords = await SearchHistory.findAll({
        attributes: [
          'keyword',
          [Sequelize.fn('COUNT', Sequelize.col('keyword')), 'count']
        ],
        group: ['keyword'],
        order: [[Sequelize.literal('count'), 'DESC']],
        limit: 10
      });

      // 如果没有搜索历史，返回默认热门关键词
      if (hotKeywords.length === 0) {
        const defaultHot = [
          { keyword: '上海迪士尼', count: 0 },
          { keyword: '北京环球影城', count: 0 },
          { keyword: '三亚', count: 0 },
          { keyword: '杭州西湖', count: 0 },
          { keyword: '厦门', count: 0 },
          { keyword: '成都', count: 0 },
          { keyword: '亲子酒店', count: 0 },
          { keyword: '海景房', count: 0 }
        ];
        return ResponseUtil.success(res, defaultHot);
      }

      return ResponseUtil.success(res, hotKeywords);

    } catch (error) {
      console.error('获取热门搜索错误:', error);
      return ResponseUtil.error(res, '获取热门搜索失败', 500);
    }
  }
}

module.exports = SearchController;