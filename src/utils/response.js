/**
 * 统一响应格式工具类
 * 规范API返回格式
 */
class ResponseUtil {
  /**
   * 成功响应
   * @param {object} res - express response对象
   * @param {object} data - 返回数据
   * @param {string} message - 提示信息
   * @param {number} status - HTTP状态码
   */
  static success(res, data = null, message = '操作成功', status = 200) {
    return res.status(status).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 错误响应
   * @param {object} res - express response对象
   * @param {string} message - 错误信息
   * @param {number} status - HTTP状态码
   * @param {string} code - 错误代码
   */
  static error(res, message = '操作失败', status = 400, code = null) {
    return res.status(status).json({
      success: false,
      message,
      code,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 分页数据响应
   * @param {object} res - express response对象
   * @param {Array} list - 数据列表
   * @param {object} pagination - 分页信息
   * @param {string} message - 提示信息
   */
  static paginate(res, list, pagination, message = '获取成功') {
    return res.status(200).json({
      success: true,
      message,
      data: {
        list,
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          totalPages: Math.ceil(pagination.total / pagination.pageSize)
        }
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 创建成功响应（201）
   * @param {object} res - express response对象
   * @param {object} data - 返回数据
   * @param {string} message - 提示信息
   */
  static created(res, data = null, message = '创建成功') {
    return this.success(res, data, message, 201);
  }

  /**
   * 未授权响应
   * @param {object} res - express response对象
   * @param {string} message - 错误信息
   */
  static unauthorized(res, message = '请先登录') {
    return this.error(res, message, 401, 'UNAUTHORIZED');
  }

  /**
   * 禁止访问响应
   * @param {object} res - express response对象
   * @param {string} message - 错误信息
   */
  static forbidden(res, message = '无权访问') {
    return this.error(res, message, 403, 'FORBIDDEN');
  }

  /**
   * 资源不存在响应
   * @param {object} res - express response对象
   * @param {string} message - 错误信息
   */
  static notFound(res, message = '资源不存在') {
    return this.error(res, message, 404, 'NOT_FOUND');
  }
}

module.exports = ResponseUtil;