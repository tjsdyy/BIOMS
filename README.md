# BI报表系统 - 商品销售排行

基于 Next.js + Tailwind CSS + Prisma 的商品销售数据分析系统

## 功能特性

- 📊 **多维度筛选**: 支持按门店、销售员、日期范围筛选
- 📈 **双视图展示**: 表格视图和柱状图视图自由切换
- 🎯 **关键指标**: 总销量、总销售额、商品种类、订单数
- 🏆 **TOP排行榜**: 商品销量TOP20、商品销售额TOP20
- 💎 **精美UI**: 基于 Tremor 和 Recharts 的现代化界面

## 技术栈

- **前端框架**: Next.js 15 (App Router)
- **样式方案**: Tailwind CSS
- **图表库**: @tremor/react + recharts
- **数据库ORM**: Prisma (MySQL)
- **数据请求**: TanStack Query (React Query)
- **日期处理**: date-fns
- **图标**: Heroicons

## 快速开始

### 1. 安装依赖

\`\`\`bash
npm install
\`\`\`

### 2. 配置数据库

修改 `.env` 文件，填入你的 MySQL 数据库连接信息：

\`\`\`env
DATABASE_URL="mysql://用户名:密码@主机:端口/数据库名"
\`\`\`

### 3. 生成 Prisma Client

\`\`\`bash
npx prisma generate
\`\`\`

### 4. 运行开发服务器

\`\`\`bash
npm run dev
\`\`\`

打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## 数据库结构

### shop_order (订单表)

| 字段 | 类型 | 说明 |
|------|------|------|
| orderSn | VARCHAR | 订单号(主键) |
| shop | VARCHAR | 门店 |
| doneSales | DECIMAL | 销售金额 |
| doneSales1 | VARCHAR | 销售员 |
| payTime | DATETIME | 支付时间 |
| status | VARCHAR | 订单状态 |
| orderTypeSub | VARCHAR | 订单类型 |

### shop_order_goods (订单商品表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 自增ID(主键) |
| orderSn | VARCHAR | 订单号(外键) |
| goodsBom | VARCHAR | 商品BOM |
| goodsName | VARCHAR | 商品名称 |
| goodsSpec | VARCHAR | 商品规格 |
| goodsNum | INT | 商品数量 |
| goodsPrice | DECIMAL | 商品单价 |

## 项目结构

\`\`\`
omsbi/
├── app/                    # Next.js App Router
│   ├── api/               # API路由
│   │   ├── filters/       # 筛选器API
│   │   └── report/        # 报表API
│   ├── report/            # 报表页面
│   ├── layout.tsx         # 根布局
│   ├── page.tsx           # 首页(重定向到报表)
│   ├── providers.tsx      # React Query Provider
│   └── globals.css        # 全局样式
├── components/            # React组件
│   ├── report/           # 报表组件
│   │   ├── FilterBar.tsx
│   │   ├── KPICards.tsx
│   │   ├── RankingSection.tsx
│   │   ├── RankingTable.tsx
│   │   └── RankingChart.tsx
│   └── ui/               # UI组件
│       └── ViewToggle.tsx
├── lib/                   # 工具库
│   └── db/               # 数据库相关
│       ├── prisma.ts     # Prisma客户端
│       └── queries.ts    # 数据查询函数
├── types/                # TypeScript类型定义
│   └── report.ts
├── prisma/               # Prisma配置
│   └── schema.prisma     # 数据库模型
└── package.json
\`\`\`

## API文档

### 获取门店列表
\`\`\`
GET /api/filters/shops
Response: { shops: string[] }
\`\`\`

### 获取销售员列表
\`\`\`
GET /api/filters/salespeople?shop=xxx
Response: { salespeople: string[] }
\`\`\`

### 获取KPI指标
\`\`\`
GET /api/report/kpi?shop=xxx&salesperson=xxx&startDate=xxx&endDate=xxx
Response: {
  totalQuantity: number,
  totalSales: number,
  productCount: number,
  orderCount: number
}
\`\`\`

### 获取商品销量排行
\`\`\`
GET /api/report/ranking-quantity?shop=xxx&salesperson=xxx&startDate=xxx&endDate=xxx&limit=20
Response: { rankings: RankingItem[] }
\`\`\`

### 获取商品销售额排行
\`\`\`
GET /api/report/ranking-sales?shop=xxx&salesperson=xxx&startDate=xxx&endDate=xxx&limit=20
Response: { rankings: RankingItem[] }
\`\`\`

## 开发指南

### 修改数据库连接

编辑 `.env` 文件，更新 `DATABASE_URL`

### 同步数据库结构

如果数据库结构发生变化：

\`\`\`bash
npx prisma db pull       # 从数据库拉取最新结构
npx prisma generate      # 重新生成Prisma Client
\`\`\`

### 构建生产版本

\`\`\`bash
npm run build
npm start
\`\`\`

## 注意事项

1. 确保数据库中 `shop_order.status = 'completed'` 的订单才会被统计
2. 销售额计算公式: `SUM(goodsNum * goodsPrice)`
3. 默认显示TOP 20，可通过API参数调整
4. 日期筛选包含开始和结束日期的全天数据

## License

MIT
