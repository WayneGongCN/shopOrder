const { Order, OrderItem, Customer, Product, CustomerPrice, OrderStatusFlow, OrderHistory } = require("../models");
const { success, pagination, notFound, serverError } = require("../utils/response");
const { generateOrderNumber } = require("../utils/orderNumber");
const { Op } = require("sequelize");
const orderStatusService = require("../services/orderStatusService");

/**
 * 创建订单
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function createOrder(req, res) {
  const transaction = await Order.sequelize.transaction();
  
  try {
    const { customerId, items, remark } = req.body;
    
    // 检查客户是否存在
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      await transaction.rollback();
      return res.status(404).json(notFound("客户不存在"));
    }
    
    // 生成订单号
    const orderNo = generateOrderNumber();
    
    // 创建订单
    const order = await Order.create({
      orderNo,
      customerId,
      totalAmount: 0,
      status: "draft",
      remark,
      createdBy: req.headers["x-wx-openid"] || "system"
    }, { transaction });
    
    let totalAmount = 0;
    
    // 创建订单项
    for (const item of items) {
      const { productId, quantity, unit, unitPrice } = item;
      
      // 获取商品信息
      const product = await Product.findByPk(productId);
      if (!product) {
        await transaction.rollback();
        return res.status(404).json(notFound(`商品不存在: ${productId}`));
      }
      
      const totalPrice = quantity * unitPrice;
      totalAmount += totalPrice;
      
      await OrderItem.create({
        orderId: order.id,
        productId,
        productName: product.name,
        unit,
        quantity,
        unitPrice,
        totalPrice
      }, { transaction });
    }
    
    // 更新订单总金额
    await order.update({ totalAmount }, { transaction });
    
    // 记录订单历史
    await OrderHistory.create({
      orderId: order.id,
      action: "created",
      description: "订单创建",
      operator: req.headers["x-wx-openid"] || "system",
      changes: { items, totalAmount }
    }, { transaction });
    
    await transaction.commit();
    
    // 返回完整的订单信息
    const result = await Order.findByPk(order.id, {
      include: [
        {
          model: Customer,
          as: "customer",
          attributes: ["id", "name", "phone"]
        },
        {
          model: OrderItem,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["id", "name", "globalPrice", "unit"]
            }
          ]
        }
      ]
    });
    
    res.status(201).json(success(result, "订单创建成功"));
  } catch (error) {
    await transaction.rollback();
    console.error("创建订单失败:", error);
    res.status(500).json(serverError("创建订单失败"));
  }
}

/**
 * 获取订单列表
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function getOrders(req, res) {
  try {
    const { 
      page = 1, 
      pageSize = 20, 
      status, 
      customerId, 
      startDate, 
      endDate, 
      keyword 
    } = req.query;
    
    const offset = (page - 1) * pageSize;
    const where = {};
    
    // 状态筛选
    if (status) {
      where.status = status;
    }
    
    // 客户筛选
    if (customerId) {
      where.customerId = customerId;
    }
    
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
    
    // 关键词搜索（订单号、客户名称）
    if (keyword) {
      where[Op.or] = [
        { order_no: { [Op.like]: `%${keyword}%` } },
        { "$customer.name$": { [Op.like]: `%${keyword}%` } }
      ];
    }
    
    const { count, rows } = await Order.findAndCountAll({
      where,
      include: [
        {
          model: Customer,
          as: "customer",
          attributes: ["id", "name", "phone"]
        }
      ],
      limit: parseInt(pageSize),
      offset,
      order: [["created_at", "DESC"]]
    });
    
    res.json(pagination(rows, count, page, pageSize));
  } catch (error) {
    console.error("获取订单列表失败:", error);
    res.status(500).json(serverError("获取订单列表失败"));
  }
}

/**
 * 获取订单详情
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    const { includeHistory } = req.query;
    
    const include = [
      {
        model: Customer,
        as: "customer",
        attributes: ["id", "name", "phone"]
      },
      {
        model: OrderItem,
        as: "items",
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "name", "globalPrice", "unit"]
          }
        ]
      }
    ];
    
    // 如果需要包含历史记录
    if (includeHistory === "true") {
      include.push({
        model: OrderHistory,
        as: "histories",
        order: [["created_at", "DESC"]]
      });
    }
    
    const order = await Order.findByPk(id, { include });
    
    if (!order) {
      return res.status(404).json(notFound("订单不存在"));
    }
    
    res.json(success(order));
  } catch (error) {
    console.error("获取订单详情失败:", error);
    res.status(500).json(serverError("获取订单详情失败"));
  }
}

/**
 * 更新订单状态
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function updateOrderStatus(req, res) {
  const transaction = await Order.sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { status, operator, role = "admin", remark } = req.body;
    
    // 使用状态管理服务执行状态流转
    const result = await orderStatusService.transitionStatus(
      id,
      req.orderStatusValidation.currentStatus,
      status,
      operator,
      role,
      remark,
      transaction
    );
    
    await transaction.commit();
    
    res.json(success(result, "订单状态更新成功"));
  } catch (error) {
    await transaction.rollback();
    console.error("更新订单状态失败:", error);
    res.status(400).json({
      success: false,
      message: error.message || "更新订单状态失败"
    });
  }
}

/**
 * 获取订单状态流转记录
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function getOrderStatusFlows(req, res) {
  try {
    const { id } = req.params;
    
    const flows = await orderStatusService.getStatusFlowHistory(id);
    
    res.json(success(flows));
  } catch (error) {
    console.error("获取订单状态流转记录失败:", error);
    res.status(500).json(serverError("获取订单状态流转记录失败"));
  }
}

/**
 * 获取客户专属价格（用于订单创建时的价格计算）
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function getCustomerProductPrice(req, res) {
  try {
    const { customerId, productId } = req.params;
    
    // 查找客户专属价格
    const customerPrice = await CustomerPrice.findOne({
      where: {
        customerId,
        productId
      }
    });
    
    // 如果没有专属价格，返回商品默认价格
    if (!customerPrice) {
      const product = await Product.findByPk(productId);
      if (!product) {
        return res.status(404).json(notFound("商品不存在"));
      }
      
      return res.json(success({
        price: product.globalPrice,
        isCustom: false
      }));
    }
    
    res.json(success({
      price: customerPrice.price,
      isCustom: true
    }));
  } catch (error) {
    console.error("获取客户商品价格失败:", error);
    res.status(500).json(serverError("获取客户商品价格失败"));
  }
}


/**
 * 取消订单
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function cancelOrder(req, res) {
  const transaction = await Order.sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { operator, role = "admin", remark } = req.body;
    
    const result = await orderStatusService.transitionStatus(
      id,
      req.cancellationValidation.order.status,
      orderStatusService.STATUS.CANCELLED,
      operator,
      role,
      remark || "订单取消",
      transaction
    );
    
    await transaction.commit();
    
    res.json(success(result, "订单取消成功"));
  } catch (error) {
    await transaction.rollback();
    console.error("取消订单失败:", error);
    res.status(400).json({
      success: false,
      message: error.message || "取消订单失败"
    });
  }
}

/**
 * 获取订单状态信息
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function getOrderStatusInfo(req, res) {
  try {
    res.json(success(req.orderStatusInfo));
  } catch (error) {
    console.error("获取订单状态信息失败:", error);
    res.status(500).json(serverError("获取订单状态信息失败"));
  }
}


module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  getOrderStatusFlows,
  getCustomerProductPrice,
  cancelOrder,
  getOrderStatusInfo
};
