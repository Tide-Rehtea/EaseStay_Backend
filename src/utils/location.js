/**
 * 定位工具类
 * 处理经纬度、城市相关的工具函数
 * 国内优先使用高德逆地理编码（需配置 AMAP_KEY），国外/无 key 时用 Nominatim
 */
require('dotenv').config();

class LocationUtil {
  /** 城市名称与区号映射（仅用于区号，城市名来自 API） */
  static CITY_CODE_MAP = {
    '北京': '010', '北京市': '010',
    '上海': '021', '上海市': '021',
    '广州': '020', '广州市': '020',
    '深圳': '0755', '深圳市': '0755',
    '杭州': '0571', '杭州市': '0571',
    '成都': '028', '成都市': '028',
    '重庆': '023', '重庆市': '023',
    '西安': '029', '西安市': '029',
    '南京': '025', '南京市': '025',
    '武汉': '027', '武汉市': '027',
    '长沙': '0731', '长沙市': '0731',
    '厦门': '0592', '厦门市': '0592',
    '青岛': '0532', '青岛市': '0532',
    '大连': '0411', '大连市': '0411',
    '三亚': '0899', '三亚市': '0899',
    '昆明': '0871', '昆明市': '0871',
    '苏州': '0512', '苏州市': '0512',
    '宁波': '0574', '宁波市': '0574',
    '无锡': '0510', '无锡市': '0510',
    '东莞': '0769', '东莞市': '0769',
    '佛山': '0757', '佛山市': '0757',
    '郑州': '0371', '郑州市': '0371',
    '天津': '022', '天津市': '022',
    '济南': '0531', '济南市': '0531',
    '哈尔滨': '0451', '哈尔滨市': '0451',
    '沈阳': '024', '沈阳市': '024',
    '合肥': '0551', '合肥市': '0551',
    '福州': '0591', '福州市': '0591',
    '南昌': '0791', '南昌市': '0791',
    '长春': '0431', '长春市': '0431',
    '石家庄': '0311', '石家庄市': '0311',
    '太原': '0351', '太原市': '0351',
    '贵阳': '0851', '贵阳市': '0851'
  };

  /**
   * 根据经纬度获取城市信息
   * 有 AMAP_KEY 时用高德（国内可访问），否则用 Nominatim（国外服务，国内可能失败）
   */
  static async getCityByCoordinates(latitude, longitude) {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return { city: '定位失败', city_code: '000' };
    }

    const amapKey = process.env.AMAP_KEY;
    if (amapKey) {
      const result = await this._fetchFromAmap(lon, lat);
      if (result) return result;
    }

    return this._fetchFromNominatim(lat, lon);
  }

  /** 高德逆地理编码（国内可访问，需申请 key） */
  static async _fetchFromAmap(longitude, latitude) {
    try {
      const location = `${longitude},${latitude}`;
      const url = `https://restapi.amap.com/v3/geocode/regeo?key=${process.env.AMAP_KEY}&location=${location}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.status !== '1') {
        console.error('高德逆地理失败:', data.info);
        return null;
      }
      const comp = data?.regeocode?.addressComponent;
      if (!comp) return null;
      // 直辖市：city 为空，用 province
      let cityName = comp.city || comp.province;
      if (!cityName) return null;
      const cityCode = comp.citycode || this.CITY_CODE_MAP[cityName] || this.CITY_CODE_MAP[cityName.replace(/[省市]$/, '')] || '000';
      const normalized = cityName.replace(/[省市自治区特别行政区]$/, '');
      return { city: normalized, city_code: cityCode };
    } catch (error) {
      console.error('高德逆地理异常:', error.message);
      return null;
    }
  }

  /** Nominatim 逆地理（国外服务，国内可能 fetch failed） */
  static async _fetchFromNominatim(lat, lon) {
    try {
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.searchParams.set('lat', lat);
      url.searchParams.set('lon', lon);
      url.searchParams.set('format', 'json');
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('accept-language', 'zh');
      const response = await fetch(url.toString(), {
        headers: { 'User-Agent': 'EaseStay-Hotel/1.0 (contact@example.com)' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const address = data?.address;
      if (!address) return { city: '定位失败', city_code: '000' };
      let cityName = null;
      const displayName = data?.display_name || '';
      const parts = displayName.split(',').map(s => s.trim());
      for (const part of parts) {
        if (part.endsWith('市') && part !== '中国') {
          cityName = part;
          break;
        }
      }
      if (!cityName) {
        const raw = address.city || address.town || address.village ||
          address.county || address.municipality || address.state || address.province;
        if (raw && raw.endsWith('市')) cityName = raw;
      }
      if (!cityName) return { city: '定位失败', city_code: '000' };
      const normalizedName = cityName.replace(/[省市自治区特别行政区]$/, '');
      const cityCode = this.CITY_CODE_MAP[cityName] || this.CITY_CODE_MAP[normalizedName] || '000';
      return { city: normalizedName, city_code: cityCode };
    } catch (error) {
      console.error('逆地理编码异常:', error.message);
      return { city: '定位失败', city_code: '000' };
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