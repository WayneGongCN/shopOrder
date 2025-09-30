# 数据导入导出脚本

这个脚本架构将数据导入过程分为两个独立的步骤：Excel到CSV导出和CSV到MySQL导入，实现了更好的关注点分离。

## 🏗️ 新架构设计

### 架构优势
- **关注点分离**：Excel解析和数据库导入完全分离
- **可重复执行**：CSV文件可以重复导入，不会重复解析Excel
- **数据中间格式**：CSV作为标准中间格式，便于数据检查和修改
- **独立运行**：两个脚本可以独立运行，便于调试和维护
- **不影响业务逻辑**：所有脚本逻辑都在scripts目录中
- **复用业务模型**：直接使用业务代码中的数据模型，避免重复定义

### 处理流程
```
Excel文件 → CSV导出脚本 → CSV文件 → CSV导入脚本 → MySQL数据库
```

## 📁 文件结构

```
scripts/
├── exportToCsv.js      # Excel到CSV导出脚本
├── importFromCsv.js    # CSV到MySQL导入脚本
├── fullImport.js       # 完整流程脚本
├── cleanCsvData.js     # CSV数据清理脚本
├── cleanConfig.json    # 数据清理配置文件
├── excelImporter.js    # Excel解析工具类
├── testImport.js       # 测试脚本（用于测试单个文件）
├── example.js          # 使用示例
└── README.md           # 说明文档

src/
└── models/
    └── index.js        # 业务数据模型（复用）

csv_export/             # CSV文件输出目录（自动创建）
├── customers.csv       # 客户数据
├── products.csv        # 商品数据
├── orders.csv          # 订单数据
├── order_items.csv     # 订单项数据
└── customer_prices.csv # 客户专属价格数据
```

## 🚀 使用方法

### 1. 环境准备

确保已安装所有依赖：
```bash
npm install
```

确保数据库连接配置正确（环境变量）：
- `IMPORT_MYSQL_USERNAME` - 导入数据库用户名（默认：root）
- `IMPORT_MYSQL_PASSWORD` - 导入数据库密码（默认：空）
- `IMPORT_MYSQL_ADDRESS` - 导入数据库地址（默认：localhost:3306）
- `IMPORT_MYSQL_DATABASE` - 导入数据库名称（默认：order_import）

### 2. 测试单个文件（可选）

在正式导入前，建议先测试单个文件：
```bash
npm run test:import "archive/2024/万老板.xls"
```

### 3. Excel到CSV导出

```bash
# 使用默认目录
npm run export:csv

# 指定archive目录和输出目录
npm run export:csv "archive" "csv_export"

# 或者直接使用node命令
node scripts/exportToCsv.js
node scripts/exportToCsv.js "archive" "csv_export"
```

### 4. CSV到MySQL导入

```bash
# 使用默认CSV目录
npm run import:csv

# 指定CSV目录
npm run import:csv "csv_export"

# 或者直接使用node命令
node scripts/importFromCsv.js
node scripts/importFromCsv.js "csv_export"
```

### 5. CSV数据清理（可选）

清理CSV文件中的重复数据，如合并相同商品和客户：

```bash
# 使用默认配置清理数据
npm run clean:csv

# 指定CSV目录和配置文件
npm run clean:csv "csv_export" --config "customConfig.json"

# 或者直接使用node命令
node scripts/cleanCsvData.js
node scripts/cleanCsvData.js "csv_export" --config "customConfig.json"
```

### 6. 一键完整导入

```bash
# 执行完整流程
npm run full:import

# 指定archive目录
npm run full:import "archive"

# 跳过导出步骤（如果CSV已存在）
npm run full:import --skip-export

# 跳过导入步骤（如果只想生成CSV）
npm run full:import --skip-import
```

## 📊 CSV文件格式

### customers.csv
```csv
id,name,phone
1,"万老板",""
2,"丛塘陈老板","13800138000"
```

### products.csv
```csv
id,name,global_price,unit
1,"渔竿",150.00,"支"
2,"鱼线",25.00,"卷"
```

### orders.csv
```csv
id,order_no,customer_name,total_amount,status,order_date
1,"SO001","万老板",325.00,"completed","2024-01-15"
```

### order_items.csv
```csv
id,order_no,product_name,unit,quantity,unit_price,total_price,remark
1,"SO001","渔竿","支",2,150.00,300.00,""
2,"SO001","鱼线","卷",1,25.00,25.00,""
```

### customer_prices.csv
```csv
id,customer_name,product_name,price
1,"万老板","渔竿",140.00
2,"万老板","鱼线",22.00
```

## 🧹 CSV数据清理功能

### 功能说明
CSV数据清理脚本用于处理导出的CSV文件中的重复数据，主要功能包括：

- **合并重复客户**：将不同名称但实际为同一客户的数据合并
- **合并重复商品**：将不同名称但实际为同一商品的数据合并
- **更新关联数据**：自动更新订单、订单项、客户价格等相关数据
- **配置文件驱动**：通过JSON配置文件灵活定义合并规则

### 配置文件格式
配置文件 `cleanConfig.json` 格式如下：

```json
{
  "customerMerges": [
    {
      "keep": "万老板",
      "merge": ["万总", "万经理", "万先生"]
    },
    {
      "keep": "丛塘陈老板", 
      "merge": ["丛塘陈总", "陈老板", "丛塘陈"]
    }
  ],
  "productMerges": [
    {
      "keep": "渔竿",
      "merge": ["钓鱼竿", "鱼竿", "钓竿"]
    },
    {
      "keep": "鱼线",
      "merge": ["钓鱼线", "鱼线", "钓线"]
    }
  ]
}
```

### 清理规则
- **客户合并**：保留 `keep` 字段的客户名称，将 `merge` 数组中的名称合并到 `keep`
- **商品合并**：保留 `keep` 字段的商品名称，将 `merge` 数组中的名称合并到 `keep`
- **数据合并策略**：
  - 客户：保留有电话信息的记录
  - 商品：保留价格更高的记录

### 使用场景
- 处理Excel导出时的名称不一致问题
- 合并历史数据中的重复记录
- 标准化客户和商品名称
- 数据导入前的预处理

## 🔧 脚本参数

### exportToCsv.js
```bash
node scripts/exportToCsv.js [archive目录路径] [输出目录路径]
```

参数说明：
- `archive目录路径` - Excel文件所在目录，默认为 `./archive`
- `输出目录路径` - CSV文件输出目录，默认为 `./csv_export`

### importFromCsv.js
```bash
node scripts/importFromCsv.js [CSV目录路径]
```

参数说明：
- `CSV目录路径` - CSV文件所在目录，默认为 `./csv_export`

## 📈 性能特点

### Excel到CSV导出
- **完全本地处理**：所有Excel解析在本地完成
- **流式处理**：逐文件处理，内存使用优化
- **批量生成**：一次性生成所有CSV文件
- **数据去重**：自动处理重复数据

### CSV到MySQL导入
- **批量插入**：每批处理1000条记录
- **智能去重**：自动跳过已存在的数据
- **原生SQL**：使用原生SQL进行批量upsert操作
- **事务安全**：确保数据一致性

## 🛠️ 错误处理

脚本具有完善的错误处理机制：

1. **文件级错误**：单个文件处理失败不影响其他文件
2. **数据级错误**：单条数据解析失败不影响其他数据处理
3. **数据库错误**：详细的错误日志和统计信息
4. **异常处理**：未捕获异常的处理和进程退出

## 📋 统计信息

### 导出统计
```
=== 导出完成 ===
处理文件: 25/25
客户数量: 45
商品数量: 128
订单数量: 156
客户价格数量: 89
```

### 导入统计
```
=== 导入完成 ===
客户处理: 创建 15, 更新 3
商品处理: 创建 128, 更新 45
订单处理: 创建 156, 跳过 12
客户价格: 创建/更新 89
```

## 🔄 完整工作流示例

### 标准流程
```bash
# 1. 导出Excel到CSV
npm run export:csv

# 2. 检查生成的CSV文件
ls -la csv_export/

# 3. 清理CSV数据（可选）
npm run clean:csv

# 4. 导入CSV到MySQL
npm run import:csv
```

### 一键完成
```bash
# 执行完整流程
npm run full:import
```

### 包含数据清理的流程
```bash
# 1. 导出Excel到CSV
npm run export:csv

# 2. 检查并编辑清理配置文件
cat scripts/cleanConfig.json

# 3. 清理CSV数据
npm run clean:csv

# 4. 检查清理结果
ls -la csv_export/

# 5. 导入CSV到MySQL
npm run import:csv
```

## 🆚 新旧架构对比

| 特性 | 旧架构 | 新架构 |
|------|--------|--------|
| 处理方式 | Excel直接到MySQL | Excel→CSV→MySQL |
| 关注点分离 | 混合处理 | 完全分离 |
| 可重复性 | 需要重新解析Excel | 可重复导入CSV |
| 数据检查 | 难以检查中间数据 | CSV文件便于检查 |
| 调试难度 | 较难调试 | 易于调试 |
| 性能 | 一次性处理 | 分阶段优化 |
| 灵活性 | 较低 | 更高 |

## 💡 最佳实践

1. **分步执行**：先导出CSV，检查无误后再导入
2. **备份数据**：导入前备份现有数据库
3. **检查CSV**：导出后检查CSV文件内容
4. **监控日志**：关注错误日志和统计信息

## 🔧 故障排除

### 常见问题

1. **CSV文件不存在**
   - 检查是否已执行导出脚本
   - 确认CSV目录路径正确

2. **数据库连接失败**
   - 检查环境变量配置
   - 确认数据库服务运行状态

3. **CSV格式错误**
   - 检查CSV文件编码（应为UTF-8）
   - 验证CSV文件格式正确性

4. **导入过程中断**
   - 查看错误日志
   - 检查数据库磁盘空间
   - 确认数据库连接稳定性

## 📚 扩展功能

新架构支持以下扩展：

1. **自定义数据验证规则**
2. **数据转换和清理** ✓ 已实现
3. **批量导入优化** ✓ 已实现
4. **客户专属价格导入** ✓ 已实现
5. **CSV中间格式** ✓ 已实现
6. **分阶段处理** ✓ 已实现
7. **CSV数据清理** ✓ 已实现

如需扩展功能，请修改相应的脚本文件。
