const { Banner, Hotel } = require('../../models/mobile');
const ResponseUtil = require('../../utils/response');
const { Op } = require('sequelize');

/**
 * 广告位控制器
 * 管理首页Banner广告
 */
class BannerController {
  /**
   * 获取活跃的Banner列表
   * GET /api/mobile/banners
   * 需求：顶部Banner轮播广告，从后端获取
   */
  static async getActiveBanners(req, res) {
    try {
      const now = new Date();

      // 查询所有生效中的广告
      const banners = await Banner.findAll({
        where: {
          status: 'active',
          [Op.or]: [
            {
              start_time: {
                [Op.or]: [
                  { [Op.lte]: now },
                  { [Op.is]: null }
                ]
              }
            },
            {
              end_time: {
                [Op.or]: [
                  { [Op.gte]: now },
                  { [Op.is]: null }
                ]
              }
            }
          ]
        },
        order: [['sort_order', 'ASC']],
        limit: 10
      });

      // 处理返回数据
      const bannerList = await Promise.all(banners.map(async banner => {
        const result = {
          id: banner.id,
          title: banner.title,
          image_url: banner.image_url,
          link_type: banner.link_type,
          link_target: banner.link_target
        };

        // 如果跳转类型是酒店，获取酒店信息
        if (banner.link_type === 'hotel') {
          const hotel = await Hotel.findByPk(banner.link_target, {
            attributes: ['id', 'name', 'star', 'price', 'images']
          });
          if (hotel) {
            result.hotel = hotel;
          }
        }

        return result;
      }));

      return ResponseUtil.success(res, bannerList, '获取Banner成功');

    } catch (error) {
      console.error('获取Banner错误:', error);
      return ResponseUtil.error(res, '获取Banner失败', 500);
    }
  }

  /**
   * 管理员：创建Banner
   * POST /api/admin/banners
   */
  static async create(req, res) {
    try {
      const { title, image_url, link_type, link_target, sort_order, status, start_time, end_time } = req.body;

      if (!title || !image_url || !link_type || !link_target) {
        return ResponseUtil.error(res, '缺少必填字段', 400);
      }

      const banner = await Banner.create({
        title,
        image_url,
        link_type,
        link_target,
        sort_order: sort_order || 0,
        status: status || 'active',
        start_time,
        end_time
      });

      return ResponseUtil.created(res, banner, 'Banner创建成功');

    } catch (error) {
      console.error('创建Banner错误:', error);
      return ResponseUtil.error(res, '创建Banner失败', 500);
    }
  }

  /**
   * 管理员：更新Banner
   * PUT /api/admin/banners/:id
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const banner = await Banner.findByPk(id);

      if (!banner) {
        return ResponseUtil.notFound(res, 'Banner不存在');
      }

      await banner.update(req.body);

      return ResponseUtil.success(res, banner, 'Banner更新成功');

    } catch (error) {
      console.error('更新Banner错误:', error);
      return ResponseUtil.error(res, '更新Banner失败', 500);
    }
  }

  /**
   * 管理员：删除Banner
   * DELETE /api/admin/banners/:id
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const banner = await Banner.findByPk(id);

      if (!banner) {
        return ResponseUtil.notFound(res, 'Banner不存在');
      }

      await banner.destroy();

      return ResponseUtil.success(res, null, 'Banner删除成功');

    } catch (error) {
      console.error('删除Banner错误:', error);
      return ResponseUtil.error(res, '删除Banner失败', 500);
    }
  }
}

module.exports = BannerController;