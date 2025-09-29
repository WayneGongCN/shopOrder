const express = require("express");
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  getOrderStatusFlows,
  getCustomerProductPrice
} = require("../controllers/orderController");
const { validateRequest, validateQuery } = require("../middlewares/validation");
const { orderSchema, orderStatusSchema, paginationSchema } = require("../utils/validation");

// 创建订单
router.post("/", validateRequest(orderSchema), createOrder);

// 获取订单列表
router.get("/", validateQuery(paginationSchema), getOrders);

// 获取订单详情
router.get("/:id", getOrderById);

// 更新订单状态
router.put("/:id/status", validateRequest(orderStatusSchema), updateOrderStatus);

// 获取订单状态流转记录
router.get("/:id/status-flows", getOrderStatusFlows);

// 获取客户商品价格（用于订单创建时的价格计算）
router.get("/customer/:customerId/product/:productId/price", getCustomerProductPrice);

module.exports = router;
