const { Op } = require('sequelize');
const { Hotel } = require('../../models');
const { Favorite, BrowseHistory } = require('../../models/mobile');
const ResponseUtil = require('../../utils/response');
const Validator = require('../../utils/validator');
const PriceCalculator = require('../../utils/priceCalculator');

/**
 * 酒店查询控制器
 * 处理酒店列表、详情、筛选等功能
 */
class MobileHotelController {
  /**
   * 获取酒店列表
   * GET /api/mobile/hotels
   * 需求：酒店列表页，支持筛选、排序、分页
   */
  static async getHotelList(req, res) {
    try {
      const {
        city,
        checkIn,
        checkOut,
        keyword,
        stars,
        minPrice,
        maxPrice,
        facilities,
        tags,
        sortBy = 'price_asc',
        page,
        pageSize
      } = req.query;

      const pagination = Validator.validatePagination(page, pageSize);

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

      // 关键词搜索
      if (keyword) {
        where[Op.or] = [
          { name: { [Op.like]: `%${keyword}%` } },
          { address: { [Op.like]: `%${keyword}%` } }
        ];
      }

      // 星级筛选
      if (stars) {
        const starArray = stars.split(',').map(s => parseInt(s));
        where.star = { [Op.in]: starArray };
      }

      // 价格区间筛选
      if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
        if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
      }

      // 设施筛选
      if (facilities) {
        const facilityArray = facilities.split(',');
        where.facilities = {
          [Op.overlap]: facilityArray
        };
      }

      // 标签筛选
      if (tags) {
        const tagArray = tags.split(',');
        where.tags = {
          [Op.overlap]: tagArray
        };
      }

      // 排序
      let order = [];
      switch (sortBy) {
        case 'price_asc':
          order = [['price', 'ASC']];
          break;
        case 'price_desc':
          order = [['price', 'DESC']];
          break;
        case 'star_desc':
          order = [['star', 'DESC'], ['price', 'ASC']];
          break;
        case 'star_asc':
          order = [['star', 'ASC'], ['price', 'ASC']];
          break;
        default:
          order = [['price', 'ASC']];
      }

      // 查询总数
      const total = await Hotel.count({ where });

      // 查询数据
      const hotels = await Hotel.findAll({
        where,
        attributes: [
          'id', 'name', 'name_en', 'address', 'star', 
          'price', 'images', 'tags', 'facilities', 'discount'
        ],
        order,
        limit: pagination.pageSize,
        offset: (pagination.page - 1) * pagination.pageSize
      });

      // 处理返回数据，计算实际价格（考虑折扣）
      let hotelList = hotels.map(hotel => {
        const hotelData = hotel.toJSON();
        
        // 计算折扣后价格
        if (hotel.discount) {
          hotelData.original_price = hotelData.price;
          hotelData.price = hotelData.price * hotel.discount;
          hotelData.discount_desc = hotel.discount_description || `${Math.round((1 - hotel.discount) * 100)}% Off`;
        }

        return hotelData;
      });

      // 如果用户已登录，检查收藏状态
      if (req.user) {
        const favoriteHotels = await Favorite.findAll({
          where: {
            user_id: req.user.id,
            hotel_id: hotels.map(h => h.id)
          }
        });

        const favoriteMap = {};
        favoriteHotels.forEach(f => {
          favoriteMap[f.hotel_id] = true;
        });

        hotelList = hotelList.map(hotel => ({
          ...hotel,
          is_favorite: !!favoriteMap[hotel.id]
        }));
      }

      return ResponseUtil.paginate(res, hotelList, {
        ...pagination,
        total
      }, '获取酒店列表成功');

    } catch (error) {
      console.error('获取酒店列表错误:', error);
      return ResponseUtil.error(res, '获取酒店列表失败', 500);
    }
  }

  /**
   * 获取酒店详情
   * GET /api/mobile/hotels/:id
   * 需求：酒店详情页，包含基础信息、房型价格等
   */
  static async getHotelDetail(req, res) {
    try {
      const { id } = req.params;
      const { checkIn, checkOut } = req.query;

      // 查询酒店
      const hotel = await Hotel.findByPk(id, {
        where: {
          review_status: 'approved',
          publish_status: 'published'
        }
      });

      if (!hotel) {
        return ResponseUtil.notFound(res, '酒店不存在');
      }

      // 记录浏览历史（如果用户已登录）
      if (req.user) {
        await BrowseHistory.create({
          user_id: req.user.id,
          hotel_id: id
        });

        // 只保留最近30条
        const historyCount = await BrowseHistory.count({
          where: { user_id: req.user.id }
        });
        
        if (historyCount > 30) {
          const oldest = await BrowseHistory.findOne({
            where: { user_id: req.user.id },
            order: [['browse_time', 'ASC']]
          });
          if (oldest) {
            await oldest.destroy();
          }
        }
      }

      // 处理酒店数据
      const hotelData = hotel.toJSON();

      // 处理图片
      if (hotelData.images && Array.isArray(hotelData.images)) {
        hotelData.banner_images = hotelData.images;
      } else {
        hotelData.banner_images = ['/uploads/default-hotel.jpg'];
      }

      // 处理房型数据
      let roomTypes = [];
      if (hotelData.room_type && Array.isArray(hotelData.room_type)) {
        roomTypes = hotelData.room_type.map(room => ({
          ...room,
          // 如果有折扣，计算折扣后价格
          original_price: room.price,
          price: room.discount ? room.price * room.discount : room.price,
          discount_desc: room.discount ? `${Math.round((1 - room.discount) * 100)}% Off` : null
        }));
      } else {
        // 默认房型
        roomTypes = [
          {
            id: 1,
            name: '标准大床房',
            area: '25m²',
            bed_type: '大床1.8m',
            price: hotelData.price,
            original_price: hotelData.price,
            breakfast: '含双早',
            wifi: true,
            window: true,
            available: 5
          },
          {
            id: 2,
            name: '标准双床房',
            area: '30m²',
            bed_type: '双床1.2m',
            price: hotelData.price * 1.1,
            original_price: hotelData.price * 1.1,
            breakfast: '含双早',
            wifi: true,
            window: true,
            available: 3
          }
        ];
      }

      // 房型按价格从低到高排序
      roomTypes.sort((a, b) => a.price - b.price);

      // 计算价格区间
      const minPrice = Math.min(...roomTypes.map(r => r.price));
      const maxPrice = Math.max(...roomTypes.map(r => r.price));

      // 解析附近景点
      let nearbyAttractions = [];
      if (hotelData.nearby_attractions) {
        try {
          nearbyAttractions = JSON.parse(hotelData.nearby_attractions);
        } catch {
          nearbyAttractions = [
            { name: hotelData.nearby_attractions, distance: '1.5km' }
          ];
        }
      }

      // 检查收藏状态
      let isFavorite = false;
      if (req.user) {
        const favorite = await Favorite.findOne({
          where: {
            user_id: req.user.id,
            hotel_id: id
          }
        });
        isFavorite = !!favorite;
      }

      // 计算入住日期相关价格
      let priceCalculation = null;
      if (checkIn && checkOut) {
        const dateValidation = Validator.validateDateRange(checkIn, checkOut);
        if (dateValidation.valid) {
          const memberDiscount = req.user?.mobileProfile ? 
            PriceCalculator.getMemberDiscount(req.user.mobileProfile.member_level) : 1;

          priceCalculation = {
            checkIn,
            checkOut,
            nights: dateValidation.nights,
            rooms: 1,
            basePrice: parseFloat(hotelData.price),
            ...PriceCalculator.calculateTotalPrice(parseFloat(hotelData.price), {
              nights: dateValidation.nights,
              discount: hotelData.discount ? parseFloat(hotelData.discount) : null,
              memberDiscount: memberDiscount < 1 ? memberDiscount : null
            })
          };
        }
      }

      return ResponseUtil.success(res, {
        ...hotelData,
        banner_images: hotelData.banner_images,
        room_types: roomTypes,
        min_price: minPrice,
        max_price: maxPrice,
        nearby_attractions: nearbyAttractions,
        is_favorite: isFavorite,
        price_calculation: priceCalculation,
        facilities_list: hotelData.facilities || [
          '免费WiFi', '停车场', '餐厅', '健身房', '游泳池', '会议室'
        ],
        tags_list: hotelData.tags || [
          '亲子优选', '商务出行', '情侣度假'
        ]
      }, '获取酒店详情成功');

    } catch (error) {
      console.error('获取酒店详情错误:', error);
      return ResponseUtil.error(res, '获取酒店详情失败', 500);
    }
  }

  /**
   * 获取筛选条件
   * GET /api/mobile/hotels/filters
   * 需求：获取可用的筛选条件（星级、价格区间、设施等）
   */
  static async getFilters(req, res) {
    try {
      const { city } = req.query;

      const where = {
        review_status: 'approved',
        publish_status: 'published'
      };

      if (city) {
        where.address = { [Op.like]: `%${city}%` };
      }

      // 获取所有酒店
      const hotels = await Hotel.findAll({
        where,
        attributes: ['star', 'price', 'facilities', 'tags']
      });

      // 统计星级分布
      const starCounts = {};
      // 统计价格区间
      let minPrice = Infinity;
      let maxPrice = 0;
      // 统计设施
      const facilitiesSet = new Set();
      const tagsSet = new Set();

      hotels.forEach(hotel => {
        // 星级
        starCounts[hotel.star] = (starCounts[hotel.star] || 0) + 1;

        // 价格
        minPrice = Math.min(minPrice, parseFloat(hotel.price));
        maxPrice = Math.max(maxPrice, parseFloat(hotel.price));

        // 设施
        if (hotel.facilities && Array.isArray(hotel.facilities)) {
          hotel.facilities.forEach(f => facilitiesSet.add(f));
        }

        // 标签
        if (hotel.tags && Array.isArray(hotel.tags)) {
          hotel.tags.forEach(t => tagsSet.add(t));
        }
      });

      // 价格区间
      const priceRanges = [
        { min: 0, max: 300, label: '0-300元' },
        { min: 300, max: 500, label: '300-500元' },
        { min: 500, max: 800, label: '500-800元' },
        { min: 800, max: 1200, label: '800-1200元' },
        { min: 1200, max: 2000, label: '1200-2000元' },
        { min: 2000, max: 99999, label: '2000元以上' }
      ];

      // 常见设施
      const commonFacilities = [
        '免费WiFi', '停车场', '餐厅', '健身房', '游泳池', 
        'SPA', '商务中心', '会议室', '接机服务', '行李寄存',
        '24小时前台', '叫醒服务', '洗衣服务'
      ];

      // 常见标签
      const commonTags = [
        '亲子优选', '商务出行', '情侣度假', '家庭出游', 
        '朋友聚会', '豪华享受', '性价比高', '风景优美',
        '交通便利', '安静舒适', '网红打卡', '新开业'
      ];

      return ResponseUtil.success(res, {
        stars: Object.keys(starCounts).map(star => ({
          value: parseInt(star),
          label: `${star}星级`,
          count: starCounts[star]
        })),
        price_range: {
          min: minPrice === Infinity ? 0 : Math.floor(minPrice / 100) * 100,
          max: maxPrice === 0 ? 2000 : Math.ceil(maxPrice / 100) * 100,
          ranges: priceRanges
        },
        facilities: commonFacilities.map(f => ({
          value: f,
          label: f,
          count: facilitiesSet.has(f) ? 'available' : 0
        })),
        tags: commonTags.map(t => ({
          value: t,
          label: t,
          count: tagsSet.has(t) ? 'available' : 0
        }))
      });

    } catch (error) {
      console.error('获取筛选条件错误:', error);
      return ResponseUtil.error(res, '获取筛选条件失败', 500);
    }
  }

  /**
   * 获取附近酒店
   * GET /api/mobile/hotels/nearby
   * 需求：根据定位获取附近酒店
   */
  static async getNearbyHotels(req, res) {
    try {
      const { latitude, longitude, radius = 5 } = req.query; // radius单位：km

      if (!latitude || !longitude) {
        return ResponseUtil.error(res, '缺少定位信息', 400);
      }

      // 简化版：实际项目中应该用地理空间查询
      // 这里返回所有已发布的酒店
      const hotels = await Hotel.findAll({
        where: {
          review_status: 'approved',
          publish_status: 'published'
        },
        attributes: [
          'id', 'name', 'address', 'star', 'price', 'images'
        ],
        limit: 20
      });

      // 模拟距离计算
      const nearbyHotels = hotels.map(hotel => ({
        ...hotel.toJSON(),
        distance: (Math.random() * 5).toFixed(1) + 'km'
      }));

      return ResponseUtil.success(res, nearbyHotels);

    } catch (error) {
      console.error('获取附近酒店错误:', error);
      return ResponseUtil.error(res, '获取附近酒店失败', 500);
    }
  }

  /**
   * 收藏/取消收藏酒店
   * POST /api/mobile/hotels/:id/favorite
   * 需求：收藏功能
   */
  static async toggleFavorite(req, res) {
    try {
      if (!req.user) {
        return ResponseUtil.unauthorized(res);
      }

      const { id } = req.params;

      // 检查酒店是否存在
      const hotel = await Hotel.findByPk(id);
      if (!hotel) {
        return ResponseUtil.notFound(res, '酒店不存在');
      }

      // 检查是否已收藏
      const existing = await Favorite.findOne({
        where: {
          user_id: req.user.id,
          hotel_id: id
        }
      });

      if (existing) {
        // 取消收藏
        await existing.destroy();
        return ResponseUtil.success(res, { is_favorite: false }, '已取消收藏');
      } else {
        // 添加收藏
        await Favorite.create({
          user_id: req.user.id,
          hotel_id: id
        });
        return ResponseUtil.success(res, { is_favorite: true }, '收藏成功');
      }

    } catch (error) {
      console.error('收藏操作错误:', error);
      return ResponseUtil.error(res, '操作失败', 500);
    }
  }

  /**
   * 获取用户的收藏列表
   * GET /api/mobile/user/favorites
   * 需求：收藏酒店列表
   */
  static async getUserFavorites(req, res) {
    try {
      if (!req.user) {
        return ResponseUtil.unauthorized(res);
      }

      const { page, pageSize } = req.query;
      const pagination = Validator.validatePagination(page, pageSize);

      const favorites = await Favorite.findAndCountAll({
        where: { user_id: req.user.id },
        include: [{
          model: Hotel,
          as: 'hotel',
          attributes: ['id', 'name', 'address', 'star', 'price', 'images']
        }],
        order: [['created_at', 'DESC']],
        limit: pagination.pageSize,
        offset: (pagination.page - 1) * pagination.pageSize
      });

      const list = favorites.rows.map(f => ({
        ...f.hotel.toJSON(),
        favorite_time: f.created_at
      }));

      return ResponseUtil.paginate(res, list, {
        ...pagination,
        total: favorites.count
      });

    } catch (error) {
      console.error('获取收藏列表错误:', error);
      return ResponseUtil.error(res, '获取收藏列表失败', 500);
    }
  }

  /**
   * 获取浏览历史
   * GET /api/mobile/user/browse-history
   * 需求：最近浏览的酒店
   */
  static async getBrowseHistory(req, res) {
    try {
      if (!req.user) {
        return ResponseUtil.success(res, []); // 未登录返回空
      }

      const history = await BrowseHistory.findAll({
        where: { user_id: req.user.id },
        include: [{
          model: Hotel,
          as: 'hotel',
          attributes: ['id', 'name', 'address', 'star', 'price', 'images']
        }],
        order: [['browse_time', 'DESC']],
        limit: 20
      });

      const list = history.map(h => ({
        ...h.hotel.toJSON(),
        browse_time: h.browse_time
      }));

      return ResponseUtil.success(res, list);

    } catch (error) {
      console.error('获取浏览历史错误:', error);
      return ResponseUtil.error(res, '获取浏览历史失败', 500);
    }
  }
}

module.exports = MobileHotelController;