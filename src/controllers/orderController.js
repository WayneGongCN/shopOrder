const { Order, OrderItem, Customer, Product, CustomerPrice, OrderHistory } = require("../models");
const { success, pagination, notFound, serverError } = require("../utils/response");
const { generateOrderNumber } = require("../utils/orderNumber");
const { Op } = require("sequelize");
const orderStatusService = require("../services/orderStatusService");

/**
 * 批量更新客户专属价格
 * @param {string} customerId 客户ID
 * @param {Array} items 订单项数组
 * @param {object} transaction 数据库事务
 */
async function batchUpdateCustomerPrices(customerId, items, transaction) {
  for (const item of items) {
    const { productId, unitPrice } = item;
    
    // 获取商品默认价格
    const product = await Product.findByPk(productId, { transaction });
    if (!product) {
      continue;
    }
    
    // 如果订单中的价格与商品默认价格不同，则创建或更新专属价格
    if (parseFloat(unitPrice) !== parseFloat(product.globalPrice)) {
      await CustomerPrice.findOrCreate({
        where: {
          customerId,
          productId
        },
        defaults: {
          customerId,
          productId,
          price: unitPrice
        },
        transaction
      }).then(([customerPrice, created]) => {
        if (!created) {
          // 如果已存在且价格不同，则更新
          if (parseFloat(customerPrice.price) !== parseFloat(unitPrice)) {
            return customerPrice.update({ price: unitPrice }, { transaction });
          }
        }
        return customerPrice;
      });
    } else {
      // 如果价格与默认价格相同，删除专属价格（如果存在）
      await CustomerPrice.destroy({
        where: {
          customerId,
          productId
        },
        transaction
      });
    }
  }
}

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
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
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
        totalPrice,
        sortOrder: i + 1
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
    
    // 批量更新客户专属价格
    await batchUpdateCustomerPrices(customerId, items, transaction);
    
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
          order: [["sort_order", "ASC"]],
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
    
    // 构建干净的订单响应数据
    const orderData = result.toJSON();
    const cleanResult = {
      id: orderData.id,
      orderNo: orderData.orderNo,
      customerId: orderData.customerId,
      totalAmount: orderData.totalAmount,
      status: orderData.status,
      remark: orderData.remark,
      createdBy: orderData.createdBy,
      createdAt: orderData.createdAt,
      updatedAt: orderData.updatedAt,
      customer: orderData.customer,
      items: orderData.items
    };
    
    res.status(201).json(success(cleanResult, "订单创建成功"));
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
        { orderNo: { [Op.like]: `%${keyword}%` } },
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
    
    const include = [
      {
        model: Customer,
        as: "customer",
        attributes: ["id", "name", "phone"]
      },
      {
        model: OrderItem,
        as: "items",
        order: [["sort_order", "ASC"]],
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "name", "globalPrice", "unit"],
          }
        ]
      },
      {
        model: OrderHistory,
        as: "histories",
        order: [["created_at", "DESC"]]
      }
    ];
    
    const order = await Order.findByPk(id, { include });
    
    if (!order) {
      return res.status(404).json(notFound("订单不存在"));
    }
    
    // 获取状态信息和流转历史
    const statusInfo = {
      currentStatus: order.status,
      currentStatusDesc: orderStatusService.getStatusDescription(order.status),
      availableTransitions: orderStatusService.getAvailableTransitions(order.status).map(status => ({
        status,
        description: orderStatusService.getStatusDescription(status)
      })),
      canCancel: orderStatusService.canCancelOrder(order)
    };
    
    const statusFlows = await orderStatusService.getStatusFlowHistory(id);
    
    // 构建完整的订单详情响应
    const orderData = order.toJSON();
    const orderDetail = {
      id: orderData.id,
      orderNo: orderData.orderNo,
      customerId: orderData.customerId,
      totalAmount: orderData.totalAmount,
      status: orderData.status,
      remark: orderData.remark,
      createdBy: orderData.createdBy,
      createdAt: orderData.createdAt,
      updatedAt: orderData.updatedAt,
      customer: orderData.customer,
      items: orderData.items,
      histories: orderData.histories,
      statusInfo,
      statusFlows
    };
    
    res.json(success(orderDetail));
  } catch (error) {
    console.error("获取订单详情失败:", error);
    res.status(500).json(serverError("获取订单详情失败"));
  }
}

/**
 * 更新订单信息
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function updateOrder(req, res) {
  const transaction = await Order.sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { items, remark } = req.body;
    
    // 自动获取操作人信息
    const operator = req.headers["x-wx-openid"] || "unknown";
    
    // 检查订单是否存在
    const order = await Order.findByPk(id, { 
      include: [{ 
        model: OrderItem, 
        as: "items",
        order: [["sort_order", "ASC"]]
      }],
      transaction 
    });
    if (!order) {
      await transaction.rollback();
      return res.status(404).json(notFound("订单不存在"));
    }
    
    // 检查订单状态是否允许修改（只有草稿状态可以修改）
    if (order.status !== "draft") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "只有草稿状态的订单可以修改"
      });
    }
    
    const updateData = {};
    const changes = {};
    
    // 更新备注
    if (remark !== undefined && remark !== order.remark) {
      updateData.remark = remark;
      changes.remark = { from: order.remark, to: remark };
    }
    
    // 更新订单项（直接替换所有订单项）
    if (items && items.length > 0) {
      await handleReplaceItems(id, items, changes, transaction);
      
      // 批量更新客户专属价格
      await batchUpdateCustomerPrices(order.customerId, items, transaction);
    }
    
    // 重新计算总金额
    const currentItems = await OrderItem.findAll({
      where: { orderId: id },
      order: [["sort_order", "ASC"]],
      transaction
    });
    
    const totalAmount = currentItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);
    updateData.totalAmount = totalAmount;
    
    if (totalAmount !== parseFloat(order.totalAmount)) {
      changes.totalAmount = { from: order.totalAmount, to: totalAmount };
    }
    
    // 更新订单
    if (Object.keys(updateData).length > 0) {
      await order.update(updateData, { transaction });
      
      // 记录订单历史
      await OrderHistory.create({
        orderId: id,
        action: "order_updated",
        description: "订单信息更新",
        operator,
        changes
      }, { transaction });
    }
    
    await transaction.commit();
    
    res.json(success(null, "订单更新成功"));
  } catch (error) {
    await transaction.rollback();
    console.error("更新订单失败:", error);
    res.status(500).json(serverError("更新订单失败"));
  }
}

/**
 * 处理替换所有订单项
 */
async function handleReplaceItems(orderId, items, changes, transaction) {
  // 删除原有订单项
  await OrderItem.destroy({
    where: { orderId },
    transaction
  });
  
  // 创建新的订单项
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const { productId, quantity, unit, unitPrice } = item;
    
    // 获取商品信息
    const product = await Product.findByPk(productId, { transaction });
    if (!product) {
      throw new Error(`商品不存在: ${productId}`);
    }
    
    const totalPrice = quantity * unitPrice;
    
    await OrderItem.create({
      orderId,
      productId,
      productName: product.name,
      unit,
      quantity,
      unitPrice,
      totalPrice,
      sortOrder: i + 1
    }, { transaction });
  }
  
  changes.items = { from: "原有订单项", to: `${items.length}个新订单项` };
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
    const { status, remark } = req.body;
    
    // 自动获取操作人信息
    const operator = req.headers["x-wx-openid"] || "unknown";
    const role = "admin";
    
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
 * 取消订单
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function cancelOrder(req, res) {
  const transaction = await Order.sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { remark } = req.body;
    
    // 自动获取操作人信息
    const operator = req.headers["x-wx-openid"] || "unknown";
    const role = "admin";
    
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



module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  cancelOrder
};
