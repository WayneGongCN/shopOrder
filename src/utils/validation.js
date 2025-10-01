const Joi = require("joi");

/**
 * 验证请求参数
 * @param {object} data 要验证的数据
 * @param {object} schema Joi验证模式
 * @returns {object} 验证结果
 */
function validate(data, schema) {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join("."),
      message: detail.message
    }));
    
    return {
      isValid: false,
      errors,
      data: null
    };
  }
  
  return {
    isValid: true,
    errors: null,
    data: value
  };
}

/**
 * 分页参数验证模式
 */
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
  keyword: Joi.string().allow("").optional()
});

/**
 * 商品验证模式
 */
const productSchema = Joi.object({
  name: Joi.string().max(100).required().messages({
    "string.empty": "商品名称不能为空",
    "string.max": "商品名称不能超过100个字符"
  }),
  globalPrice: Joi.number().precision(2).min(0).required().messages({
    "number.base": "价格必须是数字",
    "number.min": "价格不能小于0"
  }),
  unit: Joi.string().max(20).default("个").messages({
    "string.max": "单位不能超过20个字符"
  })
});

/**
 * 客户验证模式
 */
const customerSchema = Joi.object({
  name: Joi.string().max(50).required().messages({
    "string.empty": "客户姓名不能为空",
    "string.max": "客户姓名不能超过50个字符"
  }),
  phone: Joi.string().max(20).allow("").optional().messages({
    "string.max": "电话号码不能超过20个字符"
  })
});

/**
 * 订单项验证模式
 */
const orderItemSchema = Joi.object({
  productId: Joi.string().uuid().required().messages({
    "string.guid": "商品ID格式不正确"
  }),
  quantity: Joi.number().precision(2).min(0.01).required().messages({
    "number.base": "数量必须是数字",
    "number.min": "数量必须大于0"
  }),
  unit: Joi.string().max(20).required().messages({
    "string.empty": "单位不能为空"
  }),
  unitPrice: Joi.number().precision(2).min(0).required().messages({
    "number.base": "单价必须是数字",
    "number.min": "单价不能小于0"
  })
});

/**
 * 订单验证模式
 */
const orderSchema = Joi.object({
  customerId: Joi.string().uuid().required().messages({
    "string.guid": "客户ID格式不正确"
  }),
  items: Joi.array().items(orderItemSchema).min(1).required().messages({
    "array.min": "订单至少包含一个商品"
  }),
  remark: Joi.string().allow("").optional()
});

/**
 * 订单更新验证模式
 */
const orderUpdateSchema = Joi.object({
  remark: Joi.string().allow("").optional(),
  items: Joi.array().items(orderItemSchema).min(1).optional().messages({
    "array.min": "订单至少包含一个商品"
  })
}).custom((value, helpers) => {
  // 确保至少有一个更新内容
  if (!value.remark && !value.items) {
    return helpers.error("custom.noUpdateContent");
  }
  return value;
}).messages({
  "custom.noUpdateContent": "至少需要提供一个更新内容"
});

/**
 * 订单状态更新验证模式
 */
const orderStatusSchema = Joi.object({
  status: Joi.string().valid(
    "draft", "processing", "completed", "cancelled"
  ).required().messages({
    "any.only": "订单状态值不正确"
  }),
  remark: Joi.string().allow("").optional()
});

/**
 * 客户专属价格验证模式
 */
const customerPriceSchema = Joi.object({
  productId: Joi.string().uuid().required().messages({
    "string.guid": "商品ID格式不正确"
  }),
  price: Joi.number().precision(2).min(0).required().messages({
    "number.base": "价格必须是数字",
    "number.min": "价格不能小于0"
  })
});

module.exports = {
  validate,
  paginationSchema,
  productSchema,
  customerSchema,
  orderItemSchema,
  orderSchema,
  orderUpdateSchema,
  orderStatusSchema,
  customerPriceSchema
};
