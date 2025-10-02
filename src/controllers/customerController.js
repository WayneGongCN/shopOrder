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

/**
 * 获取客户维度的商品列表（返回客户专属价格）
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function getCustomerProducts(req, res) {
  try {
    const { customerId } = req.params;
    const { page = 1, pageSize = 20, keyword } = req.query;
    
    // 检查客户是否存在
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json(notFound("客户不存在"));
    }
    
    const offset = (page - 1) * pageSize;
    const where = {};
    
    // 关键词搜索
    if (keyword) {
      where.name = {
        [Op.like]: `%${keyword}%`
      };
    }
    
    // 获取商品列表
    const { count, rows } = await Product.findAndCountAll({
      where,
      limit: parseInt(pageSize),
      offset,
      order: [["name", "ASC"]]
    });
    
    // 为每个商品获取客户专属价格
    const productsWithPrices = await Promise.all(
      rows.map(async (product) => {
        const customerPrice = await CustomerPrice.findOne({
          where: {
            customerId,
            productId: product.id
          }
        });
        
        return {
          id: product.id,
          name: product.name,
          globalPrice: product.globalPrice,
          unit: product.unit,
          price: customerPrice ? customerPrice.price : product.globalPrice,
          isCustomPrice: !!customerPrice,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt
        };
      })
    );
    
    res.json(pagination(productsWithPrices, count, page, pageSize));
  } catch (error) {
    console.error("获取客户商品列表失败:", error);
    res.status(500).json(serverError("获取客户商品列表失败"));
  }
}

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getAllCustomers,
  getCustomerProducts
};
