const express = require("express");
const router = express.Router();

// 导入各个模块的路由
const productRoutes = require("./productRoutes");
const customerRoutes = require("./customerRoutes");
const orderRoutes = require("./orderRoutes");
const analyticsRoutes = require("./analyticsRoutes");

// 注册路由
router.use("/products", productRoutes);
router.use("/customers", customerRoutes);
router.use("/orders", orderRoutes);
router.use("/analytics", analyticsRoutes);

// 健康检查接口
router.get("/health", (req, res) => {
  res.json({
    code: 200,
    message: "服务运行正常",
    data: {
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
  });
});

module.exports = router;
