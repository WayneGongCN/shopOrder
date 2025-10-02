const express = require("express");
const router = express.Router();
const {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getAllCustomers,
  getCustomerProducts
} = require("../controllers/customerController");
const { validateRequest, validateQuery } = require("../middlewares/validation");
const { customerSchema, paginationSchema } = require("../utils/validation");

// 创建客户
router.post("/", validateRequest(customerSchema), createCustomer);

// 获取客户列表
router.get("/", validateQuery(paginationSchema), getCustomers);

// 获取所有客户（用于下拉选择）
router.get("/all", getAllCustomers);

// 获取客户维度的商品列表（返回客户专属价格）
router.get("/:customerId/products", validateQuery(paginationSchema), getCustomerProducts);

// 获取客户详情
router.get("/:id", getCustomerById);

// 更新客户
router.put("/:id", validateRequest(customerSchema), updateCustomer);

// 删除客户
router.delete("/:id", deleteCustomer);

module.exports = router;
