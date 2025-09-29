const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { init: initDB } = require("./db");
const routes = require("./src/routes");
const { errorHandler, notFoundHandler } = require("./src/middlewares/errorHandler");

const logger = morgan("combined");

const app = express();

// 基础中间件
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: "10mb" }));
app.use(cors());
app.use(logger);

// 静态文件服务
app.use(express.static(path.join(__dirname, "public")));

// 小程序调用，获取微信 Open ID
app.get("/api/wx_openid", (req, res) => {
  if (req.headers["x-wx-source"]) {
    res.json({
      code: 200,
      message: "success",
      data: req.headers["x-wx-openid"] || null,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(400).json({
      code: 400,
      message: "非微信小程序请求",
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

// API路由
app.use("/api", routes);

// 404处理
app.use(notFoundHandler);

// 全局错误处理
app.use(errorHandler);

const port = process.env.PORT || 80;

async function bootstrap() {
  try {
    // 初始化数据库
    await initDB();
    
    // 启动服务器
    app.listen(port, () => {
      console.log(`🚀 服务器启动成功，端口: ${port}`);
      console.log(`📊 健康检查: http://localhost:${port}/api/health`);
      console.log(`📱 微信OpenID: http://localhost:${port}/api/wx_openid`);
    });
  } catch (error) {
    console.error("❌ 服务器启动失败:", error);
    process.exit(1);
  }
}

bootstrap();
