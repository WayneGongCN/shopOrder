const { validate } = require("../utils/validation");
const { badRequest } = require("../utils/response");

/**
 * 验证中间件工厂函数
 * @param {object} schema Joi验证模式
 * @returns {function} Express中间件
 */
function validateRequest(schema) {
  return (req, res, next) => {
    const validation = validate(req.body, schema);
    
    if (!validation.isValid) {
      return res.status(400).json(badRequest("参数验证失败", validation.errors));
    }
    
    req.body = validation.data;
    next();
  };
}

/**
 * 验证查询参数中间件
 * @param {object} schema Joi验证模式
 * @returns {function} Express中间件
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const validation = validate(req.query, schema);
    
    if (!validation.isValid) {
      return res.status(400).json(badRequest("查询参数验证失败", validation.errors));
    }
    
    req.query = validation.data;
    next();
  };
}

/**
 * 验证路径参数中间件
 * @param {object} schema Joi验证模式
 * @returns {function} Express中间件
 */
function validateParams(schema) {
  return (req, res, next) => {
    const validation = validate(req.params, schema);
    
    if (!validation.isValid) {
      return res.status(400).json(badRequest("路径参数验证失败", validation.errors));
    }
    
    req.params = validation.data;
    next();
  };
}

module.exports = {
  validateRequest,
  validateQuery,
  validateParams
};
