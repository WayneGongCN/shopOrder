const { DataTypes } = require("sequelize");
const { sequelize } = require("../../db");

const OrderItem = sequelize.define("OrderItem", {
  id: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
    comment: "订单项ID"
  },
  orderId: {
    type: DataTypes.STRING(36),
    allowNull: false,
    comment: "订单ID",
    field: "order_id"
  },
  productId: {
    type: DataTypes.STRING(36),
    allowNull: false,
    comment: "商品ID",
    field: "product_id"
  },
  productName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: "商品名称（冗余存储）",
    field: "product_name"
  },
  unit: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: "计价单位（冗余存储）"
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: "数量"
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: "单价",
    field: "unit_price"
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: "小计",
    field: "total_price"
  },
  remark: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "备注"
  }
}, {
  tableName: "order_items",
  comment: "订单项表",
  indexes: [
    {
      fields: ["order_id"]
    },
    {
      fields: ["product_id"]
    }
  ]
});

module.exports = OrderItem;
