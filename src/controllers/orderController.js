const { Order, OrderItem, Customer, Product, CustomerPrice, OrderStatusFlow, OrderHistory } = require("../models");
const { success, pagination, notFound, serverError } = require("../utils/response");
const { generateOrderNumber } = require("../utils/orderNumber");
const { Op } = require("sequelize");

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
      order_no: orderNo,
      customer_id: customerId,
      total_amount: 0,
      status: "draft",
      remark,
      created_by: req.headers["x-wx-openid"] || "system"
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
        order_id: order.id,
        product_id: productId,
        product_name: product.name,
        unit,
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice
      }, { transaction });
    }
    
    // 更新订单总金额
    await order.update({ total_amount: totalAmount }, { transaction });
    
    // 记录订单历史
    await OrderHistory.create({
      order_id: order.id,
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
              attributes: ["id", "name", "global_price", "unit"]
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
      where.customer_id = customerId;
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
            attributes: ["id", "name", "global_price", "unit"]
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
    const { status, operator, remark } = req.body;
    
    const order = await Order.findByPk(id);
    
    if (!order) {
      await transaction.rollback();
      return res.status(404).json(notFound("订单不存在"));
    }
    
    const oldStatus = order.status;
    
    // 更新订单状态
    await order.update({ status }, { transaction });
    
    // 记录状态流转
    await OrderStatusFlow.create({
      order_id: id,
      from_status: oldStatus,
      to_status: status,
      operator,
      remark
    }, { transaction });
    
    // 记录订单历史
    await OrderHistory.create({
      order_id: id,
      action: "status_changed",
      description: `订单状态从 ${oldStatus} 变更为 ${status}`,
      operator,
      changes: { from_status: oldStatus, to_status: status }
    }, { transaction });
    
    await transaction.commit();
    
    res.json(success(null, "订单状态更新成功"));
  } catch (error) {
    await transaction.rollback();
    console.error("更新订单状态失败:", error);
    res.status(500).json(serverError("更新订单状态失败"));
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
    
    const flows = await OrderStatusFlow.findAll({
      where: { order_id: id },
      order: [["created_at", "ASC"]]
    });
    
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
        customer_id: customerId,
        product_id: productId
      }
    });
    
    // 如果没有专属价格，返回商品默认价格
    if (!customerPrice) {
      const product = await Product.findByPk(productId);
      if (!product) {
        return res.status(404).json(notFound("商品不存在"));
      }
      
      return res.json(success({
        price: product.global_price,
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

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  getOrderStatusFlows,
  getCustomerProductPrice
};
