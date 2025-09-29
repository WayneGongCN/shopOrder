const { Product } = require("../models");
const { success, pagination, notFound, serverError } = require("../utils/response");
const { Op } = require("sequelize");

/**
 * 创建商品
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function createProduct(req, res) {
  try {
    const { name, globalPrice, unit } = req.body;
    
    const product = await Product.create({
      name,
      globalPrice,
      unit
    });
    
    res.status(201).json(success(product, "商品创建成功"));
  } catch (error) {
    console.error("创建商品失败:", error);
    res.status(500).json(serverError("创建商品失败"));
  }
}

/**
 * 获取商品列表
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function getProducts(req, res) {
  try {
    const { page = 1, pageSize = 20, keyword } = req.query;
    
    const offset = (page - 1) * pageSize;
    const where = {};
    
    // 关键词搜索
    if (keyword) {
      where.name = {
        [Op.like]: `%${keyword}%`
      };
    }
    
    const { count, rows } = await Product.findAndCountAll({
      where,
      limit: parseInt(pageSize),
      offset,
      order: [["created_at", "DESC"]]
    });
    
    res.json(pagination(rows, count, page, pageSize));
  } catch (error) {
    console.error("获取商品列表失败:", error);
    res.status(500).json(serverError("获取商品列表失败"));
  }
}

/**
 * 获取商品详情
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function getProductById(req, res) {
  try {
    const { id } = req.params;
    
    const product = await Product.findByPk(id);
    
    if (!product) {
      return res.status(404).json(notFound("商品不存在"));
    }
    
    res.json(success(product));
  } catch (error) {
    console.error("获取商品详情失败:", error);
    res.status(500).json(serverError("获取商品详情失败"));
  }
}

/**
 * 更新商品
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const { name, globalPrice, unit } = req.body;
    
    const product = await Product.findByPk(id);
    
    if (!product) {
      return res.status(404).json(notFound("商品不存在"));
    }
    
    await product.update({
      name,
      globalPrice,
      unit
    });
    
    res.json(success(product, "商品更新成功"));
  } catch (error) {
    console.error("更新商品失败:", error);
    res.status(500).json(serverError("更新商品失败"));
  }
}

/**
 * 删除商品
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    
    const product = await Product.findByPk(id);
    
    if (!product) {
      return res.status(404).json(notFound("商品不存在"));
    }
    
    await product.destroy();
    
    res.json(success(null, "商品删除成功"));
  } catch (error) {
    console.error("删除商品失败:", error);
    res.status(500).json(serverError("删除商品失败"));
  }
}

/**
 * 获取所有商品（用于下拉选择）
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 */
async function getAllProducts(req, res) {
  try {
    const products = await Product.findAll({
      attributes: ["id", "name", "globalPrice", "unit"],
      order: [["name", "ASC"]]
    });
    
    res.json(success(products));
  } catch (error) {
    console.error("获取所有商品失败:", error);
    res.status(500).json(serverError("获取所有商品失败"));
  }
}

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getAllProducts
};
