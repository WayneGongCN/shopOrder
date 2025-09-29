const { DataTypes } = require("sequelize");
const { sequelize } = require("../../db");

const Order = sequelize.define("Order", {
  id: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
    comment: "订单ID"
  },
  orderNo: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    comment: "订单号",
    field: "order_no"
  },
  customerId: {
    type: DataTypes.STRING(36),
    allowNull: false,
    comment: "客户ID",
    field: "customer_id"
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: "订单总金额",
    field: "total_amount"
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: "draft",
    comment: "订单状态"
  },
  remark: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "备注信息"
  },
  createdBy: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: "创建人",
    field: "created_by"
  }
}, {
  tableName: "orders",
  comment: "订单表",
  indexes: [
    {
      fields: ["order_no"]
    },
    {
      fields: ["customer_id"]
    },
    {
      fields: ["status"]
    },
    {
      fields: ["created_at"]
    },
    {
      fields: ["created_by"]
    }
  ]
});

module.exports = Order;
