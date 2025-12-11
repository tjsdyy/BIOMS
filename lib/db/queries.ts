import prisma from './prisma';
import { Prisma } from '@prisma/client';
import type { FilterParams, KPIMetrics, RankingItem } from '@/types/report';

// ========================================
// 优化后的查询函数 - 使用 report.fur_sell_order_goods 视图
// ========================================

// 1. 获取门店列表 - 优化：直接从视图获取
export async function getShops(): Promise<Array<{ name: string; value: string }>> {
  const results = await prisma.$queryRaw<Array<{ shopName: string }>>`
    SELECT DISTINCT shopName
    FROM report.fur_sell_order_goods
    WHERE shopName IS NOT NULL
    ORDER BY shopName ASC
  `;
  return results.map(r => ({ name: r.shopName, value: r.shopName }));
}

// 2. 获取销售员列表 - 优化：直接从视图获取，支持时间范围筛选
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
      AND goodsBom NOT IN ('dingjin', '0500553', 'FY00049', 'FY00017', '6616801') and goodsBom not like 'FY%' 
      AND goodsNum > 0
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
      COUNT(DISTINCT goodsNameSpu) as productCount
    FROM report.fur_sell_order_goods
    WHERE 1=1
      ${params.shop ? Prisma.sql`AND shopName = ${params.shop}` : Prisma.empty}
      ${params.salesperson ? Prisma.sql`AND doneSales1Name = ${params.salesperson}` : Prisma.empty}
      ${params.startDate ? Prisma.sql`AND payTime >= ${params.startDate}` : Prisma.empty}
      ${params.endDate ? Prisma.sql`AND payTime <= ${params.endDate}` : Prisma.empty}
      AND goodsBom NOT IN ('dingjin', '0500553', 'FY00049', 'FY00017', '6616801') and goodsBom not like 'FY%' 
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
    goodsNameSpu: string;
    goodsSpec: string;
    quantity: bigint;
  }>>`
    SELECT
      goodsNameSpu,
      goodsSpec,
      SUM(goodsNum) as quantity
    FROM report.fur_sell_order_goods
    WHERE 1=1
      ${params.shop ? Prisma.sql`AND shopName = ${params.shop}` : Prisma.empty}
      ${params.salesperson ? Prisma.sql`AND doneSales1Name = ${params.salesperson}` : Prisma.empty}
      ${params.startDate ? Prisma.sql`AND payTime >= ${params.startDate}` : Prisma.empty}
      ${params.endDate ? Prisma.sql`AND payTime <= ${params.endDate}` : Prisma.empty}
      AND goodsBom NOT IN ('dingjin', '0500553', 'FY00049', 'FY00017', '6616801') and goodsBom not like 'FY%'
      AND goodsNum > 0
    GROUP BY goodsNameSpu
    ORDER BY quantity DESC
    ${params.limit ? Prisma.sql`LIMIT ${params.limit}` : Prisma.empty}
  `;

  // 计算总量用于百分比
  const total = results.reduce((sum, item) => sum + Number(item.quantity), 0);

  return results.map((item, index) => ({
    rank: index + 1,
    goodsName: item.goodsNameSpu,
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
    goodsNameSpu: string;
    goodsSpec: string;
    salesAmount: number;
  }>>`
    SELECT
      goodsNameSpu,
      goodsSpec,
      SUM(goodsNum * goodsPrice) as salesAmount
    FROM report.fur_sell_order_goods
    WHERE 1=1
      ${params.shop ? Prisma.sql`AND shopName = ${params.shop}` : Prisma.empty}
      ${params.salesperson ? Prisma.sql`AND doneSales1Name = ${params.salesperson}` : Prisma.empty}
      ${params.startDate ? Prisma.sql`AND payTime >= ${params.startDate}` : Prisma.empty}
      ${params.endDate ? Prisma.sql`AND payTime <= ${params.endDate}` : Prisma.empty}
      AND goodsBom NOT IN ('dingjin', '0500553', 'FY00049', 'FY00017', '6616801') and goodsBom not like 'FY%'
      AND goodsNum > 0
    GROUP BY goodsNameSpu
    ORDER BY salesAmount DESC
    ${params.limit ? Prisma.sql`LIMIT ${params.limit}` : Prisma.empty}
  `;

  // 计算总额用于百分比
  const total = results.reduce((sum, item) => sum + item.salesAmount, 0);

  return results.map((item, index) => ({
    rank: index + 1,
    goodsName: item.goodsNameSpu,
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
  const { goodsName: goodsNameSpu, shop, startDate, endDate, type, groupBy } = params;

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
      WHERE goodsNameSpu = ${goodsNameSpu}
        AND shopName = ${shop}
        ${startDate ? Prisma.sql`AND payTime >= ${startDate}` : Prisma.empty}
        ${endDate ? Prisma.sql`AND payTime <= ${endDate}` : Prisma.empty}
        AND goodsBom NOT IN ('dingjin', '0500553', 'FY00049', 'FY00017', '6616801') and goodsBom not like 'FY%'
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
        WHERE goodsNameSpu = ${goodsNameSpu}
          ${startDate ? Prisma.sql`AND payTime >= ${startDate}` : Prisma.empty}
          ${endDate ? Prisma.sql`AND payTime <= ${endDate}` : Prisma.empty}
          AND goodsBom NOT IN ('dingjin', '0500553', 'FY00049', 'FY00017', '6616801') and goodsBom not like 'FY%'
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
      // 按门店统计 - 优化：直接使用 shopName，并判断是否摆场
      const results = await prisma.$queryRaw<Array<{
        shopName: string;
        shop: string;
        quantity: bigint;
        salesAmount: number;
        hasDisplay: number | null;
      }>>`
        SELECT
          v.shopName,
          v.shop,
          SUM(v.goodsNum) as quantity,
          SUM(v.goodsNum * v.goodsPrice) as salesAmount,
          MAX(CASE WHEN d.goodsName IS NOT NULL THEN 1 ELSE 0 END) as hasDisplay
        FROM report.fur_sell_order_goods v
        LEFT JOIN (
          SELECT DISTINCT c.name as goodsName, b.shopId as shop
          FROM fnjinew2.stock_goods a
          INNER JOIN fnjinew2.stock_type b ON a.storeBom = b.bom
          INNER JOIN fnjinew2.shop_product_sku c ON c.bom = a.bom
          WHERE a.storeNum > 0 AND b.name LIKE '%摆场%'
        ) d ON v.goodsNameSpu = d.goodsName AND v.shop = d.shop
        WHERE v.goodsNameSpu = ${goodsNameSpu}
          ${startDate ? Prisma.sql`AND v.payTime >= ${startDate}` : Prisma.empty}
          ${endDate ? Prisma.sql`AND v.payTime <= ${endDate}` : Prisma.empty}
          AND v.goodsBom NOT IN ('dingjin', '0500553', 'FY00049', 'FY00017', '6616801') and v.goodsBom not like 'FY%'
          AND v.goodsNum > 0
          AND v.shopName IS NOT NULL
        GROUP BY v.shopName, v.shop
        ORDER BY ${type === 'quantity' ? Prisma.sql`quantity` : Prisma.sql`salesAmount`} DESC
      `;

      return results.map((item) => ({
        name: item.shopName,
        quantity: Number(item.quantity),
        salesAmount: Number(item.salesAmount),
        hasDisplay: Number(item.hasDisplay) === 1,
      }));
    }
  }
}
