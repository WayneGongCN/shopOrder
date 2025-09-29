const { DataTypes } = require("sequelize");
const { sequelize } = require("../../db");

const OrderStatusFlow = sequelize.define("OrderStatusFlow", {
  id: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
    comment: "状态流转ID"
  },
  order_id: {
    type: DataTypes.STRING(36),
    allowNull: false,
    comment: "订单ID"
  },
  from_status: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: "原状态"
  },
  to_status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: "目标状态"
  },
  operator: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: "操作人"
  },
  remark: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "操作备注"
  }
}, {
  tableName: "order_status_flows",
  comment: "订单状态流程表",
  indexes: [
    {
      fields: ["order_id"]
    },
    {
      fields: ["to_status"]
    },
    {
      fields: ["created_at"]
    }
  ]
});

module.exports = OrderStatusFlow;
