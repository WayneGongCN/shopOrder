const { Sequelize } = require("sequelize");

// 从环境变量中读取数据库配置
const { 
  MYSQL_USERNAME, 
  MYSQL_PASSWORD, 
  MYSQL_ADDRESS = "",
  NODE_ENV = "development"
} = process.env;

const [host, port] = MYSQL_ADDRESS.split(":");

const sequelize = new Sequelize("order_dev", MYSQL_USERNAME, MYSQL_PASSWORD, {
  host,
  port,
  dialect: "mysql",
  logging: NODE_ENV === "development" ? console.log : false,
  pool: {
    max: 20,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    freezeTableName: true,
    underscored: true,
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci"
  },
  timezone: "+00:00" // UTC时区
});

// 测试数据库连接
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log("数据库连接成功");
  } catch (error) {
    console.error("数据库连接失败:", error);
  }
}

// 数据库初始化方法
async function init() {
  await testConnection();
  
  // 导入所有模型以建立关系
  require("./src/models");
  
  // 同步数据库表结构
  await sequelize.sync({ alter: true });
  console.log("数据库表结构已同步");
}

// 导出sequelize实例和初始化方法
module.exports = {
  sequelize,
  init,
};
