const ResponseUtil = require('../../utils/response');
const LocationUtil = require('../../utils/location');
const { UserAddress } = require('../../models/mobile');

/**
 * 城市选择控制器
 * 处理城市定位、选择等功能
 */
class CityController {
  /**
   * 获取当前城市（根据定位）
   * GET /api/mobile/city/current
   * 需求：当前城市显示，支持定位
   */
  static async getCurrentCity(req, res) {
    try {
      const { latitude, longitude } = req.query;

      let cityInfo;

      if (latitude && longitude) {
        // 如果有经纬度，根据定位获取城市
        cityInfo = await LocationUtil.getCityByCoordinates(latitude, longitude);
      } else {
        // 没有定位，返回默认城市
        cityInfo = {
          city: '上海',
          city_code: '021'
        };
      }

      // 如果用户已登录，保存本次定位
      if (req.user) {
        await UserAddress.upsert({
          user_id: req.user.id,
          city: cityInfo.city,
          city_code: cityInfo.city_code,
          latitude: latitude || null,
          longitude: longitude || null,
          is_default: true
        });
      }

      return ResponseUtil.success(res, {
        current: cityInfo.city,
        code: cityInfo.city_code,
        locations: cityInfo
      });

    } catch (error) {
      console.error('获取当前城市错误:', error);
      // 出错时返回默认城市
      return ResponseUtil.success(res, {
        current: '上海',
        code: '021',
        locations: { city: '上海', city_code: '021' }
      });
    }
  }

  /**
   * 获取所有城市列表（按字母分组）
   * GET /api/mobile/cities
   * 需求：弹窗形式展示热门城市和字母索引城市列表
   */
  static async getAllCities(req, res) {
    try {
      // 获取所有城市
      const allCities = LocationUtil.getHotCities();
      
      // 按热门和非热门分组
      const hotCities = allCities.filter(c => c.hot);
      const normalCities = allCities.filter(c => !c.hot);

      // 按拼音首字母分组
      const groupedCities = LocationUtil.groupCitiesByPinyin(normalCities);

      return ResponseUtil.success(res, {
        hot: hotCities,
        cities: groupedCities
      });

    } catch (error) {
      console.error('获取城市列表错误:', error);
      return ResponseUtil.error(res, '获取城市列表失败', 500);
    }
  }

  /**
   * 切换城市
   * POST /api/mobile/city/switch
   * 需求：手动切换城市
   */
  static async switchCity(req, res) {
    try {
      const { city, city_code, latitude, longitude } = req.body;

      if (!city) {
        return ResponseUtil.error(res, '请选择城市', 400);
      }

      // 如果用户已登录，保存选择的城市
      if (req.user) {
        await UserAddress.create({
          user_id: req.user.id,
          city,
          city_code,
          latitude,
          longitude,
          is_default: false
        });
      }

      return ResponseUtil.success(res, {
        city,
        city_code,
        message: `已切换到${city}`
      });

    } catch (error) {
      console.error('切换城市错误:', error);
      return ResponseUtil.error(res, '切换城市失败', 500);
    }
  }

  /**
   * 搜索城市
   * GET /api/mobile/cities/search
   * 需求：支持城市搜索
   */
  static async searchCities(req, res) {
    try {
      const { keyword } = req.query;

      if (!keyword) {
        return ResponseUtil.error(res, '请输入搜索关键词', 400);
      }

      const allCities = LocationUtil.getHotCities();
      
      // 模糊搜索
      const results = allCities.filter(city => 
        city.name.includes(keyword) || city.code.includes(keyword)
      );

      return ResponseUtil.success(res, results);

    } catch (error) {
      console.error('搜索城市错误:', error);
      return ResponseUtil.error(res, '搜索城市失败', 500);
    }
  }

  /**
   * 获取用户常用地址
   * GET /api/mobile/user/addresses
   */
  static async getUserAddresses(req, res) {
    try {
      if (!req.user) {
        return ResponseUtil.unauthorized(res);
      }

      const addresses = await UserAddress.findAll({
        where: { user_id: req.user.id },
        order: [['is_default', 'DESC'], ['created_at', 'DESC']],
        limit: 10
      });

      return ResponseUtil.success(res, addresses);

    } catch (error) {
      console.error('获取地址错误:', error);
      return ResponseUtil.error(res, '获取地址失败', 500);
    }
  }
}

module.exports = CityController;