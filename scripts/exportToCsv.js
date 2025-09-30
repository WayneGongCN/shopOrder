#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const ExcelImporter = require('./excelImporter');

/**
 * Excel数据导出到CSV脚本
 * 将archive目录下的Excel文件解析并导出为CSV格式
 * 
 * 使用方法: 
 *   node scripts/exportToCsv.js [archive目录路径] [输出目录路径]
 * 
 * 参数说明:
 *   archive目录路径 - Excel文件所在目录，默认为 ./archive
 *   输出目录路径   - CSV文件输出目录，默认为 ./csv_export
 */

class CsvExporter {
  constructor(options = {}) {
    this.excelImporter = new ExcelImporter();
    this.outputDir = options.outputDir || path.join(__dirname, '..', 'csv_export');
    
    // 数据收集
    this.customers = new Map(); // name -> { name, phone }
    this.products = new Map();  // name -> { name, unit, globalPrice }
    this.orders = [];           // 所有订单数据
    this.customerPrices = new Map(); // `${customerName}_${productName}` -> { customerName, productName, price }
    
    // 统计信息
    this.stats = {
      filesProcessed: 0,
      customersFound: 0,
      productsFound: 0,
      ordersFound: 0,
      customerPricesFound: 0,
      errors: []
    };
  }

  /**
   * 导出所有Excel数据到CSV
   * @param {string} archiveDir - archive目录路径
   * @returns {Object} 导出统计信息
   */
  async exportAllData(archiveDir) {
    try {
      console.log('=== Excel数据导出到CSV ===\n');
      
      // 获取所有Excel文件
      const excelFiles = this.excelImporter.getAllExcelFiles(archiveDir);
      console.log(`找到 ${excelFiles.length} 个Excel文件\n`);
      
      if (excelFiles.length === 0) {
        console.log('未找到Excel文件，导出结束');
        return this.stats;
      }
      
      // 第一步：分析所有Excel文件
      console.log('=== 第一步：分析Excel文件 ===');
      await this.analyzeAllFiles(excelFiles);
      
      // 第二步：生成CSV文件
      console.log('\n=== 第二步：生成CSV文件 ===');
      await this.generateCsvFiles();
      
      console.log('\n=== 导出完成 ===');
      return this.stats;
      
    } catch (error) {
      console.error('导出过程中发生错误:', error.message);
      this.stats.errors.push({
        file: 'all',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 分析所有Excel文件
   * @param {Array} excelFiles - Excel文件路径数组
   */
  async analyzeAllFiles(excelFiles) {
    for (let i = 0; i < excelFiles.length; i++) {
      const filePath = excelFiles[i];
      const fileName = path.basename(filePath, '.xls');
      
      try {
        console.log(`分析文件 ${i + 1}/${excelFiles.length}: ${fileName}`);
        
        const result = this.excelImporter.parseExcelFile(filePath);
        
        // 收集客户信息
        this.customers.set(result.customerName, {
          name: result.customerName,
          phone: null
        });
        
        // 收集商品信息和客户专属价格
        result.orders.forEach(order => {
          // 收集商品信息（如果已存在则更新价格）
          const existingProduct = this.products.get(order.productName);
          if (!existingProduct || existingProduct.globalPrice !== order.unitPrice) {
            this.products.set(order.productName, {
              name: order.productName,
              unit: order.unit,
              globalPrice: order.unitPrice
            });
          }
          
          // 收集客户专属价格（取最新的价格）
          const priceKey = `${result.customerName}_${order.productName}`;
          this.customerPrices.set(priceKey, {
            customerName: result.customerName,
            productName: order.productName,
            price: order.unitPrice
          });
        });
        
        // 收集订单数据
        const orderGroups = new Map();
        result.orders.forEach(orderItem => {
          if (!orderGroups.has(orderItem.orderNo)) {
            orderGroups.set(orderItem.orderNo, {
              customerName: result.customerName,
              orderNo: orderItem.orderNo,
              orderDate: orderItem.orderDate,
              items: []
            });
          }
          orderGroups.get(orderItem.orderNo).items.push(orderItem);
        });
        
        // 添加到订单列表
        orderGroups.forEach(order => {
          this.orders.push(order);
        });
        
        this.stats.filesProcessed++;
        
      } catch (error) {
        console.error(`分析文件失败: ${fileName} - ${error.message}`);
        this.stats.errors.push({
          file: fileName,
          error: error.message
        });
      }
    }
    
    // 更新统计信息
    this.stats.customersFound = this.customers.size;
    this.stats.productsFound = this.products.size;
    this.stats.ordersFound = this.orders.length;
    this.stats.customerPricesFound = this.customerPrices.size;
    
    console.log(`\n分析完成:`);
    console.log(`- 处理文件: ${this.stats.filesProcessed}/${excelFiles.length}`);
    console.log(`- 客户数量: ${this.stats.customersFound}`);
    console.log(`- 商品数量: ${this.stats.productsFound}`);
    console.log(`- 订单数量: ${this.stats.ordersFound}`);
    console.log(`- 客户价格数量: ${this.stats.customerPricesFound}`);
  }

  /**
   * 生成CSV文件
   */
  async generateCsvFiles() {
    // 确保输出目录存在
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log(`✓ 创建输出目录: ${this.outputDir}`);
    }
    
    // 导出客户数据
    await this.exportCustomersToCsv();
    
    // 导出商品数据
    await this.exportProductsToCsv();
    
    // 导出客户价格数据
    await this.exportCustomerPricesToCsv();
    
    // 导出订单数据
    await this.exportOrdersToCsv();
    
    console.log(`\n✓ 所有CSV文件已生成到: ${this.outputDir}`);
  }

  /**
   * 修复被分割的商品名称
   * @param {string} name - 原始商品名称
   * @returns {string} 修复后的商品名称
   */
  fixSplitProductNames(name) {
    // 使用正则表达式去除所有空格
    return name.replace(/\s+/g, '');
  }

  /**
   * 导出客户数据到CSV
   */
  async exportCustomersToCsv() {
    const csvPath = path.join(this.outputDir, 'customers.csv');
    let csvContent = 'id,name,phone\n';
    
    let id = 1;
    for (const customer of this.customers.values()) {
      // 清理客户名称：去除换行符、制表符，去除首尾空格，压缩中间多个空格为单个空格
      const cleanName = customer.name
        .replace(/[\r\n\t]/g, ' ')           // 替换换行符、制表符为空格
        .replace(/\s+/g, ' ')                // 压缩多个连续空格为单个空格
        .trim();                             // 去除首尾空格
      
      // 清理电话号码：同样的处理方式
      const cleanPhone = (customer.phone || '')
        .replace(/[\r\n\t]/g, ' ')           // 替换换行符、制表符为空格
        .replace(/\s+/g, ' ')                // 压缩多个连续空格为单个空格
        .trim();                             // 去除首尾空格
      
      csvContent += `${id},"${cleanName}","${cleanPhone}"\n`;
      id++;
    }
    
    fs.writeFileSync(csvPath, csvContent, 'utf8');
    console.log(`✓ 客户数据已导出: ${csvPath} (${this.customers.size}条记录)`);
  }

  /**
   * 导出商品数据到CSV
   */
  async exportProductsToCsv() {
    const csvPath = path.join(this.outputDir, 'products.csv');
    let csvContent = 'id,name,global_price,unit\n';
    
    let id = 1;
    for (const product of this.products.values()) {
      // 清理商品名称：去除换行符、制表符，去除首尾空格，压缩中间多个空格为单个空格
      let cleanName = product.name
        .replace(/[\r\n\t]/g, ' ')           // 替换换行符、制表符为空格
        .replace(/\s+/g, ' ')                // 压缩多个连续空格为单个空格
        .trim();                             // 去除首尾空格
      
      // 特殊处理：修复被分割的商品名称
      cleanName = this.fixSplitProductNames(cleanName);
      
      // 清理单位：同样的处理方式
      const cleanUnit = (product.unit || '个')
        .replace(/[\r\n\t]/g, ' ')           // 替换换行符、制表符为空格
        .replace(/\s+/g, ' ')                // 压缩多个连续空格为单个空格
        .trim() || '个';                     // 去除首尾空格，默认值为'个'
      
      csvContent += `${id},"${cleanName}",${product.globalPrice},"${cleanUnit}"\n`;
      id++;
    }
    
    fs.writeFileSync(csvPath, csvContent, 'utf8');
    console.log(`✓ 商品数据已导出: ${csvPath} (${this.products.size}条记录)`);
  }

  /**
   * 导出客户价格数据到CSV
   */
  async exportCustomerPricesToCsv() {
    const csvPath = path.join(this.outputDir, 'customer_prices.csv');
    let csvContent = 'id,customer_name,product_name,price\n';
    
    let id = 1;
    for (const priceData of this.customerPrices.values()) {
      // 清理客户名称和商品名称
      const cleanCustomerName = priceData.customerName
        .replace(/[\r\n\t]/g, ' ')           // 替换换行符、制表符为空格
        .replace(/\s+/g, ' ')                // 压缩多个连续空格为单个空格
        .trim();                             // 去除首尾空格
      
      const cleanProductName = priceData.productName
        .replace(/[\r\n\t]/g, ' ')           // 替换换行符、制表符为空格
        .replace(/\s+/g, ' ')                // 压缩多个连续空格为单个空格
        .trim();                             // 去除首尾空格
      
      csvContent += `${id},"${cleanCustomerName}","${cleanProductName}",${priceData.price}\n`;
      id++;
    }
    
    fs.writeFileSync(csvPath, csvContent, 'utf8');
    console.log(`✓ 客户价格数据已导出: ${csvPath} (${this.customerPrices.size}条记录)`);
  }

  /**
   * 导出订单数据到CSV
   */
  async exportOrdersToCsv() {
    const csvPath = path.join(this.outputDir, 'orders.csv');
    let csvContent = 'id,order_no,customer_name,total_amount,status,order_date\n';
    
    let id = 1;
    for (const order of this.orders) {
      const totalAmount = order.items.reduce((sum, item) => sum + item.amount, 0);
      const orderDate = order.orderDate.toISOString().split('T')[0];
      csvContent += `${id},"${order.orderNo}","${order.customerName}",${totalAmount},"completed","${orderDate}"\n`;
      id++;
    }
    
    fs.writeFileSync(csvPath, csvContent, 'utf8');
    console.log(`✓ 订单数据已导出: ${csvPath} (${this.orders.length}条记录)`);
    
    // 导出订单项数据
    await this.exportOrderItemsToCsv();
  }

  /**
   * 导出订单项数据到CSV
   */
  async exportOrderItemsToCsv() {
    const csvPath = path.join(this.outputDir, 'order_items.csv');
    let csvContent = 'id,order_no,product_name,unit,quantity,unit_price,total_price,remark\n';
    
    let id = 1;
    for (const order of this.orders) {
      for (const item of order.items) {
        csvContent += `${id},"${order.orderNo}","${item.productName}","${item.unit}",${item.quantity},${item.unitPrice},${item.amount},"${item.remark || ''}"\n`;
        id++;
      }
    }
    
    fs.writeFileSync(csvPath, csvContent, 'utf8');
    const itemCount = this.orders.reduce((sum, order) => sum + order.items.length, 0);
    console.log(`✓ 订单项数据已导出: ${csvPath} (${itemCount}条记录)`);
  }

}

async function main() {
  try {
    // 解析命令行参数
    const args = process.argv.slice(2);
    let archiveDir = path.join(__dirname, '..', 'archive');
    let outputDir = path.join(__dirname, '..', 'csv_export');
    
    // 解析参数
    if (args.length > 0) {
      archiveDir = args[0];
    }
    if (args.length > 1) {
      outputDir = args[1];
    }
    
    console.log(`Archive目录: ${archiveDir}`);
    console.log(`输出目录: ${outputDir}\n`);
    
    // 检查archive目录是否存在
    if (!fs.existsSync(archiveDir)) {
      console.error(`错误: Archive目录不存在: ${archiveDir}`);
      process.exit(1);
    }
    
    // 创建导出器实例
    const exporter = new CsvExporter({ outputDir });
    
    // 执行导出
    const stats = await exporter.exportAllData(archiveDir);
    
    // 输出最终统计
    console.log('\n=== 最终统计 ===');
    console.log(`处理文件: ${stats.filesProcessed}`);
    console.log(`客户数量: ${stats.customersFound}`);
    console.log(`商品数量: ${stats.productsFound}`);
    console.log(`订单数量: ${stats.ordersFound}`);
    console.log(`客户价格数量: ${stats.customerPricesFound}`);
    
    if (stats.errors.length > 0) {
      console.log(`错误数量: ${stats.errors.length}`);
      console.log('\n错误详情:');
      stats.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.file}: ${error.error}`);
      });
    }
    
    console.log(`\n✅ CSV文件已生成到: ${outputDir}`);
    
  } catch (error) {
    console.error('\n导出过程中发生错误:', error.message);
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

module.exports = { CsvExporter, main };
