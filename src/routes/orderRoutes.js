const express = require("express");
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  cancelOrder
} = require("../controllers/orderController");
const { validateRequest, validateQuery } = require("../middlewares/validation");
const { orderSchema, orderUpdateSchema, orderStatusSchema, paginationSchema } = require("../utils/validation");
const StatusValidationMiddleware = require("../middlewares/statusValidation");

// 创建订单
router.post("/", validateRequest(orderSchema), createOrder);

// 获取订单列表
router.get("/", validateQuery(paginationSchema), getOrders);

// 获取订单详情
router.get("/:id", getOrderById);

// 更新订单信息
router.put("/:id", validateRequest(orderUpdateSchema), updateOrder);

// 更新订单状态
router.put("/:id/status", 
  validateRequest(orderStatusSchema), 
  StatusValidationMiddleware.validateStatusTransition, 
  updateOrderStatus
);


// 取消订单
router.put("/:id/cancel", 
  StatusValidationMiddleware.validateOrderCancellation, 
  cancelOrder
);

module.exports = router;
