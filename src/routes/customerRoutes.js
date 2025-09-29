const express = require("express");
const router = express.Router();
const {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getCustomerPrices,
  setCustomerPrice,
  deleteCustomerPrice,
  getAllCustomers
} = require("../controllers/customerController");
const { validateRequest, validateQuery } = require("../middlewares/validation");
const { customerSchema, paginationSchema, customerPriceSchema } = require("../utils/validation");

// 创建客户
router.post("/", validateRequest(customerSchema), createCustomer);

// 获取客户列表
router.get("/", validateQuery(paginationSchema), getCustomers);

// 获取所有客户（用于下拉选择）
router.get("/all", getAllCustomers);

// 获取客户详情
router.get("/:id", getCustomerById);

// 更新客户
router.put("/:id", validateRequest(customerSchema), updateCustomer);

// 删除客户
router.delete("/:id", deleteCustomer);

// 获取客户专属价格列表
router.get("/:customerId/prices", getCustomerPrices);

// 设置客户专属价格
router.post("/:customerId/prices", validateRequest(customerPriceSchema), setCustomerPrice);

// 删除客户专属价格
router.delete("/:customerId/prices/:priceId", deleteCustomerPrice);

module.exports = router;
