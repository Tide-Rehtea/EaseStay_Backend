/**
 * 请求参数验证工具类
 */
class Validator {
  /**
   * 验证必填字段
   * @param {object} params - 参数对象
   * @param {Array} requiredFields - 必填字段数组
   * @returns {object} 验证结果
   */
  static validateRequired(params, requiredFields) {
    const missing = [];
    
    requiredFields.forEach(field => {
      const value = params[field];
      if (value === undefined || value === null || value === '') {
        missing.push(field);
      }
    });
    
    if (missing.length > 0) {
      return {
        valid: false,
        message: `缺少必填字段: ${missing.join(', ')}`
      };
    }
    
    return { valid: true };
  }

  /**
   * 验证日期范围
   * @param {string} checkIn - 入住日期 (YYYY-MM-DD)
   * @param {string} checkOut - 离店日期 (YYYY-MM-DD)
   * @returns {object} 验证结果
   */
  static validateDateRange(checkIn, checkOut) {
    if (!checkIn || !checkOut) {
      return {
        valid: false,
        message: '请选择入住和离店日期'
      };
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 检查日期格式
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return {
        valid: false,
        message: '日期格式不正确，请使用 YYYY-MM-DD 格式'
      };
    }

    // 不能选择过去日期
    if (checkInDate < today) {
      return {
        valid: false,
        message: '不能选择过去的日期'
      };
    }

    // 离店日期不能早于入住日期
    if (checkOutDate <= checkInDate) {
      return {
        valid: false,
        message: '离店日期必须晚于入住日期'
      };
    }

    // 最长连续入住30天
    const maxNights = 30;
    const diffTime = Math.abs(checkOutDate - checkInDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > maxNights) {
      return {
        valid: false,
        message: `最长连续入住不能超过${maxNights}天`
      };
    }

    return {
      valid: true,
      nights: diffDays
    };
  }

  /**
   * 验证邮箱格式
   * @param {string} email 
   * @returns {boolean}
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 验证手机号格式（中国大陆）
   * @param {string} phone 
   * @returns {boolean}
   */
  static isValidPhone(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  }

  /**
   * 验证分页参数
   * @param {number} page 
   * @param {number} pageSize 
   * @returns {object}
   */
  static validatePagination(page, pageSize) {
    const pagination = {
      page: 1,
      pageSize: 10
    };

    if (page && !isNaN(page) && page > 0) {
      pagination.page = parseInt(page);
    }

    if (pageSize && !isNaN(pageSize)) {
      // 限制pageSize最大为50
      pagination.pageSize = Math.min(parseInt(pageSize), 50);
    }

    return pagination;
  }

  /**
   * 验证价格区间
   * @param {number} minPrice 
   * @param {number} maxPrice 
   * @returns {object}
   */
  static validatePriceRange(minPrice, maxPrice) {
    const min = minPrice ? parseFloat(minPrice) : null;
    const max = maxPrice ? parseFloat(maxPrice) : null;

    if (min !== null && (isNaN(min) || min < 0)) {
      return {
        valid: false,
        message: '最低价格必须是大于等于0的数字'
      };
    }

    if (max !== null && (isNaN(max) || max < 0)) {
      return {
        valid: false,
        message: '最高价格必须是大于等于0的数字'
      };
    }

    if (min !== null && max !== null && min > max) {
      return {
        valid: false,
        message: '最低价格不能高于最高价格'
      };
    }

    return {
      valid: true,
      minPrice: min,
      maxPrice: max
    };
  }

  /**
   * 验证酒店星级
   * @param {Array|string} stars 
   * @returns {object}
   */
  static validateStars(stars) {
    if (!stars) {
      return { valid: true, stars: [] };
    }

    let starArray = stars;
    if (typeof stars === 'string') {
      starArray = stars.split(',').map(s => parseInt(s));
    }

    if (!Array.isArray(starArray)) {
      return {
        valid: false,
        message: '星级参数格式错误'
      };
    }

    const validStars = starArray.filter(s => s >= 1 && s <= 5);
    
    return {
      valid: true,
      stars: validStars
    };
  }
}

module.exports = Validator;