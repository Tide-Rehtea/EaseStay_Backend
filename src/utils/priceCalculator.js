/**
 * 价格计算工具类
 * 处理酒店价格计算、优惠计算等
 */
class PriceCalculator {
  /**
   * 计算入住总价
   * @param {number} basePrice - 基础房价
   * @param {object} params - 参数对象
   * @param {number} params.nights - 入住晚数
   * @param {number} params.rooms - 房间数量
   * @param {number} params.discount - 折扣率（如0.8表示8折）
   * @param {number} params.memberDiscount - 会员折扣
   * @param {number} params.couponAmount - 优惠券金额
   * @returns {object} 价格计算结果
   */
  static calculateTotalPrice(basePrice, params = {}) {
    const {
      nights = 1,
      rooms = 1,
      discount = null,
      memberDiscount = null,
      couponAmount = 0
    } = params;

    // 原始总价
    const originalTotal = basePrice * nights * rooms;
    
    // 应用折扣
    let afterDiscount = originalTotal;
    let appliedDiscounts = [];

    // 酒店活动折扣
    if (discount && discount > 0 && discount < 1) {
      afterDiscount = afterDiscount * discount;
      appliedDiscounts.push({
        type: '活动折扣',
        rate: discount,
        amount: originalTotal - afterDiscount
      });
    }

    // 会员折扣
    if (memberDiscount && memberDiscount > 0 && memberDiscount < 1) {
      const beforeMember = afterDiscount;
      afterDiscount = afterDiscount * memberDiscount;
      appliedDiscounts.push({
        type: '会员折扣',
        rate: memberDiscount,
        amount: beforeMember - afterDiscount
      });
    }

    // 优惠券
    if (couponAmount > 0) {
      const beforeCoupon = afterDiscount;
      afterDiscount = Math.max(0, afterDiscount - couponAmount);
      appliedDiscounts.push({
        type: '优惠券',
        amount: beforeCoupon - afterDiscount
      });
    }

    return {
      originalTotal: Math.round(originalTotal * 100) / 100,
      finalTotal: Math.round(afterDiscount * 100) / 100,
      totalDiscount: Math.round((originalTotal - afterDiscount) * 100) / 100,
      appliedDiscounts,
      nights,
      rooms,
      averagePerNight: Math.round((afterDiscount / nights) * 100) / 100
    };
  }

  /**
   * 获取会员等级对应的折扣
   * @param {string} memberLevel - 会员等级
   * @returns {number} 折扣率
   */
  static getMemberDiscount(memberLevel) {
    const discounts = {
      '普通会员': 1,
      '白银会员': 0.98,
      '黄金会员': 0.95,
      '铂金会员': 0.92,
      '钻石会员': 0.88
    };
    return discounts[memberLevel] || 1;
  }

  /**
   * 计算积分可抵扣金额
   * @param {number} points - 用户积分
   * @param {number} totalAmount - 订单总金额
   * @returns {object} 可抵扣信息
   */
  static calculatePointsDiscount(points, totalAmount) {
    // 100积分 = 1元
    const maxDeductible = Math.floor(points / 100);
    const maxDeductibleAmount = maxDeductible;
    
    // 最多抵扣订单金额的30%
    const maxAllowedDeductible = totalAmount * 0.3;
    
    const actualDeductibleAmount = Math.min(maxDeductibleAmount, maxAllowedDeductible);
    const usedPoints = actualDeductibleAmount * 100;
    
    return {
      canUsePoints: points >= 100,
      maxDeductiblePoints: maxDeductible * 100,
      maxDeductibleAmount: maxDeductible,
      actualDeductibleAmount: Math.round(actualDeductibleAmount * 100) / 100,
      usedPoints,
      remainingPoints: points - usedPoints
    };
  }
}

module.exports = PriceCalculator;