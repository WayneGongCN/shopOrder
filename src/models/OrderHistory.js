const { DataTypes } = require("sequelize");
const { sequelize } = require("../../db");

const OrderHistory = sequelize.define("OrderHistory", {
  id: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
    comment: "历史记录ID"
  },
  order_id: {
    type: DataTypes.STRING(36),
    allowNull: false,
    comment: "订单ID"
  },
  action: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: "操作类型"
  },
  description: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: "操作描述"
  },
  operator: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: "操作人"
  },
  changes: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: "变更详情"
  }
}, {
  tableName: "order_histories",
  comment: "订单历史记录表",
  indexes: [
    {
      fields: ["order_id"]
    },
    {
      fields: ["action"]
    },
    {
      fields: ["created_at"]
    }
  ]
});

module.exports = OrderHistory;
