const XLSX = require('xlsx');
const path = require('path');

/**
 * Excel导入工具类
 * 用于解析Excel文件并提取订单数据
 */
class ExcelImporter {
  constructor() {
    this.headerRowIndex = 6; // 第7行（索引6）为表头
    this.headerColumns = [
      '日期', '单号', '货品名称', '型号规格', '单位', '数量', '单价', '金额', '备注'
    ];
  }

  /**
   * 解析Excel文件
   * @param {string} filePath - Excel文件路径
   * @returns {Object} 解析结果
   */
  parseExcelFile(filePath) {
    try {
      // 从文件路径提取客户名称和年份
      const fileName = path.basename(filePath, '.xls');
      const customerName = fileName;
      
      // 从路径中提取年份
      const pathParts = filePath.split(path.sep);
      const yearPart = pathParts.find(part => /^\d{4}$/.test(part));
      const year = yearPart ? parseInt(yearPart) : new Date().getFullYear();

      // 读取Excel文件
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // 转换为JSON格式
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // 解析数据
      const orders = this.parseData(jsonData);
      
      return {
        customerName,
        year,
        orders,
        filePath
      };
      
    } catch (error) {
      throw new Error(`解析Excel文件失败: ${error.message}`);
    }
  }

  /**
   * 解析Excel数据
   * @param {Array} jsonData - Excel转换的JSON数据
   * @returns {Array} 订单数据数组
   */
  parseData(jsonData) {
    const orders = [];
    
    // 查找表头行
    let headerRowIndex = -1;
    for (let i = 0; i < jsonData.length; i++) {
      if (this.isHeaderRow(jsonData[i])) {
        headerRowIndex = i;
        break;
      }
    }
    
    if (headerRowIndex === -1) {
      throw new Error('未找到表头行');
    }
    
    // 从表头行开始解析数据
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      // 检查是否为合计行
      if (this.isTotalRow(row)) {
        break;
      }
      
      // 解析订单数据
      const orderData = this.parseOrderRow(row);
      if (orderData) {
        orders.push(orderData);
      }
    }
    
    return orders;
  }

  /**
   * 判断是否为表头行
   * @param {Array} row - 行数据
   * @returns {boolean}
   */
  isHeaderRow(row) {
    if (!row || row.length === 0) return false;
    
    // 检查前几个列是否匹配表头
    const firstColumn = (row[0] || '').toString().trim();
    const secondColumn = (row[1] || '').toString().trim();
    
    return firstColumn === '日期' && secondColumn === '单号';
  }

  /**
   * 判断是否为合计行
   * @param {Array} row - 行数据
   * @returns {boolean}
   */
  isTotalRow(row) {
    if (!row || row.length === 0) return false;
    
    const firstColumn = (row[0] || '').toString().trim();
    return firstColumn.includes('合计');
  }

  /**
   * 解析订单行数据
   * @param {Array} row - 行数据
   * @returns {Object|null} 订单数据
   */
  parseOrderRow(row) {
    if (!row || row.length < 8) return null;
    
    try {
      // 提取各列数据
      const dateStr = (row[0] || '').toString().trim();
      const orderNo = (row[1] || '').toString().trim();
      const productName = (row[2] || '').toString().trim();
      const specification = (row[3] || '').toString().trim();
      const unit = (row[4] || '').toString().trim();
      const quantity = parseFloat(row[5]) || 0;
      const unitPrice = parseFloat(row[6]) || 0;
      const amount = parseFloat(row[7]) || 0;
      const remark = (row[8] || '').toString().trim();
      
      // 验证必要字段
      if (!dateStr || !orderNo || !productName) {
        return null;
      }
      
      // 解析日期
      let orderDate;
      try {
        // 尝试多种日期格式
        if (dateStr.includes('/')) {
          orderDate = new Date(dateStr.replace(/(\d{4})\/(\d{1,2})\/(\d{1,2})/, '$1-$2-$3'));
        } else if (dateStr.includes('-')) {
          orderDate = new Date(dateStr);
        } else {
          // 纯数字格式，如20240101
          const year = dateStr.substring(0, 4);
          const month = dateStr.substring(4, 6);
          const day = dateStr.substring(6, 8);
          orderDate = new Date(`${year}-${month}-${day}`);
        }
        
        if (isNaN(orderDate.getTime())) {
          throw new Error('无效日期格式');
        }
      } catch (error) {
        console.warn(`日期解析失败: ${dateStr}, 使用当前日期`);
        orderDate = new Date();
      }
      
      return {
        orderDate,
        orderNo,
        productName,
        specification,
        unit: unit || '个',
        quantity,
        unitPrice,
        amount,
        remark
      };
      
    } catch (error) {
      console.warn(`解析订单行失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 获取所有Excel文件路径
   * @param {string} archiveDir - archive目录路径
   * @returns {Array} Excel文件路径数组
   */
  getAllExcelFiles(archiveDir) {
    const fs = require('fs');
    const files = [];
    
    try {
      const years = fs.readdirSync(archiveDir).filter(item => {
        const fullPath = path.join(archiveDir, item);
        return fs.statSync(fullPath).isDirectory() && /^\d{4}$/.test(item);
      });
      
      years.forEach(year => {
        const yearDir = path.join(archiveDir, year);
        const yearFiles = fs.readdirSync(yearDir)
          .filter(file => file.endsWith('.xls') || file.endsWith('.xlsx'))
          .map(file => path.join(yearDir, file));
        
        files.push(...yearFiles);
      });
      
      return files;
    } catch (error) {
      throw new Error(`读取archive目录失败: ${error.message}`);
    }
  }
}

module.exports = ExcelImporter;
