#!/usr/bin/env node

const path = require('path');
const { spawn } = require('child_process');

/**
 * 完整导入流程脚本
 * 自动执行Excel到CSV导出，然后CSV到MySQL导入的完整流程
 * 
 * 使用方法: 
 *   node scripts/fullImport.js [archive目录路径] [--skip-export] [--skip-import]
 * 
 * 参数说明:
 *   archive目录路径 - Excel文件所在目录，默认为 ./archive
 *   --skip-export  - 跳过CSV导出步骤
 *   --skip-import  - 跳过CSV导入步骤
 */

class FullImporter {
  constructor(options = {}) {
    this.archiveDir = options.archiveDir || path.join(__dirname, '..', 'archive');
    this.csvDir = path.join(__dirname, '..', 'csv_export');
    this.skipExport = options.skipExport || false;
    this.skipImport = options.skipImport || false;
  }

  /**
   * 执行完整的导入流程
   */
  async executeFullImport() {
    try {
      console.log('=== 完整导入流程 ===\n');
      
      console.log(`Archive目录: ${this.archiveDir}`);
      console.log(`CSV目录: ${this.csvDir}`);
      console.log(`跳过导出: ${this.skipExport ? '是' : '否'}`);
      console.log(`跳过导入: ${this.skipImport ? '是' : '否'}\n`);
      
      // 第一步：导出Excel到CSV
      if (!this.skipExport) {
        console.log('=== 第一步：导出Excel到CSV ===');
        await this.executeExport();
      } else {
        console.log('=== 第一步：跳过CSV导出 ===');
      }
      
      // 第二步：导入CSV到MySQL
      if (!this.skipImport) {
        console.log('\n=== 第二步：导入CSV到MySQL ===');
        await this.executeImport();
      } else {
        console.log('\n=== 第二步：跳过CSV导入 ===');
      }
      
      console.log('\n=== 完整导入流程完成 ===');
      
    } catch (error) {
      console.error('\n完整导入流程中发生错误:', error.message);
      throw error;
    }
  }

  /**
   * 执行CSV导出
   */
  async executeExport() {
    const args = [this.archiveDir, this.csvDir];
    
    return new Promise((resolve, reject) => {
      const child = spawn('node', ['scripts/exportToCsv.js', ...args], {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          console.log('✓ CSV导出完成');
          resolve();
        } else {
          reject(new Error(`CSV导出失败，退出码: ${code}`));
        }
      });
      
      child.on('error', (error) => {
        reject(new Error(`CSV导出执行失败: ${error.message}`));
      });
    });
  }

  /**
   * 执行CSV导入
   */
  async executeImport() {
    const args = [this.csvDir];
    
    return new Promise((resolve, reject) => {
      const child = spawn('node', ['scripts/importFromCsv.js', ...args], {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          console.log('✓ CSV导入完成');
          resolve();
        } else {
          reject(new Error(`CSV导入失败，退出码: ${code}`));
        }
      });
      
      child.on('error', (error) => {
        reject(new Error(`CSV导入执行失败: ${error.message}`));
      });
    });
  }
}

async function main() {
  try {
    // 解析命令行参数
    const args = process.argv.slice(2);
    let archiveDir = path.join(__dirname, '..', 'archive');
    let skipExport = false;
    let skipImport = false;
    
    // 解析参数
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--skip-export') {
        skipExport = true;
      } else if (arg === '--skip-import') {
        skipImport = true;
      } else if (!arg.startsWith('--')) {
        archiveDir = arg;
      }
    }
    
    // 创建导入器实例
    const importer = new FullImporter({
      archiveDir,
      skipExport,
      skipImport
    });
    
    // 执行完整导入流程
    await importer.executeFullImport();
    
  } catch (error) {
    console.error('\n执行过程中发生错误:', error.message);
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

module.exports = { FullImporter, main };
