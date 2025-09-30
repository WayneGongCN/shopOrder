#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

/**
 * CSV数据清理脚本
 * 用于处理CSV文件中的重复数据，如合并相同商品和客户
 * 
 * 使用方法: 
 *   node scripts/cleanCsvData.js [CSV目录路径] [--config 配置文件路径]
 * 
 * 参数说明:
 *   CSV目录路径 - CSV文件所在目录，默认为 ./csv_export
 *   --config    - 配置文件路径，默认为 ./scripts/cleanConfig.json
 */

class CsvDataCleaner {
  constructor(options = {}) {
    this.csvDir = options.csvDir || path.join(__dirname, '..', 'csv_export');
    this.configPath = options.configPath || path.join(__dirname, 'cleanConfig.json');
    this.config = this.loadConfig();
    
    // 统计信息
    this.stats = {
      customersMerged: 0,
      productsMerged: 0,
      ordersUpdated: 0,
      orderItemsUpdated: 0,
      customerPricesUpdated: 0,
      errors: []
    };
  }

  /**
   * 加载配置文件
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const configContent = fs.readFileSync(this.configPath, 'utf8');
        return JSON.parse(configContent);
      } else {
        // 创建默认配置文件
        const defaultConfig = {
          "customerMerges": [
            {
              "keep": "万老板",
              "merge": ["万总", "万经理"]
            },
            {
              "keep": "丛塘陈老板",
              "merge": ["丛塘陈总", "陈老板"]
            }
          ],
          "productMerges": [
            {
              "keep": "渔竿",
              "merge": ["钓鱼竿", "鱼竿"]
            },
            {
              "keep": "鱼线",
              "merge": ["钓鱼线", "鱼线"]
            }
          ]
        };
        
        fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
        console.log(`✓ 已创建默认配置文件: ${this.configPath}`);
        return defaultConfig;
      }
    } catch (error) {
      console.error(`加载配置文件失败: ${error.message}`);
      return { customerMerges: [], productMerges: [] };
    }
  }

  /**
   * 清理所有CSV数据
   */
  async cleanAllData() {
    try {
      console.log('=== CSV数据清理开始 ===\n');
      
      // 检查CSV目录是否存在
      if (!fs.existsSync(this.csvDir)) {
        throw new Error(`CSV目录不存在: ${this.csvDir}`);
      }
      
      console.log(`CSV目录: ${this.csvDir}`);
      console.log(`配置文件: ${this.configPath}\n`);
      
      // 第一步：清理客户数据
      console.log('=== 第一步：清理客户数据 ===');
      await this.cleanCustomersData();
      
      // 第二步：清理商品数据
      console.log('\n=== 第二步：清理商品数据 ===');
      await this.cleanProductsData();
      
      // 第三步：更新订单数据
      console.log('\n=== 第三步：更新订单数据 ===');
      await this.updateOrdersData();
      
      // 第四步：更新订单项数据
      console.log('\n=== 第四步：更新订单项数据 ===');
      await this.updateOrderItemsData();
      
      // 第五步：更新客户价格数据
      console.log('\n=== 第五步：更新客户价格数据 ===');
      await this.updateCustomerPricesData();
      
      console.log('\n=== 数据清理完成 ===');
      return this.stats;
      
    } catch (error) {
      console.error('清理过程中发生错误:', error.message);
      this.stats.errors.push({
        operation: 'all',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 清理客户数据
   */
  async cleanCustomersData() {
    const customersPath = path.join(this.csvDir, 'customers.csv');
    if (!fs.existsSync(customersPath)) {
      console.log('⚠ customers.csv 文件不存在，跳过');
      return;
    }
    
    let customers = this.parseCsvFile(customersPath);
    const originalCount = customers.length;
    
    // 应用客户合并规则
    customers = this.applyCustomerMerges(customers);
    
    // 写回文件
    this.writeCsvFile(customersPath, customers, ['id', 'name', 'phone']);
    
    const mergedCount = originalCount - customers.length;
    this.stats.customersMerged += mergedCount;
    console.log(`✓ 客户数据清理完成: 原始 ${originalCount} 条，合并后 ${customers.length} 条，合并了 ${mergedCount} 条`);
  }

  /**
   * 清理商品数据
   */
  async cleanProductsData() {
    const productsPath = path.join(this.csvDir, 'products.csv');
    if (!fs.existsSync(productsPath)) {
      console.log('⚠ products.csv 文件不存在，跳过');
      return;
    }
    
    let products = this.parseCsvFile(productsPath);
    const originalCount = products.length;
    
    // 应用商品合并规则
    products = this.applyProductMerges(products);
    
    // 写回文件
    this.writeCsvFile(productsPath, products, ['id', 'name', 'global_price', 'unit']);
    
    const mergedCount = originalCount - products.length;
    this.stats.productsMerged += mergedCount;
    console.log(`✓ 商品数据清理完成: 原始 ${originalCount} 条，合并后 ${products.length} 条，合并了 ${mergedCount} 条`);
  }

  /**
   * 更新订单数据
   */
  async updateOrdersData() {
    const ordersPath = path.join(this.csvDir, 'orders.csv');
    if (!fs.existsSync(ordersPath)) {
      console.log('⚠ orders.csv 文件不存在，跳过');
      return;
    }
    
    let orders = this.parseCsvFile(ordersPath);
    let updatedCount = 0;
    
    // 应用客户名称更新
    orders = orders.map(order => {
      const newCustomerName = this.getMergedCustomerName(order.customer_name);
      if (newCustomerName !== order.customer_name) {
        updatedCount++;
        return { ...order, customer_name: newCustomerName };
      }
      return order;
    });
    
    // 写回文件
    this.writeCsvFile(ordersPath, orders, ['id', 'order_no', 'customer_name', 'total_amount', 'status', 'order_date']);
    
    this.stats.ordersUpdated += updatedCount;
    console.log(`✓ 订单数据更新完成: 更新了 ${updatedCount} 条记录`);
  }

  /**
   * 更新订单项数据
   */
  async updateOrderItemsData() {
    const orderItemsPath = path.join(this.csvDir, 'order_items.csv');
    if (!fs.existsSync(orderItemsPath)) {
      console.log('⚠ order_items.csv 文件不存在，跳过');
      return;
    }
    
    let orderItems = this.parseCsvFile(orderItemsPath);
    let updatedCount = 0;
    
    // 应用商品名称更新
    orderItems = orderItems.map(item => {
      const newProductName = this.getMergedProductName(item.product_name);
      if (newProductName !== item.product_name) {
        updatedCount++;
        return { ...item, product_name: newProductName };
      }
      return item;
    });
    
    // 写回文件
    this.writeCsvFile(orderItemsPath, orderItems, ['id', 'order_no', 'product_name', 'unit', 'quantity', 'unit_price', 'total_price', 'remark']);
    
    this.stats.orderItemsUpdated += updatedCount;
    console.log(`✓ 订单项数据更新完成: 更新了 ${updatedCount} 条记录`);
  }

  /**
   * 更新客户价格数据
   */
  async updateCustomerPricesData() {
    const customerPricesPath = path.join(this.csvDir, 'customer_prices.csv');
    if (!fs.existsSync(customerPricesPath)) {
      console.log('⚠ customer_prices.csv 文件不存在，跳过');
      return;
    }
    
    let customerPrices = this.parseCsvFile(customerPricesPath);
    let updatedCount = 0;
    
    // 应用客户和商品名称更新
    customerPrices = customerPrices.map(price => {
      const newCustomerName = this.getMergedCustomerName(price.customer_name);
      const newProductName = this.getMergedProductName(price.product_name);
      let updated = false;
      
      const updatedPrice = { ...price };
      if (newCustomerName !== price.customer_name) {
        updatedPrice.customer_name = newCustomerName;
        updated = true;
      }
      if (newProductName !== price.product_name) {
        updatedPrice.product_name = newProductName;
        updated = true;
      }
      
      if (updated) {
        updatedCount++;
      }
      return updatedPrice;
    });
    
    // 写回文件
    this.writeCsvFile(customerPricesPath, customerPrices, ['id', 'customer_name', 'product_name', 'price']);
    
    this.stats.customerPricesUpdated += updatedCount;
    console.log(`✓ 客户价格数据更新完成: 更新了 ${updatedCount} 条记录`);
  }

  /**
   * 应用客户合并规则
   */
  applyCustomerMerges(customers) {
    const mergeMap = new Map();
    
    // 构建合并映射
    this.config.customerMerges.forEach(merge => {
      mergeMap.set(merge.keep, merge.keep);
      merge.merge.forEach(name => {
        mergeMap.set(name, merge.keep);
      });
    });
    
    // 应用合并规则
    const mergedCustomers = new Map();
    customers.forEach(customer => {
      const mergedName = mergeMap.get(customer.name) || customer.name;
      
      if (mergedCustomers.has(mergedName)) {
        // 合并客户信息（保留更多信息的记录）
        const existing = mergedCustomers.get(mergedName);
        if (!existing.phone && customer.phone) {
          existing.phone = customer.phone;
        }
      } else {
        mergedCustomers.set(mergedName, { ...customer, name: mergedName });
      }
    });
    
    return Array.from(mergedCustomers.values());
  }

  /**
   * 应用商品合并规则
   */
  applyProductMerges(products) {
    const mergeMap = new Map();
    
    // 构建合并映射
    this.config.productMerges.forEach(merge => {
      mergeMap.set(merge.keep, merge.keep);
      merge.merge.forEach(name => {
        mergeMap.set(name, merge.keep);
      });
    });
    
    // 应用合并规则
    const mergedProducts = new Map();
    products.forEach(product => {
      const mergedName = mergeMap.get(product.name) || product.name;
      
      if (mergedProducts.has(mergedName)) {
        // 合并商品信息（保留价格更高的记录）
        const existing = mergedProducts.get(mergedName);
        const existingPrice = parseFloat(existing.global_price);
        const currentPrice = parseFloat(product.global_price);
        
        if (currentPrice > existingPrice) {
          existing.global_price = product.global_price;
          existing.unit = product.unit;
        }
      } else {
        mergedProducts.set(mergedName, { ...product, name: mergedName });
      }
    });
    
    return Array.from(mergedProducts.values());
  }

  /**
   * 获取合并后的客户名称
   */
  getMergedCustomerName(originalName) {
    for (const merge of this.config.customerMerges) {
      if (merge.merge.includes(originalName)) {
        return merge.keep;
      }
    }
    return originalName;
  }

  /**
   * 获取合并后的商品名称
   */
  getMergedProductName(originalName) {
    for (const merge of this.config.productMerges) {
      if (merge.merge.includes(originalName)) {
        return merge.keep;
      }
    }
    return originalName;
  }

  /**
   * 解析CSV文件
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
   * 写入CSV文件
   */
  writeCsvFile(filePath, data, headers) {
    let csvContent = headers.join(',') + '\n';
    
    data.forEach(row => {
      const values = headers.map(header => `"${row[header] || ''}"`);
      csvContent += values.join(',') + '\n';
    });
    
    fs.writeFileSync(filePath, csvContent, 'utf8');
  }
}

async function main() {
  try {
    // 解析命令行参数
    const args = process.argv.slice(2);
    let csvDir = path.join(__dirname, '..', 'csv_export');
    let configPath = path.join(__dirname, 'cleanConfig.json');
    
    // 解析参数
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--config' && i + 1 < args.length) {
        configPath = args[i + 1];
        i++; // 跳过下一个参数
      } else if (!arg.startsWith('--')) {
        csvDir = arg;
      }
    }
    
    console.log(`CSV目录: ${csvDir}`);
    console.log(`配置文件: ${configPath}\n`);
    
    // 创建清理器实例
    const cleaner = new CsvDataCleaner({ csvDir, configPath });
    
    // 执行数据清理
    const stats = await cleaner.cleanAllData();
    
    // 输出最终统计
    console.log('\n=== 清理统计 ===');
    console.log(`客户合并: ${stats.customersMerged} 条`);
    console.log(`商品合并: ${stats.productsMerged} 条`);
    console.log(`订单更新: ${stats.ordersUpdated} 条`);
    console.log(`订单项更新: ${stats.orderItemsUpdated} 条`);
    console.log(`客户价格更新: ${stats.customerPricesUpdated} 条`);
    
    if (stats.errors.length > 0) {
      console.log(`错误数量: ${stats.errors.length}`);
      console.log('\n错误详情:');
      stats.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.operation}: ${error.error}`);
      });
    }
    
    console.log('\n✅ 数据清理完成！');
    
  } catch (error) {
    console.error('\n清理过程中发生错误:', error.message);
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

module.exports = { CsvDataCleaner, main };
