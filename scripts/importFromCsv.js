#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { init } = require('./dbConfig');
const models = require('../src/models');
const { v4: uuidv4 } = require('uuid');

/**
 * CSV数据导入到MySQL脚本
 * 将CSV文件导入到MySQL数据库
 * 
 * 使用方法: 
 *   node scripts/importFromCsv.js [CSV目录路径]
 * 
 * 参数说明:
 *   CSV目录路径 - CSV文件所在目录，默认为 ./csv_export
 */

class CsvImporter {
  constructor(options = {}) {
    this.csvDir = options.csvDir || path.join(__dirname, '..', 'csv_export');
    
    // 批量插入配置
    this.batchSize = 1000;
    
    // 统计信息
    this.stats = {
      customersCreated: 0,
      customersUpdated: 0,
      productsCreated: 0,
      productsUpdated: 0,
      ordersCreated: 0,
      ordersSkipped: 0,
      customerPricesCreated: 0,
      customerPricesUpdated: 0,
      errors: []
    };
    
    // 数据缓存
    this.cache = {
      customers: new Map(), // name -> customerId
      products: new Map(),  // name -> productId
      existingOrders: new Set() // orderNo -> true
    };
  }

  /**
   * 从CSV导入所有数据到MySQL
   * @param {string} csvDir - CSV文件目录
   * @returns {Object} 导入统计信息
   */
  async importAllData(csvDir) {
    try {
      console.log('=== CSV数据导入到MySQL ===\n');
      
      // 检查CSV目录是否存在
      if (!fs.existsSync(csvDir)) {
        throw new Error(`CSV目录不存在: ${csvDir}`);
      }
      
      // 第一步：加载已存在的数据库数据
      console.log('=== 第一步：加载已存在的数据库数据 ===');
      await this.loadExistingData();
      
      // 第二步：读取CSV数据
      console.log('\n=== 第二步：读取CSV数据 ===');
      const csvData = await this.readCsvData(csvDir);
      
      // 第三步：本地数据处理和去重
      console.log('\n=== 第三步：本地数据处理和去重 ===');
      const processedData = this.processDataLocally(csvData);
      
      // 第四步：批量插入所有数据
      console.log('\n=== 第四步：批量插入所有数据 ===');
      await this.batchInsertAllData(processedData);
      
      console.log('\n=== 导入完成 ===');
      return this.stats;
      
    } catch (error) {
      console.error('导入过程中发生错误:', error.message);
      this.stats.errors.push({
        file: 'all',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 加载已存在的数据库数据
   */
  async loadExistingData() {
    console.log('加载已存在的数据库数据...');
    
    // 获取已存在的客户
    const existingCustomers = await models.Customer.findAll({
      attributes: ['id', 'name'],
      raw: true
    });
    existingCustomers.forEach(customer => {
      this.cache.customers.set(customer.name, customer.id);
    });
    console.log(`✓ 已加载 ${existingCustomers.length} 个客户`);
    
    // 获取已存在的商品
    const existingProducts = await models.Product.findAll({
      attributes: ['id', 'name'],
      raw: true
    });
    existingProducts.forEach(product => {
      this.cache.products.set(product.name, product.id);
    });
    console.log(`✓ 已加载 ${existingProducts.length} 个商品`);
    
    // 获取已存在的订单号
    const existingOrders = await models.Order.findAll({
      attributes: ['orderNo'],
      raw: true
    });
    existingOrders.forEach(order => {
      this.cache.existingOrders.add(order.orderNo);
    });
    console.log(`✓ 已加载 ${existingOrders.length} 个已存在订单`);
  }

  /**
   * 读取CSV数据
   * @param {string} csvDir - CSV文件目录
   * @returns {Object} CSV数据
   */
  async readCsvData(csvDir) {
    const csvData = {
      customers: [],
      products: [],
      orders: [],
      orderItems: [],
      customerPrices: []
    };
    
    // 读取客户数据
    const customersPath = path.join(csvDir, 'customers.csv');
    if (fs.existsSync(customersPath)) {
      csvData.customers = this.parseCsvFile(customersPath);
      console.log(`✓ 读取客户数据: ${csvData.customers.length}条`);
    }
    
    // 读取商品数据
    const productsPath = path.join(csvDir, 'products.csv');
    if (fs.existsSync(productsPath)) {
      csvData.products = this.parseCsvFile(productsPath);
      console.log(`✓ 读取商品数据: ${csvData.products.length}条`);
    }
    
    // 跳过订单数据导入
    console.log(`⚠ 跳过订单数据导入`);
    
    // 跳过订单项数据导入
    console.log(`⚠ 跳过订单项数据导入`);
    
    // 读取客户价格数据
    const customerPricesPath = path.join(csvDir, 'customer_prices.csv');
    if (fs.existsSync(customerPricesPath)) {
      csvData.customerPrices = this.parseCsvFile(customerPricesPath);
      console.log(`✓ 读取客户价格数据: ${csvData.customerPrices.length}条`);
    }
    
    return csvData;
  }

  /**
   * 解析CSV文件
   * @param {string} filePath - CSV文件路径
   * @returns {Array} 解析后的数据
   */
  parseCsvFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      const row = {};
      
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j] || '';
      }
      
      data.push(row);
    }
    
    return data;
  }

  /**
   * 解析CSV行
   * @param {string} line - CSV行
   * @returns {Array} 解析后的值
   */
  parseCsvLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  }

  /**
   * 本地数据处理和去重
   * @param {Object} csvData - CSV数据
   * @returns {Object} 处理后的数据
   */
  processDataLocally(csvData) {
    console.log('本地数据处理和去重...');
    
    const processedData = {
      newCustomers: [],
      updatedCustomers: [],
      newProducts: [],
      updatedProducts: [],
      newOrders: [],
      newOrderItems: [],
      newCustomerPrices: [],
      updatedCustomerPrices: []
    };
    
    // 处理客户数据
    csvData.customers.forEach(customer => {
      if (this.cache.customers.has(customer.name)) {
        processedData.updatedCustomers.push(customer);
      } else {
        processedData.newCustomers.push(customer);
      }
    });
    
    // 处理商品数据
    csvData.products.forEach(product => {
      if (this.cache.products.has(product.name)) {
        processedData.updatedProducts.push(product);
      } else {
        processedData.newProducts.push(product);
      }
    });
    
    // 跳过订单数据处理
    console.log('⚠ 跳过订单数据处理');
    
    // 跳过订单项数据处理
    console.log('⚠ 跳过订单项数据处理');
    
    // 处理客户专属价格
    csvData.customerPrices.forEach(price => {
      processedData.newCustomerPrices.push(price);
    });
    
    console.log(`✓ 数据处理完成:`);
    console.log(`  - 新客户: ${processedData.newCustomers.length}`);
    console.log(`  - 更新客户: ${processedData.updatedCustomers.length}`);
    console.log(`  - 新商品: ${processedData.newProducts.length}`);
    console.log(`  - 更新商品: ${processedData.updatedProducts.length}`);
    console.log(`  - 新订单: ${processedData.newOrders.length}`);
    console.log(`  - 跳过订单: ${this.stats.ordersSkipped}`);
    console.log(`  - 新订单项: ${processedData.newOrderItems.length}`);
    console.log(`  - 客户价格: ${processedData.newCustomerPrices.length}`);
    
    return processedData;
  }


  /**
   * 批量插入所有数据
   * @param {Object} processedData - 处理后的数据
   */
  async batchInsertAllData(processedData) {
    // 第一步：批量插入新客户
    if (processedData.newCustomers.length > 0) {
      console.log(`批量插入 ${processedData.newCustomers.length} 个新客户...`);
      const customerData = processedData.newCustomers.map(customer => ({
        id: uuidv4(),
        name: customer.name,
        phone: customer.phone || null
      }));
      await this.batchInsert(models.Customer, customerData);
      this.stats.customersCreated += customerData.length;
      
      // 更新客户缓存
      customerData.forEach(customer => {
        this.cache.customers.set(customer.name, customer.id);
      });
    }
    
    // 第二步：批量插入新商品
    if (processedData.newProducts.length > 0) {
      console.log(`批量插入 ${processedData.newProducts.length} 个新商品...`);
      const productData = processedData.newProducts.map(product => ({
        id: uuidv4(),
        name: product.name,
        globalPrice: parseFloat(product.global_price) || 0,
        unit: product.unit || '个'
      }));
      await this.batchInsert(models.Product, productData);
      this.stats.productsCreated += productData.length;
      
      // 更新商品缓存
      productData.forEach(product => {
        this.cache.products.set(product.name, product.id);
      });
    }
    
    // 第三步：批量更新商品价格
    if (processedData.updatedProducts.length > 0) {
      console.log(`批量更新 ${processedData.updatedProducts.length} 个商品价格...`);
      await this.batchUpdateProductPrices(processedData.updatedProducts);
      this.stats.productsUpdated += processedData.updatedProducts.length;
    }
    
    // 跳过订单批量插入
    console.log('⚠ 跳过订单批量插入');
    
    // 跳过订单项批量插入
    console.log('⚠ 跳过订单项批量插入');
    
    // 第六步：批量插入客户专属价格
    if (processedData.newCustomerPrices.length > 0) {
      console.log(`批量插入 ${processedData.newCustomerPrices.length} 个客户专属价格...`);
      await this.batchInsertCustomerPrices(processedData.newCustomerPrices);
      this.stats.customerPricesCreated += processedData.newCustomerPrices.length;
    }
    
    console.log('\n✓ 所有数据批量插入完成');
  }

  /**
   * 批量插入数据
   * @param {Object} Model - Sequelize模型
   * @param {Array} data - 数据数组
   */
  async batchInsert(Model, data) {
    for (let i = 0; i < data.length; i += this.batchSize) {
      const batch = data.slice(i, i + this.batchSize);
      await Model.bulkCreate(batch, {
        ignoreDuplicates: true,
        validate: false
      });
    }
  }

  /**
   * 批量更新商品价格
   * @param {Array} products - 商品数据
   */
  async batchUpdateProductPrices(products) {
    const { sequelize } = require('../db');
    
    for (let i = 0; i < products.length; i += this.batchSize) {
      const batch = products.slice(i, i + this.batchSize);
      
      for (const product of batch) {
        await sequelize.query(
          'UPDATE products SET global_price = :price, unit = :unit, updated_at = NOW() WHERE name = :name',
          {
            replacements: {
              price: parseFloat(product.global_price),
              unit: product.unit,
              name: product.name
            }
          }
        );
      }
    }
  }

  /**
   * 批量插入客户价格
   * @param {Array} customerPrices - 客户价格数据
   */
  async batchInsertCustomerPrices(customerPrices) {
    // 准备客户价格数据
    const customerPriceData = [];
    
    customerPrices.forEach(price => {
      const customerId = this.cache.customers.get(price.customer_name);
      const productId = this.cache.products.get(price.product_name);
      
      if (customerId && productId) {
        customerPriceData.push({
          id: uuidv4(),
          customerId: customerId,
          productId: productId,
          price: parseFloat(price.price),
          createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        });
      }
    });
    
    // 使用原生SQL进行批量upsert
    const { sequelize } = require('../db');
    
    for (let i = 0; i < customerPriceData.length; i += this.batchSize) {
      const batch = customerPriceData.slice(i, i + this.batchSize);
      
      const values = batch.map(item => 
        `('${item.id}', '${item.customerId}', '${item.productId}', ${item.price}, '${item.createdAt}', '${item.updatedAt}')`
      ).join(',');
      
      const sql = `
        INSERT INTO customer_prices (id, customer_id, product_id, price, created_at, updated_at)
        VALUES ${values}
        ON DUPLICATE KEY UPDATE
        price = VALUES(price),
        updated_at = VALUES(updated_at)
      `;
      
      await sequelize.query(sql);
    }
  }
}

async function main() {
  try {
    // 解析命令行参数
    const args = process.argv.slice(2);
    let csvDir = path.join(__dirname, '..', 'csv_export');
    
    // 解析参数
    if (args.length > 0) {
      csvDir = args[0];
    }
    
    console.log(`CSV目录: ${csvDir}\n`);
    
    // 初始化数据库连接
    console.log('正在连接数据库...');
    await init();
    console.log('数据库连接成功\n');
    
    // 创建导入器实例
    const importer = new CsvImporter({ csvDir });
    
    // 执行导入
    const stats = await importer.importAllData(csvDir);
    
    // 输出最终统计
    console.log('\n=== 最终统计 ===');
    console.log(`客户处理: 创建 ${stats.customersCreated}, 更新 ${stats.customersUpdated}`);
    console.log(`商品处理: 创建 ${stats.productsCreated}, 更新 ${stats.productsUpdated}`);
    console.log(`订单处理: 创建 ${stats.ordersCreated}, 跳过 ${stats.ordersSkipped}`);
    console.log(`客户价格: 创建/更新 ${stats.customerPricesCreated}`);
    
    
    if (stats.errors.length > 0) {
      console.log(`错误数量: ${stats.errors.length}`);
      console.log('\n错误详情:');
      stats.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.file}: ${error.error}`);
      });
    }
    
    console.log(`\n导入完成！`);
    
  } catch (error) {
    console.error('\n导入过程中发生错误:', error.message);
    console.error('错误堆栈:', error.stack);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = { CsvImporter, main };
