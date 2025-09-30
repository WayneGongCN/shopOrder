const { Order, OrderStatusFlow, OrderHistory } = require("../models");

/**
 * 订单状态管理服务
 * 负责订单状态的流转规则、验证和自动处理
 */
class OrderStatusService {
  constructor() {
    // 定义订单状态
    this.STATUS = {
      DRAFT: "draft",           // 草稿
      PROCESSING: "processing", // 处理中
      COMPLETED: "completed",   // 已完成
      CANCELLED: "cancelled"    // 已取消
    };

    // 定义状态流转规则
    this.STATUS_TRANSITIONS = {
      [this.STATUS.DRAFT]: [this.STATUS.PROCESSING, this.STATUS.CANCELLED],
      [this.STATUS.PROCESSING]: [this.STATUS.COMPLETED, this.STATUS.CANCELLED],
      [this.STATUS.COMPLETED]: [], // 终态，不能转换
      [this.STATUS.CANCELLED]: []  // 终态，不能转换
    };

    // 定义状态描述
    this.STATUS_DESCRIPTIONS = {
      [this.STATUS.DRAFT]: "草稿",
      [this.STATUS.PROCESSING]: "处理中",
      [this.STATUS.COMPLETED]: "已完成",
      [this.STATUS.CANCELLED]: "已取消"
    };

    // 定义角色权限（简化后只有admin角色）
    this.ROLE_PERMISSIONS = {
      admin: Object.values(this.STATUS) // 管理员可以操作所有状态
    };
  }

  /**
   * 验证状态流转是否合法
   * @param {string} fromStatus 当前状态
   * @param {string} toStatus 目标状态
   * @returns {boolean} 是否合法
   */
  isValidTransition(fromStatus, toStatus) {
    if (!this.STATUS_TRANSITIONS[fromStatus]) {
      return false;
    }
    return this.STATUS_TRANSITIONS[fromStatus].includes(toStatus);
  }

  /**
   * 验证用户是否有权限执行状态变更
   * @param {string} role 用户角色
   * @param {string} toStatus 目标状态
   * @returns {boolean} 是否有权限
   */
  hasPermission(role, toStatus) {
    const permissions = this.ROLE_PERMISSIONS[role] || [];
    return permissions.includes(toStatus);
  }

  /**
   * 获取状态的所有可能转换
   * @param {string} currentStatus 当前状态
   * @returns {Array} 可转换的状态列表
   */
  getAvailableTransitions(currentStatus) {
    return this.STATUS_TRANSITIONS[currentStatus] || [];
  }

  /**
   * 获取状态描述
   * @param {string} status 状态
   * @returns {string} 状态描述
   */
  getStatusDescription(status) {
    return this.STATUS_DESCRIPTIONS[status] || status;
  }

  /**
   * 执行状态流转
   * @param {string} orderId 订单ID
   * @param {string} fromStatus 当前状态
   * @param {string} toStatus 目标状态
   * @param {string} operator 操作人
   * @param {string} role 操作人角色
   * @param {string} remark 备注
   * @param {object} transaction 数据库事务
   * @returns {Promise<Object>} 操作结果
   */
  async transitionStatus(orderId, fromStatus, toStatus, operator, role, remark = "", transaction = null) {
    // 验证状态流转
    if (!this.isValidTransition(fromStatus, toStatus)) {
      throw new Error(`无效的状态流转: ${fromStatus} -> ${toStatus}`);
    }

    // 验证权限
    if (!this.hasPermission(role, toStatus)) {
      throw new Error(`用户角色 ${role} 没有权限将状态变更为 ${toStatus}`);
    }

    // 更新订单状态
    await Order.update(
      { status: toStatus },
      { where: { id: orderId }, transaction }
    );

    // 记录状态流转
    await OrderStatusFlow.create({
      orderId,
      fromStatus,
      toStatus,
      operator,
      remark
    }, { transaction });

    // 记录订单历史
    await OrderHistory.create({
      orderId,
      action: "status_changed",
      description: `订单状态从 ${this.getStatusDescription(fromStatus)} 变更为 ${this.getStatusDescription(toStatus)}`,
      operator,
      changes: { 
        fromStatus, 
        toStatus,
        role,
        timestamp: new Date().toISOString()
      }
    }, { transaction });

    return {
      success: true,
      fromStatus,
      toStatus,
      description: `订单状态从 ${this.getStatusDescription(fromStatus)} 变更为 ${this.getStatusDescription(toStatus)}`
    };
  }


  /**
   * 获取订单状态流转历史
   * @param {string} orderId 订单ID
   * @returns {Promise<Array>} 状态流转历史
   */
  async getStatusFlowHistory(orderId) {
    const flows = await OrderStatusFlow.findAll({
      where: { orderId },
      order: [["createdAt", "ASC"]]
    });

    return flows.map(flow => ({
      id: flow.id,
      fromStatus: flow.fromStatus,
      toStatus: flow.toStatus,
      fromStatusDesc: this.getStatusDescription(flow.fromStatus),
      toStatusDesc: this.getStatusDescription(flow.toStatus),
      operator: flow.operator,
      remark: flow.remark,
      createdAt: flow.createdAt
    }));
  }

  /**
   * 检查订单是否可以取消
   * @param {Object} order 订单对象
   * @returns {Object} 检查结果
   */
  canCancelOrder(order) {
    const cancellableStatuses = [this.STATUS.DRAFT, this.STATUS.PROCESSING];
    
    if (!cancellableStatuses.includes(order.status)) {
      return {
        canCancel: false,
        reason: `订单状态为 ${this.getStatusDescription(order.status)}，无法取消`
      };
    }

    // 可以添加更多业务规则，比如时间限制等
    return {
      canCancel: true,
      reason: "订单可以取消"
    };
  }


}

module.exports = new OrderStatusService();
