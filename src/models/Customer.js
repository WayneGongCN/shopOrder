const { DataTypes } = require("sequelize");
const { sequelize } = require("../../db");

const Customer = sequelize.define("Customer", {
  id: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
    comment: "客户ID"
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: "客户姓名"
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: "联系电话"
  }
}, {
  tableName: "customers",
  comment: "客户表",
  indexes: [
    {
      fields: ["name"]
    },
    {
      fields: ["phone"]
    }
  ]
});

module.exports = Customer;
