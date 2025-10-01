/**
 * 统一响应格式工具
 */

/**
 * 成功响应
 * @param {*} data 响应数据
 * @param {string} message 响应消息
 * @param {number} code 响应码
 * @returns {object} 响应对象
 */
function success(data = null, message = "success", code = 200) {
  return {
    success: true,
    code,
    message,
    data,
    timestamp: new Date().toISOString()
  };
}

/**
 * 分页响应
 * @param {Array} list 数据列表
 * @param {number} total 总数量
 * @param {number} page 当前页码
 * @param {number} pageSize 每页数量
 * @param {string} message 响应消息
 * @returns {object} 分页响应对象
 */
function pagination(list = [], total = 0, page = 1, pageSize = 20, message = "success") {
  const totalPages = Math.ceil(total / pageSize);
  
  return {
    success: true,
    code: 200,
    message,
    data: {
      list,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * 错误响应
 * @param {string} message 错误消息
 * @param {number} code 错误码
 * @param {*} data 错误数据
 * @returns {object} 错误响应对象
 */
function error(message = "error", code = 500, data = null) {
  return {
    success: false,
    code,
    message,
    data,
    timestamp: new Date().toISOString()
  };
}

/**
 * 参数错误响应
 * @param {string} message 错误消息
 * @returns {object} 参数错误响应对象
 */
function badRequest(message = "参数错误", errors) {
  if (Array.isArray(errors)) {
    message = errors.map(error => `${error.field}: ${error.message}`).join("\n");
  }
  return error(message, 400);
}

/**
 * 未找到响应
 * @param {string} message 错误消息
 * @returns {object} 未找到响应对象
 */
function notFound(message = "资源未找到") {
  return error(message, 404);
}

/**
 * 未授权响应
 * @param {string} message 错误消息
 * @returns {object} 未授权响应对象
 */
function unauthorized(message = "未授权访问") {
  return error(message, 401);
}

/**
 * 禁止访问响应
 * @param {string} message 错误消息
 * @returns {object} 禁止访问响应对象
 */
function forbidden(message = "禁止访问") {
  return error(message, 403);
}

/**
 * 服务器错误响应
 * @param {string} message 错误消息
 * @returns {object} 服务器错误响应对象
 */
function serverError(message = "服务器内部错误") {
  return error(message, 500);
}

module.exports = {
  success,
  pagination,
  error,
  badRequest,
  notFound,
  unauthorized,
  forbidden,
  serverError
};
