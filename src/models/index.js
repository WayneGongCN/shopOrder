const Product = require("./Product");
const Customer = require("./Customer");
const Order = require("./Order");
const OrderItem = require("./OrderItem");
const CustomerPrice = require("./CustomerPrice");
const OrderStatusFlow = require("./OrderStatusFlow");
const OrderHistory = require("./OrderHistory");
const SystemConfig = require("./SystemConfig");

// 定义模型关系
// 客户与订单：一对多
Customer.hasMany(Order, { foreignKey: "customer_id", as: "orders" });
Order.belongsTo(Customer, { foreignKey: "customer_id", as: "customer" });

// 订单与订单项：一对多
Order.hasMany(OrderItem, { foreignKey: "order_id", as: "items" });
OrderItem.belongsTo(Order, { foreignKey: "order_id", as: "order" });

// 商品与订单项：一对多
Product.hasMany(OrderItem, { foreignKey: "product_id", as: "orderItems" });
OrderItem.belongsTo(Product, { foreignKey: "product_id", as: "product" });

// 客户与专属价格：一对多
Customer.hasMany(CustomerPrice, { foreignKey: "customer_id", as: "prices" });
CustomerPrice.belongsTo(Customer, { foreignKey: "customer_id", as: "customer" });

// 商品与专属价格：一对多
Product.hasMany(CustomerPrice, { foreignKey: "product_id", as: "customerPrices" });
CustomerPrice.belongsTo(Product, { foreignKey: "product_id", as: "product" });

// 订单与状态流转：一对多
Order.hasMany(OrderStatusFlow, { foreignKey: "order_id", as: "statusFlows" });
OrderStatusFlow.belongsTo(Order, { foreignKey: "order_id", as: "order" });

// 订单与历史记录：一对多
Order.hasMany(OrderHistory, { foreignKey: "order_id", as: "histories" });
OrderHistory.belongsTo(Order, { foreignKey: "order_id", as: "order" });

module.exports = {
  Product,
  Customer,
  Order,
  OrderItem,
  CustomerPrice,
  OrderStatusFlow,
  OrderHistory,
  SystemConfig
};
