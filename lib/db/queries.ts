import prisma from './prisma';
import { Prisma } from '@prisma/client';
import type { FilterParams, KPIMetrics, RankingItem } from '@/types/report';

// 1. 获取门店列表（从枚举表）
export async function getShops(): Promise<Array<{ name: string; value: string }>> {
  const shops = await prisma.ubiggerEnum.findMany({
    where: { enumName: 'shop' },
    select: { name: true, value: true },
    orderBy: { value: 'asc' },
  });
  return shops.map(s => ({ name: s.name, value: s.value }));
}

// 2. 获取销售员列表（从销售员表）
export async function getSalespeople(shop?: string): Promise<string[]> {
  const salespeople = await prisma.salesPerson.findMany({
    where: {
      enable: 1,
      ...(shop && { shop }),
    },
    select: { userName: true },
    orderBy: { userName: 'asc' },
  });
  return salespeople.map(s => s.userName);
}

// 3. 获取KPI指标
export async function getKPIMetrics(params: FilterParams): Promise<KPIMetrics> {
  // 使用 SQL 查询获取所有统计数据
  const result = await prisma.$queryRaw<[{
    orderCount: bigint,
    totalQuantity: bigint,
    totalSales: number,
    productCount: bigint
  }]>`
    SELECT
      COUNT(DISTINCT so.orderSn) as orderCount,
      COALESCE(SUM(sog.goodsNum), 0) as totalQuantity,
      COALESCE(SUM(sog.goodsNum * sog.goodsPrice), 0) as totalSales,
      COUNT(DISTINCT sog.goodsName) as productCount
    FROM shop_order so
    LEFT JOIN shop_order_goods sog ON so.orderSn = sog.orderSn
    WHERE 1=1
      ${params.shop ? Prisma.sql`AND so.shop = ${params.shop}` : Prisma.empty}
      ${params.salesperson ? Prisma.sql`AND so.doneSales1 = ${params.salesperson}` : Prisma.empty}
      ${params.startDate ? Prisma.sql`AND so.payTime >= ${params.startDate}` : Prisma.empty}
      ${params.endDate ? Prisma.sql`AND so.payTime <= ${params.endDate}` : Prisma.empty}
      AND so.status >= 3 AND so.status != 8 AND so.orderType = 1 AND so.orderTypeSub = 0
      AND sog.goodsBom != 'dingjin' AND sog.goodsBom != '0500553'
  `;

  const stats = result[0];

  return {
    totalQuantity: Number(stats?.totalQuantity || 0),
    totalSales: Number(stats?.totalSales || 0),
    productCount: Number(stats?.productCount || 0),
    orderCount: Number(stats?.orderCount || 0),
  };
}

// 4. 获取商品销售数量排行
export async function getProductRankingByQuantity(
  params: FilterParams & { limit?: number }
): Promise<RankingItem[]> {
  const limit = params.limit || 20;

  const results = await prisma.$queryRaw<Array<{
    goodsName: string;
    goodsSpec: string;
    quantity: bigint;
  }>>`
    SELECT
      sog.goodsName,
      sog.goodsSpec,
      SUM(sog.goodsNum) as quantity
    FROM shop_order_goods sog
    INNER JOIN shop_order so ON sog.orderSn = so.orderSn
    WHERE 1=1
      ${params.shop ? Prisma.sql`AND so.shop = ${params.shop}` : Prisma.empty}
      ${params.salesperson ? Prisma.sql`AND so.doneSales1 = ${params.salesperson}` : Prisma.empty}
      ${params.startDate ? Prisma.sql`AND so.payTime >= ${params.startDate}` : Prisma.empty}
      ${params.endDate ? Prisma.sql`AND so.payTime <= ${params.endDate}` : Prisma.empty}
      AND so.status >= 3 AND so.status != 8 AND so.orderType = 1 AND so.orderTypeSub = 0
      AND sog.goodsBom != 'dingjin' AND sog.goodsBom != '0500553'
    GROUP BY sog.goodsName, sog.goodsSpec
    ORDER BY quantity DESC
    LIMIT ${limit}
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

// 5. 获取商品销售金额排行
export async function getProductRankingBySales(
  params: FilterParams & { limit?: number }
): Promise<RankingItem[]> {
  const limit = params.limit || 20;

  const results = await prisma.$queryRaw<Array<{
    goodsName: string;
    goodsSpec: string;
    salesAmount: number;
  }>>`
    SELECT
      sog.goodsName,
      sog.goodsSpec,
      SUM(sog.goodsNum * sog.goodsPrice) as salesAmount
    FROM shop_order_goods sog
    INNER JOIN shop_order so ON sog.orderSn = so.orderSn
    WHERE 1=1
      ${params.shop ? Prisma.sql`AND so.shop = ${params.shop}` : Prisma.empty}
      ${params.salesperson ? Prisma.sql`AND so.doneSales1 = ${params.salesperson}` : Prisma.empty}
      ${params.startDate ? Prisma.sql`AND so.payTime >= ${params.startDate}` : Prisma.empty}
      ${params.endDate ? Prisma.sql`AND so.payTime <= ${params.endDate}` : Prisma.empty}
      AND so.status >= 3 AND so.status != 8 AND so.orderType = 1 AND so.orderTypeSub = 0
      AND sog.goodsBom != 'dingjin' AND sog.goodsBom != '0500553'
    GROUP BY sog.goodsName, sog.goodsSpec
    ORDER BY salesAmount DESC
    LIMIT ${limit}
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

// 6. 获取商品明细（按门店或按销售员）
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
    // 如果选择了门店，按销售员统计
    const results = await prisma.$queryRaw<Array<{
      userName: string;
      quantity: bigint;
      salesAmount: number;
    }>>`
      SELECT
        sp.userName,
        SUM(sog.goodsNum) as quantity,
        SUM(sog.goodsNum * sog.goodsPrice) as salesAmount
      FROM shop_order_goods sog
      INNER JOIN shop_order so ON sog.orderSn = so.orderSn
      LEFT JOIN sales_person sp ON so.doneSales1 = sp.userId AND sp.enable = 1
      WHERE sog.goodsName = ${goodsName}
        AND so.shop = ${shop}
        ${startDate ? Prisma.sql`AND so.payTime >= ${startDate}` : Prisma.empty}
        ${endDate ? Prisma.sql`AND so.payTime <= ${endDate}` : Prisma.empty}
        AND so.status >= 3 AND so.status != 8 AND so.orderType = 1 AND so.orderTypeSub = 0
        AND sog.goodsBom != 'dingjin' AND sog.goodsBom != '0500553'
      GROUP BY sp.userName
      ORDER BY ${type === 'quantity' ? Prisma.sql`quantity` : Prisma.sql`salesAmount`} DESC
    `;

    return results.map((item) => ({
      name: item.userName || '未知销售员',
      quantity: Number(item.quantity),
      salesAmount: Number(item.salesAmount),
    }));
  } else {
    // 如果是全部门店，根据 groupBy 参数决定按门店还是按销售员统计
    if (groupBy === 'salesperson') {
      // 按销售员统计（全部门店）
      const results = await prisma.$queryRaw<Array<{
        userName: string;
        quantity: bigint;
        salesAmount: number;
      }>>`
        SELECT
          sp.userName,
          SUM(sog.goodsNum) as quantity,
          SUM(sog.goodsNum * sog.goodsPrice) as salesAmount
        FROM shop_order_goods sog
        INNER JOIN shop_order so ON sog.orderSn = so.orderSn
        LEFT JOIN sales_person sp ON so.doneSales1 = sp.userId AND sp.enable = 1
        WHERE sog.goodsName = ${goodsName}
          ${startDate ? Prisma.sql`AND so.payTime >= ${startDate}` : Prisma.empty}
          ${endDate ? Prisma.sql`AND so.payTime <= ${endDate}` : Prisma.empty}
          AND so.status >= 3 AND so.status != 8 AND so.orderType = 1 AND so.orderTypeSub = 0
          AND sog.goodsBom != 'dingjin' AND sog.goodsBom != '0500553'
        GROUP BY sp.userName
        ORDER BY ${type === 'quantity' ? Prisma.sql`quantity` : Prisma.sql`salesAmount`} DESC
      `;

      return results.map((item) => ({
        name: item.userName || '未知销售员',
        quantity: Number(item.quantity),
        salesAmount: Number(item.salesAmount),
      }));
    } else {
      // 按门店统计，直接 JOIN 获取门店名称
      const results = await prisma.$queryRaw<Array<{
        shopName: string;
        quantity: bigint;
        salesAmount: number;
      }>>`
        SELECT
          COALESCE(ue.name, so.shop) as shopName,
          SUM(sog.goodsNum) as quantity,
          SUM(sog.goodsNum * sog.goodsPrice) as salesAmount
        FROM shop_order_goods sog
        INNER JOIN shop_order so ON sog.orderSn = so.orderSn
        LEFT JOIN ubigger_enum ue ON ue.value = so.shop AND ue.enumName = 'shop'
        WHERE sog.goodsName = ${goodsName}
          ${startDate ? Prisma.sql`AND so.payTime >= ${startDate}` : Prisma.empty}
          ${endDate ? Prisma.sql`AND so.payTime <= ${endDate}` : Prisma.empty}
          AND so.status >= 3 AND so.status != 8 AND so.orderType = 1 AND so.orderTypeSub = 0
          AND sog.goodsBom != 'dingjin' AND sog.goodsBom != '0500553'
        GROUP BY so.shop, ue.name
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
