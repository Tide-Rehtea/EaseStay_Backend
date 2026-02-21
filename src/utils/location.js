/**
 * 定位工具类
 * 处理经纬度、城市相关的工具函数
 */
class LocationUtil {
  /**
   * 根据经纬度获取城市信息
   * 这里使用简化版本，实际项目中可调用高德/腾讯地图API
   */
  static async getCityByCoordinates(latitude, longitude) {
    try {
      // 简化版本：根据经纬度范围返回城市
      // 实际项目中应该调用地图API
      
      // 示例：北京范围
      if (latitude > 39.4 && latitude < 41.6 && longitude > 115.7 && longitude < 117.4) {
        return {
          city: '北京',
          city_code: '010'
        };
      }
      // 上海范围
      else if (latitude > 30.4 && latitude < 32.1 && longitude > 120.5 && longitude < 122.2) {
        return {
          city: '上海',
          city_code: '021'
        };
      }
      // 广州范围
      else if (latitude > 22.5 && latitude < 24.1 && longitude > 112.8 && longitude < 114.4) {
        return {
          city: '广州',
          city_code: '020'
        };
      }
      // 深圳范围
      else if (latitude > 22.4 && latitude < 22.9 && longitude > 113.7 && longitude < 114.6) {
        return {
          city: '深圳',
          city_code: '0755'
        };
      }
      // 默认返回
      else {
        return {
          city: '上海',
          city_code: '021'
        };
      }
    } catch (error) {
      console.error('获取城市信息失败:', error);
      return {
        city: '上海',
        city_code: '021'
      };
    }
  }

  /**
   * 获取热门城市列表
   */
  static getHotCities() {
    return [
      { name: '北京', code: '010', hot: true },
      { name: '上海', code: '021', hot: true },
      { name: '广州', code: '020', hot: true },
      { name: '深圳', code: '0755', hot: true },
      { name: '杭州', code: '0571', hot: true },
      { name: '成都', code: '028', hot: true },
      { name: '重庆', code: '023', hot: true },
      { name: '西安', code: '029', hot: true },
      { name: '南京', code: '025', hot: true },
      { name: '武汉', code: '027', hot: true },
      { name: '长沙', code: '0731', hot: false },
      { name: '厦门', code: '0592', hot: false },
      { name: '青岛', code: '0532', hot: false },
      { name: '大连', code: '0411', hot: false },
      { name: '三亚', code: '0899', hot: false },
      { name: '昆明', code: '0871', hot: false }
    ];
  }

  /**
   * 按拼音首字母分组城市
   */
  static groupCitiesByPinyin(cities) {
    const groups = {};
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    
    // 初始化分组
    letters.forEach(letter => {
      groups[letter] = [];
    });
    
    // 将城市分配到对应字母组
    cities.forEach(city => {
      // 获取城市名称拼音首字母（简化版，实际可用pinyin库）
      const firstLetter = this.getFirstLetter(city.name);
      if (groups[firstLetter]) {
        groups[firstLetter].push(city);
      } else {
        groups['Z'].push(city); // 默认放到Z组
      }
    });
    
    // 过滤掉空组
    const result = {};
    Object.keys(groups).forEach(letter => {
      if (groups[letter].length > 0) {
        result[letter] = groups[letter];
      }
    });
    
    return result;
  }

  /**
   * 获取城市名称拼音首字母（简化版）
   */
  static getFirstLetter(cityName) {
    // 实际项目中可以使用pinyin库
    // 这里简化处理，只返回常见城市的首字母
    const map = {
      '北京': 'B',
      '上海': 'S',
      '广州': 'G',
      '深圳': 'S',
      '杭州': 'H',
      '成都': 'C',
      '重庆': 'C',
      '西安': 'X',
      '南京': 'N',
      '武汉': 'W',
      '长沙': 'C',
      '厦门': 'X',
      '青岛': 'Q',
      '大连': 'D',
      '三亚': 'S',
      '昆明': 'K'
    };
    
    return map[cityName] || cityName.charAt(0).toUpperCase();
  }
}

module.exports = LocationUtil;