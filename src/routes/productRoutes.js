const express = require("express");
const router = express.Router();
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getAllProducts
} = require("../controllers/productController");
const { validateRequest, validateQuery } = require("../middlewares/validation");
const { productSchema, paginationSchema } = require("../utils/validation");

// 创建商品
router.post("/", validateRequest(productSchema), createProduct);

// 获取商品列表
router.get("/", validateQuery(paginationSchema), getProducts);

// 获取所有商品（用于下拉选择）
router.get("/all", getAllProducts);

// 获取商品详情
router.get("/:id", getProductById);

// 更新商品
router.put("/:id", validateRequest(productSchema), updateProduct);

// 删除商品
router.delete("/:id", deleteProduct);

module.exports = router;
