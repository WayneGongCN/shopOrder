const orderStatusService = require("../services/orderStatusService");
const { badRequest } = require("../utils/response");

/**
 * 订单状态流转验证中间件
 * 验证状态流转的合法性和用户权限
 */
class StatusValidationMiddleware {
  /**
   * 验证状态流转请求
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   * @param {Function} next 下一个中间件
   */
  static async validateStatusTransition(req, res, next) {
    try {
      const { status, operator, role = "admin" } = req.body;
      const { id } = req.params;

      // 获取当前订单状态
      const { Order } = require("../models");
      const order = await Order.findByPk(id);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "订单不存在"
        });
      }

      // 验证状态流转合法性
      if (!orderStatusService.isValidTransition(order.status, status)) {
        const availableTransitions = orderStatusService.getAvailableTransitions(order.status);
        return res.status(400).json(badRequest(
          `无效的状态流转: ${orderStatusService.getStatusDescription(order.status)} -> ${orderStatusService.getStatusDescription(status)}`,
          {
            currentStatus: order.status,
            targetStatus: status,
            availableTransitions: availableTransitions.map(s => ({
              status: s,
              description: orderStatusService.getStatusDescription(s)
            }))
          }
        ));
      }

      // 验证用户权限
      if (!orderStatusService.hasPermission(role, status)) {
        return res.status(403).json(badRequest(
          `用户角色 ${role} 没有权限将状态变更为 ${orderStatusService.getStatusDescription(status)}`
        ));
      }

      // 将验证信息添加到请求对象中
      req.orderStatusValidation = {
        order,
        currentStatus: order.status,
        targetStatus: status,
        operator,
        role,
        isValid: true
      };

      next();
    } catch (error) {
      console.error("状态流转验证失败:", error);
      res.status(500).json({
        success: false,
        message: "状态流转验证失败",
        error: error.message
      });
    }
  }


  /**
   * 验证订单取消请求
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   * @param {Function} next 下一个中间件
   */
  static async validateOrderCancellation(req, res, next) {
    try {
      const { id } = req.params;
      const { role = "admin" } = req.body;

      // 获取订单信息
      const { Order } = require("../models");
      const order = await Order.findByPk(id);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "订单不存在"
        });
      }

      // 检查是否可以取消
      const canCancel = orderStatusService.canCancelOrder(order);
      if (!canCancel.canCancel) {
        return res.status(400).json(badRequest(canCancel.reason));
      }

      // 验证用户权限
      if (!orderStatusService.hasPermission(role, orderStatusService.STATUS.CANCELLED)) {
        return res.status(403).json(badRequest(
          `用户角色 ${role} 没有权限取消订单`
        ));
      }

      // 将验证信息添加到请求对象中
      req.cancellationValidation = {
        order,
        canCancel: true,
        role
      };

      next();
    } catch (error) {
      console.error("订单取消验证失败:", error);
      res.status(500).json({
        success: false,
        message: "订单取消验证失败",
        error: error.message
      });
    }
  }

}

module.exports = StatusValidationMiddleware;
