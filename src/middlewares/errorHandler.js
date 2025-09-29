const { serverError, notFound } = require("../utils/response");

/**
 * 全局错误处理中间件
 * @param {Error} err 错误对象
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 * @param {function} next 下一个中间件
 */
function errorHandler(err, req, res, next) {
  console.error("Error:", err);
  
  // Sequelize验证错误
  if (err.name === "SequelizeValidationError") {
    const errors = err.errors.map(error => ({
      field: error.path,
      message: error.message
    }));
    return res.status(400).json({
      success: false,
      code: 400,
      message: "数据验证失败",
      data: errors,
      timestamp: new Date().toISOString()
    });
  }
  
  // Sequelize唯一约束错误
  if (err.name === "SequelizeUniqueConstraintError") {
    return res.status(400).json({
      success: false,
      code: 400,
      message: "数据已存在",
      data: null,
      timestamp: new Date().toISOString()
    });
  }
  
  // Sequelize外键约束错误
  if (err.name === "SequelizeForeignKeyConstraintError") {
    return res.status(400).json({
      success: false,
      code: 400,
      message: "关联数据不存在",
      data: null,
      timestamp: new Date().toISOString()
    });
  }
  
  // 默认服务器错误
  res.status(500).json(serverError(err.message));
}

/**
 * 404处理中间件
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 * @param {function} next 下一个中间件
 */
function notFoundHandler(req, res, next) {
  res.status(404).json(notFound(`路径 ${req.originalUrl} 不存在`));
}

module.exports = {
  errorHandler,
  notFoundHandler
};
