import prisma from './prisma';
import { Prisma } from '@prisma/client';
import type { HomeFilterParams, HomeKPIMetrics, HomeRankingItem } from '@/types/home-report';

// ========================================
// 家居报表查询函数 - 使用 report.gcr_sell_order_goods 表
// ========================================

// 全局过滤：排除的门店列表（非实体门店）
const EXCLUDED_SHOPS = [
  '换返货',
  '项目',
  '线上',
  '小程序',
  '新零售',
  '小红书',
  '特卖',
  '友人',
  '天猫家居',
  '积分商城',
  '天猫(SD)',
  '深圳卓悦特卖',
];

// 1. 获取家居报表销售员列表
export async function getHomeSalespeople(params?: {
  shop?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<string[]> {
  const results = await prisma.$queryRaw<Array<{ doneSales1Name: string }>>`
    SELECT DISTINCT doneSales1Name
    FROM report.gcr_sell_order_goods
    WHERE doneSales1Name IS NOT NULL
      AND doneSales1Name != ''
      ${params?.shop ? Prisma.sql`AND shopName = ${params.shop}` : Prisma.empty}
      ${params?.startDate ? Prisma.sql`AND payTime >= ${params.startDate}` : Prisma.empty}
      ${params?.endDate ? Prisma.sql`AND payTime <= ${params.endDate}` : Prisma.empty}
      AND shopName NOT IN ('换返货', '项目', '线上', '小程序', '新零售', '小红书', '特卖', '友人', '天猫家居', '积分商城', '天猫(SD)', '深圳卓悦特卖')
      AND goodsNum != 0
    ORDER BY doneSales1Name ASC
  `;
  return results.map(r => r.doneSales1Name);
}

// 2. 获取家居KPI指标
export async function getHomeKPIMetrics(params: HomeFilterParams): Promise<HomeKPIMetrics> {
  const result = await prisma.$queryRaw<[{
    orderCount: bigint,
    totalQuantity: bigint,
    totalSales: number,
    brandCount: bigint
  }]>`
    SELECT
      COUNT(DISTINCT orderSn) as orderCount,
      COALESCE(SUM(goodsNum), 0) as totalQuantity,
      COALESCE(SUM(goodsNum * goodsPrice), 0) as totalSales,
      COUNT(DISTINCT CASE WHEN brandName IS NOT NULL AND brandName != '' THEN brandName END) as brandCount
    FROM report.gcr_sell_order_goods
    WHERE 1=1
      ${params.shop ? Prisma.sql`AND shopName = ${params.shop}` : Prisma.empty}
      ${params.salesperson ? Prisma.sql`AND doneSales1Name = ${params.salesperson}` : Prisma.empty}
      ${params.startDate ? Prisma.sql`AND payTime >= ${params.startDate}` : Prisma.empty}
      ${params.endDate ? Prisma.sql`AND payTime <= ${params.endDate}` : Prisma.empty}
      AND shopName NOT IN ('换返货', '项目', '线上', '小程序', '新零售', '小红书', '特卖', '友人', '天猫家居', '积分商城', '天猫(SD)', '深圳卓悦特卖')
      AND goodsNum != 0
  `;

  const stats = result[0];

  return {
    totalQuantity: Number(stats?.totalQuantity || 0),
    totalSales: Number(stats?.totalSales || 0),
    brandCount: Number(stats?.brandCount || 0),
    orderCount: Number(stats?.orderCount || 0),
  };
}

// 3. 按品牌获取排行榜
export async function getRankingByBrand(
  params: HomeFilterParams & { limit?: number }
): Promise<HomeRankingItem[]> {
  const results = await prisma.$queryRaw<Array<{
    brandName: string;
    quantity: bigint;
    salesAmount: number;
    orderCount: bigint;
  }>>`
    SELECT
      brandName,
      SUM(goodsNum) as quantity,
      SUM(goodsNum * goodsPrice) as salesAmount,
      COUNT(DISTINCT orderSn) as orderCount
    FROM report.gcr_sell_order_goods
    WHERE 1=1
      ${params.shop ? Prisma.sql`AND shopName = ${params.shop}` : Prisma.empty}
      ${params.salesperson ? Prisma.sql`AND doneSales1Name = ${params.salesperson}` : Prisma.empty}
      ${params.startDate ? Prisma.sql`AND payTime >= ${params.startDate}` : Prisma.empty}
      ${params.endDate ? Prisma.sql`AND payTime <= ${params.endDate}` : Prisma.empty}
      AND shopName NOT IN ('换返货', '项目', '线上', '小程序', '新零售', '小红书', '特卖', '友人', '天猫家居', '积分商城', '天猫(SD)', '深圳卓悦特卖')
      AND goodsNum != 0
      AND brandName IS NOT NULL AND brandName != ''
    GROUP BY brandName
    ORDER BY salesAmount DESC
    ${params.limit ? Prisma.sql`LIMIT ${params.limit}` : Prisma.empty}
  `;

  // 计算总额用于百分比
  const total = results.reduce((sum, item) => sum + Number(item.salesAmount || 0), 0);

  return results.map((item, index) => {
    const salesAmount = Number(item.salesAmount || 0);
    return {
      rank: index + 1,
      name: item.brandName,
      quantity: Number(item.quantity),
      salesAmount,
      percentage: total > 0 ? (salesAmount / total) * 100 : 0,
      orderCount: Number(item.orderCount),
    };
  });
}

// 4. 按门店获取排行榜
export async function getRankingByShop(
  params: HomeFilterParams & { limit?: number }
): Promise<HomeRankingItem[]> {
  const results = await prisma.$queryRaw<Array<{
    shopName: string;
    quantity: bigint;
    salesAmount: number;
    orderCount: bigint;
  }>>`
    SELECT
      shopName,
      SUM(goodsNum) as quantity,
      SUM(goodsNum * goodsPrice) as salesAmount,
      COUNT(DISTINCT orderSn) as orderCount
    FROM report.gcr_sell_order_goods
    WHERE 1=1
      ${params.salesperson ? Prisma.sql`AND doneSales1Name = ${params.salesperson}` : Prisma.empty}
      ${params.startDate ? Prisma.sql`AND payTime >= ${params.startDate}` : Prisma.empty}
      ${params.endDate ? Prisma.sql`AND payTime <= ${params.endDate}` : Prisma.empty}
      AND shopName NOT IN ('换返货', '项目', '线上', '小程序', '新零售', '小红书', '特卖', '友人', '天猫家居', '积分商城', '天猫(SD)', '深圳卓悦特卖')
      AND goodsNum != 0
      AND shopName IS NOT NULL AND shopName != ''
    GROUP BY shopName
    ORDER BY salesAmount DESC
    ${params.limit ? Prisma.sql`LIMIT ${params.limit}` : Prisma.empty}
  `;

  // 计算总额用于百分比
  const total = results.reduce((sum, item) => sum + Number(item.salesAmount || 0), 0);

  return results.map((item, index) => {
    const salesAmount = Number(item.salesAmount || 0);
    return {
      rank: index + 1,
      name: item.shopName,
      quantity: Number(item.quantity),
      salesAmount,
      percentage: total > 0 ? (salesAmount / total) * 100 : 0,
      orderCount: Number(item.orderCount),
    };
  });
}

// 5. 按销售员获取排行榜
export async function getRankingBySalesperson(
  params: HomeFilterParams & { limit?: number }
): Promise<HomeRankingItem[]> {
  const results = await prisma.$queryRaw<Array<{
    doneSales1Name: string;
    quantity: bigint;
    salesAmount: number;
    orderCount: bigint;
  }>>`
    SELECT
      doneSales1Name,
      SUM(goodsNum) as quantity,
      SUM(goodsNum * goodsPrice) as salesAmount,
      COUNT(DISTINCT orderSn) as orderCount
    FROM report.gcr_sell_order_goods
    WHERE 1=1
      ${params.shop ? Prisma.sql`AND shopName = ${params.shop}` : Prisma.empty}
      ${params.startDate ? Prisma.sql`AND payTime >= ${params.startDate}` : Prisma.empty}
      ${params.endDate ? Prisma.sql`AND payTime <= ${params.endDate}` : Prisma.empty}
      AND shopName NOT IN ('换返货', '项目', '线上', '小程序', '新零售', '小红书', '特卖', '友人', '天猫家居', '积分商城', '天猫(SD)', '深圳卓悦特卖')
      AND goodsNum != 0
      AND doneSales1Name IS NOT NULL AND doneSales1Name != ''
    GROUP BY doneSales1Name
    ORDER BY salesAmount DESC
    ${params.limit ? Prisma.sql`LIMIT ${params.limit}` : Prisma.empty}
  `;

  // 计算总额用于百分比
  const total = results.reduce((sum, item) => sum + Number(item.salesAmount || 0), 0);

  return results.map((item, index) => {
    const salesAmount = Number(item.salesAmount || 0);
    return {
      rank: index + 1,
      name: item.doneSales1Name,
      quantity: Number(item.quantity),
      salesAmount,
      percentage: total > 0 ? (salesAmount / total) * 100 : 0,
      orderCount: Number(item.orderCount),
    };
  });
}

// 6. 获取指定品牌下的SKU排行（用于品牌详情弹窗）
export async function getBrandSkuRanking(
  params: HomeFilterParams & { brandName: string; limit?: number }
): Promise<HomeRankingItem[]> {
  const results = await prisma.$queryRaw<Array<{
    goodsName: string;
    quantity: bigint;
    salesAmount: number;
    orderCount: bigint;
  }>>`
    SELECT
      goodsName,
      SUM(goodsNum) as quantity,
      SUM(goodsNum * goodsPrice) as salesAmount,
      COUNT(DISTINCT orderSn) as orderCount
    FROM report.gcr_sell_order_goods
    WHERE brandName = ${params.brandName}
      ${params.shop ? Prisma.sql`AND shopName = ${params.shop}` : Prisma.empty}
      ${params.startDate ? Prisma.sql`AND payTime >= ${params.startDate}` : Prisma.empty}
      ${params.endDate ? Prisma.sql`AND payTime <= ${params.endDate}` : Prisma.empty}
      AND shopName NOT IN ('换返货', '项目', '线上', '小程序', '新零售', '小红书', '特卖', '友人', '天猫家居', '积分商城', '天猫(SD)', '深圳卓悦特卖')
      AND goodsNum != 0
      AND goodsName IS NOT NULL AND goodsName != ''
    GROUP BY goodsName
    ORDER BY salesAmount DESC
    LIMIT ${params.limit || 30}
  `;

  // 计算总额用于百分比
  const total = results.reduce((sum, item) => sum + Number(item.salesAmount || 0), 0);

  return results.map((item, index) => {
    const salesAmount = Number(item.salesAmount || 0);
    return {
      rank: index + 1,
      name: item.goodsName,
      quantity: Number(item.quantity),
      salesAmount,
      percentage: total > 0 ? (salesAmount / total) * 100 : 0,
      orderCount: Number(item.orderCount),
    };
  });
}

// 7. 获取指定门店下的SKU排行（用于门店详情弹窗）
export async function getShopSkuRanking(
  params: HomeFilterParams & { shopName: string; limit?: number }
): Promise<HomeRankingItem[]> {
  const results = await prisma.$queryRaw<Array<{
    goodsName: string;
    quantity: bigint;
    salesAmount: number;
    orderCount: bigint;
  }>>`
    SELECT
      goodsName,
      SUM(goodsNum) as quantity,
      SUM(goodsNum * goodsPrice) as salesAmount,
      COUNT(DISTINCT orderSn) as orderCount
    FROM report.gcr_sell_order_goods
    WHERE shopName = ${params.shopName}
      ${params.startDate ? Prisma.sql`AND payTime >= ${params.startDate}` : Prisma.empty}
      ${params.endDate ? Prisma.sql`AND payTime <= ${params.endDate}` : Prisma.empty}
      AND shopName NOT IN ('换返货', '项目', '线上', '小程序', '新零售', '小红书', '特卖', '友人', '天猫家居', '积分商城', '天猫(SD)', '深圳卓悦特卖')
      AND goodsNum != 0
      AND goodsName IS NOT NULL AND goodsName != ''
    GROUP BY goodsName
    ORDER BY salesAmount DESC
    LIMIT ${params.limit || 30}
  `;

  // 计算总额用于百分比
  const total = results.reduce((sum, item) => sum + Number(item.salesAmount || 0), 0);

  return results.map((item, index) => {
    const salesAmount = Number(item.salesAmount || 0);
    return {
      rank: index + 1,
      name: item.goodsName,
      quantity: Number(item.quantity),
      salesAmount,
      percentage: total > 0 ? (salesAmount / total) * 100 : 0,
      orderCount: Number(item.orderCount),
    };
  });
}

// 8. 获取指定销售员的品牌销售排行（用于销售员详情弹窗）
export async function getSalespersonBrandDetail(
  params: HomeFilterParams & { salespersonName: string }
): Promise<HomeRankingItem[]> {
  const results = await prisma.$queryRaw<Array<{
    brandName: string;
    quantity: bigint;
    salesAmount: number;
    orderCount: bigint;
  }>>`
    SELECT
      brandName,
      SUM(goodsNum) as quantity,
      SUM(goodsNum * goodsPrice) as salesAmount,
      COUNT(DISTINCT orderSn) as orderCount
    FROM report.gcr_sell_order_goods
    WHERE doneSales1Name = ${params.salespersonName}
      ${params.shop ? Prisma.sql`AND shopName = ${params.shop}` : Prisma.empty}
      ${params.startDate ? Prisma.sql`AND payTime >= ${params.startDate}` : Prisma.empty}
      ${params.endDate ? Prisma.sql`AND payTime <= ${params.endDate}` : Prisma.empty}
      AND shopName NOT IN ('换返货', '项目', '线上', '小程序', '新零售', '小红书', '特卖', '友人', '天猫家居', '积分商城', '天猫(SD)', '深圳卓悦特卖')
      AND goodsNum != 0
      AND brandName IS NOT NULL AND brandName != ''
    GROUP BY brandName
    ORDER BY salesAmount DESC
  `;

  // 计算总额用于百分比
  const total = results.reduce((sum, item) => sum + Number(item.salesAmount || 0), 0);

  return results.map((item, index) => {
    const salesAmount = Number(item.salesAmount || 0);
    return {
      rank: index + 1,
      name: item.brandName,
      quantity: Number(item.quantity),
      salesAmount,
      percentage: total > 0 ? (salesAmount / total) * 100 : 0,
      orderCount: Number(item.orderCount),
    };
  });
}

// 7. 获取指定品牌下的销售员排行（用于品牌详情弹窗）
export async function getBrandSalespersonDetail(
  params: HomeFilterParams & { brandName: string }
): Promise<HomeRankingItem[]> {
  const results = await prisma.$queryRaw<Array<{
    doneSales1Name: string;
    quantity: bigint;
    salesAmount: number;
    orderCount: bigint;
  }>>`
    SELECT
      doneSales1Name,
      SUM(goodsNum) as quantity,
      SUM(goodsNum * goodsPrice) as salesAmount,
      COUNT(DISTINCT orderSn) as orderCount
    FROM report.gcr_sell_order_goods
    WHERE brandName = ${params.brandName}
      ${params.shop ? Prisma.sql`AND shopName = ${params.shop}` : Prisma.empty}
      ${params.startDate ? Prisma.sql`AND payTime >= ${params.startDate}` : Prisma.empty}
      ${params.endDate ? Prisma.sql`AND payTime <= ${params.endDate}` : Prisma.empty}
      AND shopName NOT IN ('换返货', '项目', '线上', '小程序', '新零售', '小红书', '特卖', '友人', '天猫家居', '积分商城', '天猫(SD)', '深圳卓悦特卖')
      AND goodsNum != 0
      AND doneSales1Name IS NOT NULL AND doneSales1Name != ''
    GROUP BY doneSales1Name
    ORDER BY salesAmount DESC
  `;

  // 计算总额用于百分比
  const total = results.reduce((sum, item) => sum + Number(item.salesAmount || 0), 0);

  return results.map((item, index) => {
    const salesAmount = Number(item.salesAmount || 0);
    return {
      rank: index + 1,
      name: item.doneSales1Name,
      quantity: Number(item.quantity),
      salesAmount,
      percentage: total > 0 ? (salesAmount / total) * 100 : 0,
      orderCount: Number(item.orderCount),
    };
  });
}

// 7. 获取指定门店下的销售员排行（用于门店详情弹窗）
export async function getShopSalespersonDetail(
  params: HomeFilterParams & { shopName: string }
): Promise<HomeRankingItem[]> {
  const results = await prisma.$queryRaw<Array<{
    doneSales1Name: string;
    quantity: bigint;
    salesAmount: number;
    orderCount: bigint;
  }>>`
    SELECT
      doneSales1Name,
      SUM(goodsNum) as quantity,
      SUM(goodsNum * goodsPrice) as salesAmount,
      COUNT(DISTINCT orderSn) as orderCount
    FROM report.gcr_sell_order_goods
    WHERE shopName = ${params.shopName}
      ${params.startDate ? Prisma.sql`AND payTime >= ${params.startDate}` : Prisma.empty}
      ${params.endDate ? Prisma.sql`AND payTime <= ${params.endDate}` : Prisma.empty}
      AND shopName NOT IN ('换返货', '项目', '线上', '小程序', '新零售', '小红书', '特卖', '友人', '天猫家居', '积分商城', '天猫(SD)', '深圳卓悦特卖')
      AND goodsNum != 0
      AND doneSales1Name IS NOT NULL AND doneSales1Name != ''
    GROUP BY doneSales1Name
    ORDER BY salesAmount DESC
  `;

  // 计算总额用于百分比
  const total = results.reduce((sum, item) => sum + Number(item.salesAmount || 0), 0);

  return results.map((item, index) => {
    const salesAmount = Number(item.salesAmount || 0);
    return {
      rank: index + 1,
      name: item.doneSales1Name,
      quantity: Number(item.quantity),
      salesAmount,
      percentage: total > 0 ? (salesAmount / total) * 100 : 0,
      orderCount: Number(item.orderCount),
    };
  });
}
