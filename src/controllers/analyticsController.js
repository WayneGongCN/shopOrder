const { Order, OrderItem, Customer, Product } = require("../models");
const { success, serverError } = require("../utils/response");
const { Op } = require("sequelize");
const { literal } = require("sequelize");

/**
 * 销售概览
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function getSalesOverview(req, res) {
  try {
    const { startDate, endDate } = req.query;
    
    const where = {};
    
    // 日期范围筛选
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.created_at[Op.lte] = new Date(endDate);
      }
    }
    
    // 获取订单统计
    const orderStats = await Order.findAll({
      where,
      attributes: [
        [literal("COUNT(*)"), "totalOrders"],
        [literal("SUM(total_amount)"), "totalAmount"],
        [literal("AVG(total_amount)"), "averageOrderAmount"]
      ],
      raw: true
    });
    
    // 获取客户统计
    const customerStats = await Customer.count({
      where: startDate || endDate ? {
        created_at: {
          [Op.gte]: startDate ? new Date(startDate) : undefined,
          [Op.lte]: endDate ? new Date(endDate) : undefined
        }
      } : {}
    });
    
    const result = {
      totalOrders: parseInt(orderStats[0]?.totalOrders || 0),
      totalAmount: parseFloat(orderStats[0]?.totalAmount || 0),
      totalCustomers: customerStats,
      averageOrderAmount: parseFloat(orderStats[0]?.averageOrderAmount || 0)
    };
    
    res.json(success(result));
  } catch (error) {
    console.error("获取销售概览失败:", error);
    res.status(500).json(serverError("获取销售概览失败"));
  }
}

/**
 * 销售趋势
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function getSalesTrend(req, res) {
  try {
    const { period = "daily", startDate, endDate } = req.query;
    
    const where = {};
    
    // 日期范围筛选
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.created_at[Op.lte] = new Date(endDate);
      }
    }
    
    let dateFormat;
    switch (period) {
      case "daily":
        dateFormat = "%Y-%m-%d";
        break;
      case "weekly":
        dateFormat = "%Y-%u";
        break;
      case "monthly":
        dateFormat = "%Y-%m";
        break;
      default:
        dateFormat = "%Y-%m-%d";
    }
    
    const trends = await Order.findAll({
      where,
      attributes: [
        [literal(`DATE_FORMAT(created_at, '${dateFormat}')`), "period"],
        [literal("COUNT(*)"), "orderCount"],
        [literal("SUM(total_amount)"), "totalAmount"]
      ],
      group: [literal(`DATE_FORMAT(created_at, '${dateFormat}')`)],
      order: [[literal("period"), "ASC"]],
      raw: true
    });
    
    const result = trends.map(trend => ({
      period: trend.period,
      orderCount: parseInt(trend.orderCount),
      totalAmount: parseFloat(trend.totalAmount)
    }));
    
    res.json(success(result));
  } catch (error) {
    console.error("获取销售趋势失败:", error);
    res.status(500).json(serverError("获取销售趋势失败"));
  }
}

/**
 * 热销商品排行
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function getTopProducts(req, res) {
  try {
    const { startDate, endDate, limit = 10 } = req.query;
    
    const where = {};
    
    // 日期范围筛选
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.created_at[Op.lte] = new Date(endDate);
      }
    }
    
    const topProducts = await OrderItem.findAll({
      include: [
        {
          model: Order,
          as: "order",
          where,
          attributes: []
        },
        {
          model: Product,
          as: "product",
          attributes: ["id", "name", "unit"]
        }
      ],
      attributes: [
        "product_id",
        [literal("SUM(quantity)"), "totalQuantity"],
        [literal("SUM(total_price)"), "totalAmount"],
        [literal("COUNT(DISTINCT order_id)"), "orderCount"]
      ],
      group: ["product_id"],
      order: [[literal("totalQuantity"), "DESC"]],
      limit: parseInt(limit),
      raw: false
    });
    
    const result = topProducts.map(item => ({
      productId: item.product_id,
      productName: item.product.name,
      unit: item.product.unit,
      totalQuantity: parseFloat(item.dataValues.totalQuantity),
      totalAmount: parseFloat(item.dataValues.totalAmount),
      orderCount: parseInt(item.dataValues.orderCount)
    }));
    
    res.json(success(result));
  } catch (error) {
    console.error("获取热销商品排行失败:", error);
    res.status(500).json(serverError("获取热销商品排行失败"));
  }
}

/**
 * 客户分析
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function getCustomerAnalytics(req, res) {
  try {
    const { startDate, endDate } = req.query;
    
    const where = {};
    
    // 日期范围筛选
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.created_at[Op.lte] = new Date(endDate);
      }
    }
    
    // 获取客户订单统计
    const customerStats = await Order.findAll({
      where,
      include: [
        {
          model: Customer,
          as: "customer",
          attributes: ["id", "name"]
        }
      ],
      attributes: [
        "customer_id",
        [literal("COUNT(*)"), "orderCount"],
        [literal("SUM(total_amount)"), "totalAmount"],
        [literal("AVG(total_amount)"), "averageAmount"]
      ],
      group: ["customer_id"],
      order: [[literal("totalAmount"), "DESC"]],
      limit: 20,
      raw: false
    });
    
    const result = customerStats.map(stat => ({
      customerId: stat.customer_id,
      customerName: stat.customer.name,
      orderCount: parseInt(stat.dataValues.orderCount),
      totalAmount: parseFloat(stat.dataValues.totalAmount),
      averageAmount: parseFloat(stat.dataValues.averageAmount)
    }));
    
    res.json(success(result));
  } catch (error) {
    console.error("获取客户分析失败:", error);
    res.status(500).json(serverError("获取客户分析失败"));
  }
}

/**
 * 订单状态统计
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function getOrderStatusStats(req, res) {
  try {
    const { startDate, endDate } = req.query;
    
    const where = {};
    
    // 日期范围筛选
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.created_at[Op.lte] = new Date(endDate);
      }
    }
    
    const statusStats = await Order.findAll({
      where,
      attributes: [
        "status",
        [literal("COUNT(*)"), "count"],
        [literal("SUM(total_amount)"), "totalAmount"]
      ],
      group: ["status"],
      order: [[literal("count"), "DESC"]],
      raw: true
    });
    
    const result = statusStats.map(stat => ({
      status: stat.status,
      count: parseInt(stat.count),
      totalAmount: parseFloat(stat.totalAmount)
    }));
    
    res.json(success(result));
  } catch (error) {
    console.error("获取订单状态统计失败:", error);
    res.status(500).json(serverError("获取订单状态统计失败"));
  }
}

module.exports = {
  getSalesOverview,
  getSalesTrend,
  getTopProducts,
  getCustomerAnalytics,
  getOrderStatusStats
};
