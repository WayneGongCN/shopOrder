const express = require("express");
const router = express.Router();
const {
  getSalesOverview,
  getSalesTrend,
  getTopProducts,
  getCustomerAnalytics,
  getOrderStatusStats
} = require("../controllers/analyticsController");

// 销售概览
router.get("/overview", getSalesOverview);

// 销售趋势
router.get("/trend", getSalesTrend);

// 热销商品排行
router.get("/top-products", getTopProducts);

// 客户分析
router.get("/customers", getCustomerAnalytics);

// 订单状态统计
router.get("/order-status", getOrderStatusStats);

module.exports = router;
