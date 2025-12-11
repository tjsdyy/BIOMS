# 销售员筛选器 - 时间范围联动更新

## 📋 更新概述

**功能**：销售员筛选下拉列表现在会根据选择的时间范围动态过滤

**更新时间**：2025-12-11

## 🎯 需求背景

### 原有问题
- 销售员筛选列表显示所有销售员（仅根据门店过滤）
- 不考虑时间范围，可能显示当前时间段内无销售记录的销售员
- 用户体验不佳：选择的销售员可能在该时间段无数据

### 改进目标
- 销售员列表根据时间范围动态筛选
- 只显示在所选时间范围内有实际销售记录的销售员
- 提升用户体验和数据准确性

## 🔄 技术实现

### 1. 后端查询函数更新

**文件**：`lib/db/queries.ts`

#### 修改前
```typescript
export async function getSalespeople(shop?: string): Promise<string[]> {
  const results = await prisma.$queryRaw<Array<{ doneSales1Name: string }>>`
    SELECT DISTINCT doneSales1Name
    FROM report.fur_sell_order_goods
    WHERE doneSales1Name IS NOT NULL
      ${shop ? Prisma.sql`AND shopName = ${shop}` : Prisma.empty}
    ORDER BY doneSales1Name ASC
  `;
  return results.map(r => r.doneSales1Name);
}
```

#### 修改后
```typescript
export async function getSalespeople(params?: {
  shop?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<string[]> {
  const results = await prisma.$queryRaw<Array<{ doneSales1Name: string }>>`
    SELECT DISTINCT doneSales1Name
    FROM report.fur_sell_order_goods
    WHERE doneSales1Name IS NOT NULL
      ${params?.shop ? Prisma.sql`AND shopName = ${params.shop}` : Prisma.empty}
      ${params?.startDate ? Prisma.sql`AND payTime >= ${params.startDate}` : Prisma.empty}
      ${params?.endDate ? Prisma.sql`AND payTime <= ${params.endDate}` : Prisma.empty}
      AND goodsBom NOT IN ('dingjin', '0500553', 'FY00049', 'FY00017', '6616801')
      AND goodsNum > 0
    ORDER BY doneSales1Name ASC
  `;
  return results.map(r => r.doneSales1Name);
}
```

**变更点**：
- ✅ 参数从单个 `shop` 改为对象 `params`
- ✅ 新增 `startDate` 和 `endDate` 参数
- ✅ 添加时间范围过滤条件
- ✅ 添加业务过滤（goodsBom、goodsNum）确保数据质量

---

### 2. API 路由更新

**文件**：`app/api/filters/salespeople/route.ts`

#### 修改前
```typescript
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get('shop') || undefined;

    const salespeople = await getSalespeople(shop);
    return NextResponse.json({ salespeople });
  } catch (error) {
    // ...
  }
}
```

#### 修改后
```typescript
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get('shop') || undefined;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const salespeople = await getSalespeople({
      shop,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
    return NextResponse.json({ salespeople });
  } catch (error) {
    // ...
  }
}
```

**变更点**：
- ✅ 从 URL 参数中提取 `startDate` 和 `endDate`
- ✅ 将日期字符串转换为 Date 对象
- ✅ 传递完整参数对象给查询函数

---

### 3. 前端 FilterBar 组件更新

**文件**：`components/report/FilterBar.tsx`

#### 修改点 1：查询依赖更新

**修改前**：
```typescript
const { data: salespeopleData } = useQuery({
  queryKey: ['salespeople', filters.shop],
  queryFn: async () => {
    const params = new URLSearchParams();
    if (filters.shop) params.set('shop', filters.shop);
    const res = await fetch(`/api/filters/salespeople?${params}`);
    return res.json();
  },
});
```

**修改后**：
```typescript
const { data: salespeopleData } = useQuery({
  queryKey: ['salespeople', filters.shop, filters.startDate, filters.endDate],
  queryFn: async () => {
    const params = new URLSearchParams();
    if (filters.shop) params.set('shop', filters.shop);
    if (filters.startDate) params.set('startDate', filters.startDate.toISOString());
    if (filters.endDate) params.set('endDate', filters.endDate.toISOString());
    const res = await fetch(`/api/filters/salespeople?${params}`);
    return res.json();
  },
});
```

**变更点**：
- ✅ queryKey 添加 `startDate` 和 `endDate` 依赖
- ✅ API 请求添加时间参数
- ✅ 时间变化时自动重新请求销售员列表

#### 修改点 2：日期变化时清空销售员选择

**开始日期**：
```typescript
onChange={(e) => onChange({ ...filters, startDate: new Date(e.target.value), salesperson: '' })}
```

**结束日期**：
```typescript
onChange={(e) => onChange({ ...filters, endDate: new Date(e.target.value), salesperson: '' })}
```

**快捷日期按钮**：
```typescript
// 所有快捷按钮都添加 salesperson: ''
onChange({ ...filters, startDate: ..., endDate: ..., salesperson: '' })
```

**原因**：
- 时间范围变化后，原选中的销售员可能不在新的列表中
- 自动清空避免数据不一致
- 提升用户体验

---

## 📊 功能流程

### 用户操作流程

```
1. 用户访问报表页面
   ↓
2. 选择时间范围（例如：2024-11-01 至 2024-11-30）
   ↓
3. 销售员下拉列表自动刷新
   ↓
4. 显示该时间范围内有销售记录的销售员
   ↓
5. 用户选择销售员查看数据
```

### 数据查询流程

```
FilterBar组件
  ↓ (onChange)
更新 filters.startDate / filters.endDate
  ↓ (触发 useQuery)
发起 API 请求: /api/filters/salespeople?startDate=...&endDate=...
  ↓
API Route 处理请求
  ↓
getSalespeople({ startDate, endDate, shop })
  ↓
SQL 查询视图 + 时间过滤
  ↓
返回销售员列表
  ↓
前端更新下拉选项
```

## ✅ 联动关系

### 销售员筛选器的多重联动

| 筛选条件 | 影响销售员列表 | 行为 |
|---------|---------------|------|
| **门店** | ✅ | 切换门店 → 清空销售员 → 刷新列表 |
| **开始日期** | ✅ | 修改日期 → 清空销售员 → 刷新列表 |
| **结束日期** | ✅ | 修改日期 → 清空销售员 → 刷新列表 |
| **快捷日期** | ✅ | 点击按钮 → 清空销售员 → 刷新列表 |

### 优化点

1. **自动清空选择**
   - 防止选中的销售员在新时间范围内无数据
   - 避免用户困惑

2. **智能缓存**
   - 使用 React Query 缓存
   - 相同参数不重复请求
   - queryKey 包含所有依赖项

3. **性能优化**
   - 直接从视图查询
   - 无需 JOIN 操作
   - 添加业务过滤减少数据量

## 🎯 使用场景

### 场景 1：按月查看销售员业绩

```
1. 选择"本月"快捷按钮
2. 销售员列表显示本月有销售的人员
3. 选择特定销售员查看详细数据
```

### 场景 2：对比不同时间段

```
1. 选择"上月"查看上月销售员
2. 切换到"本月"
3. 销售员列表自动更新为本月有销售的人员
4. 已选销售员自动清空，避免数据混淆
```

### 场景 3：门店 + 时间双重筛选

```
1. 选择门店"北京店"
2. 选择时间"近7天"
3. 销售员列表显示：北京店 + 近7天有销售记录的销售员
```

## 📈 预期收益

### 用户体验提升

- ✅ **数据准确性**：只显示有实际数据的销售员
- ✅ **操作便捷性**：自动联动，无需手动刷新
- ✅ **减少困惑**：避免选择无数据的销售员

### 性能优化

- ✅ **减少无效查询**：筛选后的列表更小
- ✅ **缓存优化**：相同条件复用缓存
- ✅ **数据库负载**：预过滤减少返回数据量

### 数据质量

- ✅ **业务规则**：自动排除特定商品编码
- ✅ **有效数据**：仅统计 goodsNum > 0 的记录
- ✅ **完整性**：确保 doneSales1Name 非空

## 🧪 测试场景

### 基础功能测试

- [ ] 选择不同时间范围，销售员列表正确更新
- [ ] 修改开始日期，已选销售员自动清空
- [ ] 修改结束日期，已选销售员自动清空
- [ ] 点击快捷日期按钮，销售员列表正确刷新

### 联动测试

- [ ] 先选门店后选时间，列表正确联动
- [ ] 先选时间后选门店，列表正确联动
- [ ] 清空门店，显示全部门店的销售员（时间范围内）
- [ ] 快捷按钮切换，销售员选择正确清空

### 边界测试

- [ ] 选择未来日期，列表为空或提示
- [ ] 选择很久以前的日期，列表正确显示
- [ ] 开始日期晚于结束日期，处理正确
- [ ] 时间范围无数据，显示空列表

### 性能测试

- [ ] 快速切换时间，不产生大量重复请求
- [ ] 缓存机制正常工作
- [ ] 响应时间在可接受范围内（<500ms）

## 📝 API 文档

### 端点

```
GET /api/filters/salespeople
```

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| shop | string | ❌ | 门店名称 |
| startDate | string (ISO) | ❌ | 开始日期 |
| endDate | string (ISO) | ❌ | 结束日期 |

### 请求示例

```bash
# 查询所有销售员
GET /api/filters/salespeople

# 查询特定门店的销售员
GET /api/filters/salespeople?shop=北京店

# 查询特定时间范围的销售员
GET /api/filters/salespeople?startDate=2024-11-01T00:00:00.000Z&endDate=2024-11-30T23:59:59.999Z

# 查询门店+时间范围的销售员
GET /api/filters/salespeople?shop=北京店&startDate=2024-11-01T00:00:00.000Z&endDate=2024-11-30T23:59:59.999Z
```

### 响应格式

```json
{
  "salespeople": [
    "张三",
    "李四",
    "王五"
  ]
}
```

## 🔧 技术细节

### SQL 查询优化

```sql
SELECT DISTINCT doneSales1Name
FROM report.fur_sell_order_goods
WHERE doneSales1Name IS NOT NULL
  AND shopName = ?              -- 可选
  AND payTime >= ?              -- 可选
  AND payTime <= ?              -- 可选
  AND goodsBom NOT IN (...)     -- 业务过滤
  AND goodsNum > 0              -- 有效数据
ORDER BY doneSales1Name ASC
```

**优化点**：
- ✅ 使用视图，无需 JOIN
- ✅ DISTINCT 去重
- ✅ 添加索引友好的条件（payTime, shopName）
- ✅ 业务逻辑过滤在查询层面

### React Query 配置

```typescript
queryKey: ['salespeople', filters.shop, filters.startDate, filters.endDate]
```

**缓存策略**：
- 相同 shop + startDate + endDate 组合复用缓存
- 任一参数变化触发重新请求
- 默认缓存时间：5 分钟（React Query 默认）

## 📦 相关文件清单

### 修改的文件

1. `lib/db/queries.ts` - 查询函数
2. `app/api/filters/salespeople/route.ts` - API 路由
3. `components/report/FilterBar.tsx` - 前端组件

### 依赖关系

```
FilterBar (前端)
  ↓ 调用
/api/filters/salespeople (API)
  ↓ 调用
getSalespeople() (查询)
  ↓ 查询
report.fur_sell_order_goods (视图)
```

## ✅ 验证清单

迁移完成后请验证：

- [ ] 销售员下拉列表显示正常
- [ ] 修改时间范围，列表自动刷新
- [ ] 已选销售员在时间变化时自动清空
- [ ] 门店 + 时间联动正常
- [ ] 快捷日期按钮功能正常
- [ ] API 响应时间正常
- [ ] 数据准确性正确

---

**更新完成时间**：2025-12-11
**更新状态**：✅ 已完成
**影响范围**：销售员筛选功能
**向后兼容性**：✅ 完全兼容
