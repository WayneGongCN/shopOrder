const { DataTypes } = require("sequelize");
const { sequelize } = require("../../db");

const Product = sequelize.define("Product", {
  id: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
    comment: "商品ID"
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: "商品名称"
  },
  globalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: "默认售价",
    field: "global_price"
  },
  unit: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: "个",
    comment: "计价单位"
  }
}, {
  tableName: "products",
  comment: "商品表",
  indexes: [
    {
      fields: ["name"]
    }
  ]
});

module.exports = Product;
