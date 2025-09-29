const { Customer, CustomerPrice, Product } = require("../models");
const { success, pagination, notFound, serverError } = require("../utils/response");
const { Op } = require("sequelize");

/**
 * 创建客户
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function createCustomer(req, res) {
  try {
    const { name, phone } = req.body;
    
    const customer = await Customer.create({
      name,
      phone
    });
    
    res.status(201).json(success(customer, "客户创建成功"));
  } catch (error) {
    console.error("创建客户失败:", error);
    res.status(500).json(serverError("创建客户失败"));
  }
}

/**
 * 获取客户列表
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function getCustomers(req, res) {
  try {
    const { page = 1, pageSize = 20, keyword } = req.query;
    
    const offset = (page - 1) * pageSize;
    const where = {};
    
    // 关键词搜索
    if (keyword) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { phone: { [Op.like]: `%${keyword}%` } }
      ];
    }
    
    const { count, rows } = await Customer.findAndCountAll({
      where,
      limit: parseInt(pageSize),
      offset,
      order: [["created_at", "DESC"]]
    });
    
    res.json(pagination(rows, count, page, pageSize));
  } catch (error) {
    console.error("获取客户列表失败:", error);
    res.status(500).json(serverError("获取客户列表失败"));
  }
}

/**
 * 获取客户详情
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function getCustomerById(req, res) {
  try {
    const { id } = req.params;
    
    const customer = await Customer.findByPk(id);
    
    if (!customer) {
      return res.status(404).json(notFound("客户不存在"));
    }
    
    res.json(success(customer));
  } catch (error) {
    console.error("获取客户详情失败:", error);
    res.status(500).json(serverError("获取客户详情失败"));
  }
}

/**
 * 更新客户
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function updateCustomer(req, res) {
  try {
    const { id } = req.params;
    const { name, phone } = req.body;
    
    const customer = await Customer.findByPk(id);
    
    if (!customer) {
      return res.status(404).json(notFound("客户不存在"));
    }
    
    await customer.update({
      name,
      phone
    });
    
    res.json(success(customer, "客户更新成功"));
  } catch (error) {
    console.error("更新客户失败:", error);
    res.status(500).json(serverError("更新客户失败"));
  }
}

/**
 * 删除客户
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function deleteCustomer(req, res) {
  try {
    const { id } = req.params;
    
    const customer = await Customer.findByPk(id);
    
    if (!customer) {
      return res.status(404).json(notFound("客户不存在"));
    }
    
    await customer.destroy();
    
    res.json(success(null, "客户删除成功"));
  } catch (error) {
    console.error("删除客户失败:", error);
    res.status(500).json(serverError("删除客户失败"));
  }
}

/**
 * 获取客户专属价格列表
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function getCustomerPrices(req, res) {
  try {
    const { customerId } = req.params;
    const { productId } = req.query;
    
    const where = { customerId };
    if (productId) {
      where.productId = productId;
    }
    
    const prices = await CustomerPrice.findAll({
      where,
      include: [
        {
          model: Product,
          as: "product",
          attributes: ["id", "name", "globalPrice", "unit"]
        }
      ],
      order: [["created_at", "DESC"]]
    });
    
    res.json(success(prices));
  } catch (error) {
    console.error("获取客户专属价格失败:", error);
    res.status(500).json(serverError("获取客户专属价格失败"));
  }
}

/**
 * 设置客户专属价格
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function setCustomerPrice(req, res) {
  try {
    const { customerId } = req.params;
    const { productId, price } = req.body;
    
    // 检查客户是否存在
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json(notFound("客户不存在"));
    }
    
    // 检查商品是否存在
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json(notFound("商品不存在"));
    }
    
    // 创建或更新专属价格
    const [customerPrice, created] = await CustomerPrice.findOrCreate({
      where: {
        customerId,
        productId
      },
      defaults: {
        customerId,
        productId,
        price
      }
    });
    
    if (!created) {
      await customerPrice.update({ price });
    }
    
    // 返回包含商品信息的完整数据
    const result = await CustomerPrice.findByPk(customerPrice.id, {
      include: [
        {
          model: Product,
          as: "product",
          attributes: ["id", "name", "globalPrice", "unit"]
        }
      ]
    });
    
    res.json(success(result, created ? "专属价格设置成功" : "专属价格更新成功"));
  } catch (error) {
    console.error("设置客户专属价格失败:", error);
    res.status(500).json(serverError("设置客户专属价格失败"));
  }
}

/**
 * 删除客户专属价格
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function deleteCustomerPrice(req, res) {
  try {
    const { customerId, priceId } = req.params;
    
    const customerPrice = await CustomerPrice.findOne({
      where: {
        id: priceId,
        customerId
      }
    });
    
    if (!customerPrice) {
      return res.status(404).json(notFound("专属价格不存在"));
    }
    
    await customerPrice.destroy();
    
    res.json(success(null, "专属价格删除成功"));
  } catch (error) {
    console.error("删除客户专属价格失败:", error);
    res.status(500).json(serverError("删除客户专属价格失败"));
  }
}

/**
 * 获取所有客户（用于下拉选择）
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function getAllCustomers(req, res) {
  try {
    const customers = await Customer.findAll({
      attributes: ["id", "name", "phone"],
      order: [["name", "ASC"]]
    });
    
    res.json(success(customers));
  } catch (error) {
    console.error("获取所有客户失败:", error);
    res.status(500).json(serverError("获取所有客户失败"));
  }
}

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getCustomerPrices,
  setCustomerPrice,
  deleteCustomerPrice,
  getAllCustomers
};
