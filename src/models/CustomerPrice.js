const { DataTypes } = require("sequelize");
const { sequelize } = require("../../db");

const CustomerPrice = sequelize.define("CustomerPrice", {
  id: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
    comment: "客户专属价格ID"
  },
  customer_id: {
    type: DataTypes.STRING(36),
    allowNull: false,
    comment: "客户ID"
  },
  product_id: {
    type: DataTypes.STRING(36),
    allowNull: false,
    comment: "商品ID"
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: "专属价格"
  }
}, {
  tableName: "customer_prices",
  comment: "客户专属价格表",
  indexes: [
    {
      unique: true,
      fields: ["customer_id", "product_id"]
    },
    {
      fields: ["customer_id"]
    },
    {
      fields: ["product_id"]
    }
  ]
});

module.exports = CustomerPrice;
