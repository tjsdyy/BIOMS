import prisma from './prisma';
import { Prisma } from '@prisma/client';
import type { FilterParams, KPIMetrics, RankingItem } from '@/types/report';

// ========================================
// 优化后的查询函数 - 使用 report.fur_sell_order_goods 视图
// ========================================

// 1. 获取门店列表（从枚举表）- 无需修改
export async function getShops(): Promise<Array<{ name: string; value: string }>> {
  const shops = await prisma.ubiggerEnum.findMany({
    where: { enumName: 'shop' },
    select: { name: true, value: true },
    orderBy: { value: 'asc' },
  });
  return shops.map(s => ({ name: s.name, value: s.value }));
}

// 2. 获取销售员列表 - 优化：直接从视图获取
export async function getSalespeople(shop?: string): Promise<string[]> {
  const results = await prisma.$queryRaw<Array<{ doneSales1Name: string }>>`
    SELECT DISTINCT doneSales1Name
    FROM report.fur_sell_order_goods
    WHERE doneSales1Name IS NOT NULL
      ${shop ? Prisma.sql`AND shop = ${shop}` : Prisma.empty}
    ORDER BY doneSales1Name ASC
  `;
  return results.map(r => r.doneSales1Name);
}

// 3. 获取KPI指标 - 优化：直接查询视图，无需JOIN
export async function getKPIMetrics(params: FilterParams): Promise<KPIMetrics> {
  const result = await prisma.$queryRaw<[{
    orderCount: bigint,
    totalQuantity: bigint,
    totalSales: number,
    productCount: bigint
  }]>`
    SELECT
      COUNT(DISTINCT orderSn) as orderCount,
      COALESCE(SUM(goodsNum), 0) as totalQuantity,
      COALESCE(SUM(goodsNum * goodsPrice), 0) as totalSales,
      COUNT(DISTINCT goodsName) as productCount
    FROM report.fur_sell_order_goods
    WHERE 1=1
      ${params.shop ? Prisma.sql`AND shop = ${params.shop}` : Prisma.empty}
      ${params.salesperson ? Prisma.sql`AND doneSales1Name = ${params.salesperson}` : Prisma.empty}
      ${params.startDate ? Prisma.sql`AND payTime >= ${params.startDate}` : Prisma.empty}
      ${params.endDate ? Prisma.sql`AND payTime <= ${params.endDate}` : Prisma.empty}
      AND goodsBom NOT IN ('dingjin', '0500553', 'FY00049', 'FY00017', '6616801')
      AND goodsNum > 0
  `;

  const stats = result[0];

  return {
    totalQuantity: Number(stats?.totalQuantity || 0),
    totalSales: Number(stats?.totalSales || 0),
    productCount: Number(stats?.productCount || 0),
    orderCount: Number(stats?.orderCount || 0),
  };
}

// 4. 获取商品销售数量排行 - 优化：直接查询视图
export async function getProductRankingByQuantity(
  params: FilterParams & { limit?: number }
): Promise<RankingItem[]> {
  const results = await prisma.$queryRaw<Array<{
    goodsName: string;
    goodsSpec: string;
    quantity: bigint;
  }>>`
    SELECT
      goodsName,
      goodsSpec,
      SUM(goodsNum) as quantity
    FROM report.fur_sell_order_goods
    WHERE 1=1
      ${params.shop ? Prisma.sql`AND shop = ${params.shop}` : Prisma.empty}
      ${params.salesperson ? Prisma.sql`AND doneSales1Name = ${params.salesperson}` : Prisma.empty}
      ${params.startDate ? Prisma.sql`AND payTime >= ${params.startDate}` : Prisma.empty}
      ${params.endDate ? Prisma.sql`AND payTime <= ${params.endDate}` : Prisma.empty}
      AND goodsBom NOT IN ('dingjin', '0500553', 'FY00049', 'FY00017', '6616801')
      AND goodsNum > 0
    GROUP BY goodsName, goodsSpec
    ORDER BY quantity DESC
    ${params.limit ? Prisma.sql`LIMIT ${params.limit}` : Prisma.empty}
  `;

  // 计算总量用于百分比
  const total = results.reduce((sum, item) => sum + Number(item.quantity), 0);

  return results.map((item, index) => ({
    rank: index + 1,
    goodsName: item.goodsName,
    goodsSpec: item.goodsSpec,
    quantity: Number(item.quantity),
    percentage: total > 0 ? (Number(item.quantity) / total) * 100 : 0,
  }));
}

// 5. 获取商品销售金额排行 - 优化：直接查询视图
export async function getProductRankingBySales(
  params: FilterParams & { limit?: number }
): Promise<RankingItem[]> {
  const results = await prisma.$queryRaw<Array<{
    goodsName: string;
    goodsSpec: string;
    salesAmount: number;
  }>>`
    SELECT
      goodsName,
      goodsSpec,
      SUM(goodsNum * goodsPrice) as salesAmount
    FROM report.fur_sell_order_goods
    WHERE 1=1
      ${params.shop ? Prisma.sql`AND shop = ${params.shop}` : Prisma.empty}
      ${params.salesperson ? Prisma.sql`AND doneSales1Name = ${params.salesperson}` : Prisma.empty}
      ${params.startDate ? Prisma.sql`AND payTime >= ${params.startDate}` : Prisma.empty}
      ${params.endDate ? Prisma.sql`AND payTime <= ${params.endDate}` : Prisma.empty}
      AND goodsBom NOT IN ('dingjin', '0500553', 'FY00049', 'FY00017', '6616801')
      AND goodsNum > 0
    GROUP BY goodsName, goodsSpec
    ORDER BY salesAmount DESC
    ${params.limit ? Prisma.sql`LIMIT ${params.limit}` : Prisma.empty}
  `;

  // 计算总额用于百分比
  const total = results.reduce((sum, item) => sum + item.salesAmount, 0);

  return results.map((item, index) => ({
    rank: index + 1,
    goodsName: item.goodsName,
    goodsSpec: item.goodsSpec,
    salesAmount: item.salesAmount,
    percentage: total > 0 ? (item.salesAmount / total) * 100 : 0,
  }));
}

// 6. 获取商品明细 - 优化：使用视图的 doneSales1Name
export async function getProductDetail(params: {
  goodsName: string;
  shop?: string;
  startDate?: Date;
  endDate?: Date;
  type: 'quantity' | 'sales';
  groupBy?: 'shop' | 'salesperson';
}) {
  const { goodsName, shop, startDate, endDate, type, groupBy } = params;

  if (shop) {
    // 如果选择了门店，按销售员统计 - 使用 doneSales1Name
    const results = await prisma.$queryRaw<Array<{
      doneSales1Name: string;
      quantity: bigint;
      salesAmount: number;
    }>>`
      SELECT
        doneSales1Name,
        SUM(goodsNum) as quantity,
        SUM(goodsNum * goodsPrice) as salesAmount
      FROM report.fur_sell_order_goods
      WHERE goodsName = ${goodsName}
        AND shop = ${shop}
        ${startDate ? Prisma.sql`AND payTime >= ${startDate}` : Prisma.empty}
        ${endDate ? Prisma.sql`AND payTime <= ${endDate}` : Prisma.empty}
        AND goodsBom NOT IN ('dingjin', '0500553', 'FY00049', 'FY00017', '6616801')
        AND goodsNum > 0
        AND doneSales1Name IS NOT NULL
      GROUP BY doneSales1Name
      ORDER BY ${type === 'quantity' ? Prisma.sql`quantity` : Prisma.sql`salesAmount`} DESC
    `;

    return results.map((item) => ({
      name: item.doneSales1Name || '未知销售员',
      quantity: Number(item.quantity),
      salesAmount: Number(item.salesAmount),
    }));
  } else {
    // 如果是全部门店，根据 groupBy 参数决定按门店还是按销售员统计
    if (groupBy === 'salesperson') {
      // 按销售员统计（全部门店）
      const results = await prisma.$queryRaw<Array<{
        doneSales1Name: string;
        quantity: bigint;
        salesAmount: number;
      }>>`
        SELECT
          doneSales1Name,
          SUM(goodsNum) as quantity,
          SUM(goodsNum * goodsPrice) as salesAmount
        FROM report.fur_sell_order_goods
        WHERE goodsName = ${goodsName}
          ${startDate ? Prisma.sql`AND payTime >= ${startDate}` : Prisma.empty}
          ${endDate ? Prisma.sql`AND payTime <= ${endDate}` : Prisma.empty}
          AND goodsBom NOT IN ('dingjin', '0500553', 'FY00049', 'FY00017', '6616801')
          AND goodsNum > 0
          AND doneSales1Name IS NOT NULL
        GROUP BY doneSales1Name
        ORDER BY ${type === 'quantity' ? Prisma.sql`quantity` : Prisma.sql`salesAmount`} DESC
      `;

      return results.map((item) => ({
        name: item.doneSales1Name || '未知销售员',
        quantity: Number(item.quantity),
        salesAmount: Number(item.salesAmount),
      }));
    } else {
      // 按门店统计，需要 JOIN 获取门店名称
      const results = await prisma.$queryRaw<Array<{
        shopName: string;
        quantity: bigint;
        salesAmount: number;
      }>>`
        SELECT
          COALESCE(ue.name, v.shop) as shopName,
          SUM(v.goodsNum) as quantity,
          SUM(v.goodsNum * v.goodsPrice) as salesAmount
        FROM report.fur_sell_order_goods v
        LEFT JOIN ubigger_enum ue ON ue.value = v.shop AND ue.enumName = 'shop'
        WHERE v.goodsName = ${goodsName}
          ${startDate ? Prisma.sql`AND v.payTime >= ${startDate}` : Prisma.empty}
          ${endDate ? Prisma.sql`AND v.payTime <= ${endDate}` : Prisma.empty}
          AND v.goodsBom NOT IN ('dingjin', '0500553', 'FY00049', 'FY00017', '6616801')
          AND v.goodsNum > 0
        GROUP BY v.shop, ue.name
        ORDER BY ${type === 'quantity' ? Prisma.sql`quantity` : Prisma.sql`salesAmount`} DESC
      `;

      return results.map((item) => ({
        name: item.shopName,
        quantity: Number(item.quantity),
        salesAmount: Number(item.salesAmount),
      }));
    }
  }
}
