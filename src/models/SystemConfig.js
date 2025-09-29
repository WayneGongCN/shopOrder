const { DataTypes } = require("sequelize");
const { sequelize } = require("../../db");

const SystemConfig = sequelize.define("SystemConfig", {
  id: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
    comment: "配置ID"
  },
  config_key: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: "配置键"
  },
  config_value: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "配置值"
  },
  description: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: "配置描述"
  }
}, {
  tableName: "system_configs",
  comment: "系统配置表",
  indexes: [
    {
      fields: ["config_key"]
    }
  ]
});

module.exports = SystemConfig;
