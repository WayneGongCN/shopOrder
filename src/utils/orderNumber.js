const { v4: uuidv4 } = require("uuid");

/**
 * 生成订单号
 * 格式：YYYYMMDD + 4位序号
 * @returns {string} 订单号
 */
function generateOrderNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  
  // 生成4位随机序号
  const sequence = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  
  return `${year}${month}${day}${sequence}`;
}

/**
 * 生成UUID
 * @returns {string} UUID字符串
 */
function generateUUID() {
  return uuidv4();
}

/**
 * 生成短ID（8位）
 * @returns {string} 短ID
 */
function generateShortId() {
  return Math.random().toString(36).substring(2, 10);
}

module.exports = {
  generateOrderNumber,
  generateUUID,
  generateShortId
};
