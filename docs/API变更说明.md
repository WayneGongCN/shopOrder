# API 变更说明 - 移除 order_status_flows 表

## 变更概述

已移除 `order_status_flows` 表，所有订单历史记录（包括状态流转）统一使用 `order_histories` 表管理。

---

## 后端改动点

### 1. 移除的内容
- ❌ 删除模型文件：`src/models/OrderStatusFlow.js`
- ❌ 移除表关联：`Order.hasMany(OrderStatusFlow)`
- ❌ 移除导出：`models/index.js` 中不再导出 `OrderStatusFlow`

### 2. 数据结构变更

#### 订单详情接口响应变化
**接口**：`GET /api/orders/:id`

**变更前**：
```json
{
  "statusFlows": [
    {
      "id": "flow-001",
      "fromStatus": "draft",
      "toStatus": "processing",
      "operator": "张三",
      "remark": "开始处理",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**变更后**：
```json
{
  "statusFlows": [
    {
      "id": "history-001",
      "fromStatus": "draft",
      "toStatus": "processing",
      "fromStatusDesc": "草稿",
      "toStatusDesc": "处理中",
      "operator": "张三",
      "remark": "开始处理",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**新增字段**：
- `fromStatusDesc`：原状态描述
- `toStatusDesc`：目标状态描述

**数据来源变更**：
- 原来：从 `order_status_flows` 表查询
- 现在：从 `order_histories` 表查询（`action = 'status_changed'`）

---

## Web 端需要调整的内容

### ✅ 无需调整的部分

1. **接口路径不变**
   - `GET /api/orders/:id` 
   - 响应结构中的 `statusFlows` 字段保持不变

2. **数据字段兼容**
   - 所有原有字段保持不变：`id`、`fromStatus`、`toStatus`、`operator`、`remark`、`createdAt`
   - 新增的 `fromStatusDesc` 和 `toStatusDesc` 为额外字段，不影响现有逻辑

3. **前端代码无需修改**
   ```javascript
   // 原有代码可以继续使用，无需修改
   const { statusFlows } = orderData;
   statusFlows.forEach(flow => {
     console.log(`${flow.fromStatus} -> ${flow.toStatus}`);
   });
   ```

### 🎁 可选的优化建议

#### 1. 利用新增的状态描述字段

**优化前**：
```javascript
const statusMap = {
  'draft': '草稿',
  'processing': '处理中',
  'completed': '已完成',
  'cancelled': '已取消'
};

const displayText = `${statusMap[flow.fromStatus]} → ${statusMap[flow.toStatus]}`;
```

**优化后**（直接使用服务端返回的描述）：
```javascript
const displayText = `${flow.fromStatusDesc} → ${flow.toStatusDesc}`;
```

#### 2. 状态历史展示组件优化

```jsx
// React 组件示例
const StatusFlowHistory = ({ statusFlows }) => {
  return (
    <div className="status-history">
      {statusFlows.map(flow => (
        <div key={flow.id} className="flow-item">
          <div className="flow-status">
            <span className="from">{flow.fromStatusDesc || '初始'}</span>
            <span className="arrow">→</span>
            <span className="to">{flow.toStatusDesc}</span>
          </div>
          <div className="flow-meta">
            <span>操作人: {flow.operator}</span>
            <span>{new Date(flow.createdAt).toLocaleString()}</span>
          </div>
          {flow.remark && (
            <div className="flow-remark">备注: {flow.remark}</div>
          )}
        </div>
      ))}
    </div>
  );
};
```

---

## 数据库迁移

### 手动迁移步骤（如需保留历史数据）

如果需要将 `order_status_flows` 表的历史数据迁移到 `order_histories` 表：

```sql
-- 1. 迁移历史状态流转数据
INSERT INTO order_histories (
  id, 
  order_id, 
  action, 
  description, 
  operator, 
  changes, 
  created_at, 
  updated_at
)
SELECT 
  id,
  order_id,
  'status_changed' as action,
  CONCAT('订单状态从 ', from_status, ' 变更为 ', to_status) as description,
  operator,
  JSON_OBJECT(
    'fromStatus', from_status,
    'toStatus', to_status,
    'remark', remark,
    'timestamp', created_at
  ) as changes,
  created_at,
  updated_at
FROM order_status_flows;

-- 2. 确认数据迁移成功后，删除旧表
DROP TABLE IF EXISTS order_status_flows;
```

### 如果不需要保留历史数据

```sql
-- 直接删除表
DROP TABLE IF EXISTS order_status_flows;
```

---

## 状态更新接口变更

### 更新订单状态接口

**接口**：`PUT /api/orders/:id/status`

**请求参数变更**：
- ❌ 移除：`operator`（自动从请求头获取）
- ❌ 移除：`role`（固定为 admin）
- ✅ 保留：`status`（必填）
- ✅ 保留：`remark`（可选）

**变更前**：
```json
{
  "status": "processing",
  "operator": "张三",
  "role": "admin",
  "remark": "开始处理"
}
```

**变更后**：
```json
{
  "status": "processing",
  "remark": "开始处理"
}
```

**请求头要求**：
```http
PUT /api/orders/:id/status
Content-Type: application/json
x-wx-openid: wx123456789

{
  "status": "processing",
  "remark": "开始处理"
}
```

### 取消订单接口

**接口**：`PUT /api/orders/:id/cancel`

**请求参数变更**：
- ❌ 移除：`operator`（自动从请求头获取）
- ❌ 移除：`role`（固定为 admin）
- ✅ 保留：`remark`（可选）

**变更前**：
```json
{
  "operator": "张三",
  "role": "admin",
  "remark": "客户要求取消"
}
```

**变更后**：
```json
{
  "remark": "客户要求取消"
}
```

---

## 前端调整示例

### 更新状态调用方式

**调整前**：
```javascript
const updateOrderStatus = async (orderId, status) => {
  const response = await fetch(`/api/orders/${orderId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status,
      operator: getCurrentUser().name, // ❌ 不再需要
      role: 'admin',                   // ❌ 不再需要
      remark: '操作备注'
    })
  });
};
```

**调整后**：
```javascript
const updateOrderStatus = async (orderId, status) => {
  const response = await fetch(`/api/orders/${orderId}/status`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'x-wx-openid': getCurrentUser().openid  // ✅ 通过请求头传递
    },
    body: JSON.stringify({
      status,
      remark: '操作备注'
    })
  });
};
```

### 取消订单调用方式

**调整前**：
```javascript
const cancelOrder = async (orderId) => {
  const response = await fetch(`/api/orders/${orderId}/cancel`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operator: getCurrentUser().name, // ❌ 不再需要
      role: 'admin',                   // ❌ 不再需要
      remark: '客户要求取消'
    })
  });
};
```

**调整后**：
```javascript
const cancelOrder = async (orderId) => {
  const response = await fetch(`/api/orders/${orderId}/cancel`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'x-wx-openid': getCurrentUser().openid  // ✅ 通过请求头传递
    },
    body: JSON.stringify({
      remark: '客户要求取消'
    })
  });
};
```

---

## 总结

### ✅ 优势
1. **简化架构**：减少一个表，降低维护成本
2. **数据统一**：所有订单历史在一个表中，查询更简单
3. **信息更丰富**：新增状态描述字段，前端无需维护状态映射
4. **安全性提升**：操作人由服务端控制，前端无法伪造

### 📋 Web 端检查清单

- [ ] 确认请求头中包含 `x-wx-openid`
- [ ] 移除状态更新接口中的 `operator` 和 `role` 参数
- [ ] 移除取消订单接口中的 `operator` 和 `role` 参数
- [ ] （可选）利用新增的 `fromStatusDesc` 和 `toStatusDesc` 字段优化展示
- [ ] 测试订单详情接口，确认 `statusFlows` 数据正常
- [ ] 测试状态更新功能，确认操作人记录正确

### 🔧 技术支持

如有问题，请联系后端团队。

