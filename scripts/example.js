#!/usr/bin/env node

/**
 * 新架构使用示例脚本
 * 演示如何使用新的Excel到CSV再到MySQL的导入流程
 */

const path = require('path');
const fs = require('fs');

async function example() {
  try {
    console.log('=== 新架构使用示例 ===\n');
    
    const archiveDir = path.join(__dirname, '..', 'archive');
    const csvDir = path.join(__dirname, '..', 'csv_export');
    
    console.log('📁 目录结构:');
    console.log(`  Archive目录: ${archiveDir}`);
    console.log(`  CSV输出目录: ${csvDir}\n`);
    
    // 检查archive目录
    if (!fs.existsSync(archiveDir)) {
      console.log('⚠ Archive目录不存在，跳过示例');
      return;
    }
    
    console.log('🚀 使用流程:');
    console.log('\n1. 导出Excel到CSV:');
    console.log('   npm run export:csv');
    
    console.log('\n2. 检查生成的CSV文件:');
    console.log(`   ls -la ${csvDir}/`);
    
    console.log('\n3. 导入CSV到MySQL:');
    console.log('   npm run import:csv');
    
    console.log('\n🧹 CSV数据清理:');
    console.log('   npm run clean:csv');
    
    console.log('\n🔄 一键完整导入:');
    console.log('   npm run full:import');
    
    console.log('\n📊 CSV文件说明:');
    console.log('   customers.csv      - 客户数据');
    console.log('   products.csv       - 商品数据');
    console.log('   orders.csv         - 订单数据');
    console.log('   order_items.csv    - 订单项数据');
    console.log('   customer_prices.csv - 客户专属价格数据');
    
    console.log('\n✨ 架构优势:');
    console.log('   ✅ 关注点分离 - Excel解析和数据库导入完全分离');
    console.log('   ✅ 可重复执行 - CSV文件可以重复导入');
    console.log('   ✅ 数据中间格式 - CSV便于检查和修改');
    console.log('   ✅ 独立运行 - 两个脚本可以独立调试');
    console.log('   ✅ 不影响业务逻辑 - 所有逻辑都在scripts目录');
    console.log('   ✅ 数据清理功能 - 自动合并重复的客户和商品数据');
    
    console.log('\n📚 详细文档:');
    console.log('   请查看 scripts/README_NEW.md');
    
    console.log('\n=== 示例完成 ===');
    
  } catch (error) {
    console.error('\n示例执行过程中发生错误:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

// 运行示例
if (require.main === module) {
  example();
}

module.exports = example;
