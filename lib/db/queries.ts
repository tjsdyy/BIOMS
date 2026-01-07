import prisma from './prisma';
import { Prisma } from '@prisma/client';
import type { FilterParams, KPIMetrics, RankingItem } from '@/types/report';

// ========================================
// 优化后的查询函数 - 使用 report.fur_sell_order_goods 视图
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

// 0. 通过 userId 获取 userName
/**
 * 将 userId 转换为 userName
 * 移除 userId 中的前缀（wx, zy, qt 等），然后从 sales_person 表查询对应的 userName
 * @param userId 用户ID
 * @returns 用户名（userName）
 */
export async function getUserNameByUserId(userId: string): Promise<string | null> {
  const results = await prisma.$queryRaw<Array<{ userName: string }>>`
    SELECT b.userName
    FROM fnjinew2.sales_person b
    WHERE  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
          REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${userId},'wx',''),'zy',''),'qt',''),'qt',''),'ydg',''),'cf','')
          ,'cp',''),'cd',''),'cpxx',''),'zyzs',''),'qh',''),'zs',''),'sy',''),'slt',''),'fz',''),'hz','') ,'zb',''),'gz',''),'xa','') = b.userId
    LIMIT 1
  `;
	if(userId='jiangzhuoran'){
	return '蒋卓冉';
	}

  return results.length > 0 ? results[0].userName : null;
}

// 1. 获取门店列表（从枚举表）- 无需修改
export async function getShops(): Promise<Array<{ name: string; value: string }>> {
  const shops = await prisma.ubiggerEnum.findMany({
    where: { enumName: 'shop' },
    select: { name: true, value: true },
    orderBy: { value: 'asc' },
  });
  return shops.map(s => ({ name: s.name, value: s.value }));
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
      ${params?.shop ? Prisma.sql`AND shopNameDone = ${params.shop}` : Prisma.empty}
      ${params?.startDate ? Prisma.sql`AND payTime >= ${params.startDate}` : Prisma.empty}
      ${params?.endDate ? Prisma.sql`AND payTime <= ${params.endDate}` : Prisma.empty}
      AND shopNameDone NOT IN ('换返货', '项目', '线上', '小程序', '新零售', '小红书', '特卖', '友人', '天猫家居', '积分商城', '天猫(SD)', '深圳卓悦特卖')
      AND goodsBom NOT IN ('dingjin', '0500553', 'FY00049', 'FY00017', '6616801') and goodsBom not like 'FY%'
      AND goodsNum != 0
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
      ${params.shop ? Prisma.sql`AND shopNameDone = ${params.shop}` : Prisma.empty}
      ${params.salesperson ? Prisma.sql`AND doneSales1Name = ${params.salesperson}` : Prisma.empty}
      ${params.startDate ? Prisma.sql`AND payTime >= ${params.startDate}` : Prisma.empty}
      ${params.endDate ? Prisma.sql`AND payTime <= ${params.endDate}` : Prisma.empty}
      AND shopNameDone NOT IN ('换返货', '项目', '线上', '小程序', '新零售', '小红书', '特卖', '友人', '天猫家居', '积分商城', '天猫(SD)', '深圳卓悦特卖')
      AND goodsBom NOT IN ('dingjin', '0500553', 'FY00049', 'FY00017', '6616801') and goodsBom not like 'FY%'
      AND goodsNum != 0
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
      ${params.shop ? Prisma.sql`AND shopNameDone = ${params.shop}` : Prisma.empty}
      ${params.salesperson ? Prisma.sql`AND doneSales1Name = ${params.salesperson}` : Prisma.empty}
      ${params.startDate ? Prisma.sql`AND payTime >= ${params.startDate}` : Prisma.empty}
      ${params.endDate ? Prisma.sql`AND payTime <= ${params.endDate}` : Prisma.empty}
      AND shopNameDone NOT IN ('换返货', '项目', '线上', '小程序', '新零售', '小红书', '特卖', '友人', '天猫家居', '积分商城', '天猫(SD)', '深圳卓悦特卖')
      AND goodsBom NOT IN ('dingjin', '0500553', 'FY00049', 'FY00017', '6616801') and goodsBom not like 'FY%'
      AND goodsNum != 0
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
      ${params.shop ? Prisma.sql`AND shopNameDone = ${params.shop}` : Prisma.empty}
      ${params.salesperson ? Prisma.sql`AND doneSales1Name = ${params.salesperson}` : Prisma.empty}
      ${params.startDate ? Prisma.sql`AND payTime >= ${params.startDate}` : Prisma.empty}
      ${params.endDate ? Prisma.sql`AND payTime <= ${params.endDate}` : Prisma.empty}
      AND shopNameDone NOT IN ('换返货', '项目', '线上', '小程序', '新零售', '小红书', '特卖', '友人', '天猫家居', '积分商城', '天猫(SD)', '深圳卓悦特卖')
      AND goodsBom NOT IN ('dingjin', '0500553', 'FY00049', 'FY00017', '6616801') and goodsBom not like 'FY%'
      AND goodsNum != 0
    GROUP BY goodsNameSpu
    ORDER BY salesAmount DESC
    ${params.limit ? Prisma.sql`LIMIT ${params.limit}` : Prisma.empty}
  `;

  const resultsTotalCompanySales = await prisma.$queryRaw<Array<{
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
      ${params.startDate ? Prisma.sql`AND payTime >= ${params.startDate}` : Prisma.empty}
      ${params.endDate ? Prisma.sql`AND payTime <= ${params.endDate}` : Prisma.empty}
      AND shopNameDone NOT IN ('换返货', '项目', '线上', '小程序', '新零售', '小红书', '特卖', '友人', '天猫家居', '积分商城', '天猫(SD)', '深圳卓悦特卖')
      AND goodsBom NOT IN ('dingjin', '0500553', 'FY00049', 'FY00017', '6616801') and goodsBom not like 'FY%'
      AND goodsNum != 0
    GROUP BY goodsNameSpu
    ORDER BY salesAmount DESC
    ${params.limit ? Prisma.sql`LIMIT ${params.limit}` : Prisma.empty}
  `;

  let resultsTotalCompanySalesRank = resultsTotalCompanySales.map((item, index) => ({
    rank: index + 1,
    goodsName: item.goodsNameSpu,
    goodsSpec: item.goodsSpec,
    salesAmount: item.salesAmount,
  }));

  // 计算总额用于百分比
  const total = results.reduce((sum, item) => sum + item.salesAmount, 0);

  // 创建公司排名map，按goodsName索引
  const companyRankMap = new Map<string, number>();
  resultsTotalCompanySalesRank.forEach(item => {
    companyRankMap.set(item.goodsName, item.rank);
  });

  return results.map((item, index) => {
    const rank = index + 1;
    const companyRank = companyRankMap.get(item.goodsNameSpu);

    // 确定status：根据排名对比
    // rank < companyRank → green（排名更靠前）
    // rank = companyRank → yellow（排名相同）
    // rank > companyRank → red（排名更靠后）
    let status: 'red' | 'yellow' | 'green' = 'yellow';
    if (companyRank !== undefined) {
      if (rank < companyRank) {
        status = 'red';
      } else if (rank > companyRank) {
        status = 'green';
      }
    }

    return {
      rank,
      goodsName: item.goodsNameSpu,
      goodsSpec: item.goodsSpec,
      salesAmount: item.salesAmount,
      percentage: total > 0 ? (item.salesAmount / total) * 100 : 0,
      status,
    };
  });
}

// 6. 获取商品明细 - 优化：使用视图的 doneSales1Name
export async function getProductDetail(params: {
  goodsName: string;
  startDate?: Date;
  endDate?: Date;
  type: 'quantity' | 'sales';
  groupBy?: 'shop' | 'salesperson';
  shopFilter?: string;  // 用于权限控制：查询全部后根据此字段过滤
}) {
  const { goodsName: goodsNameSpu, startDate, endDate, type, groupBy, shopFilter } = params;

  // 根据 groupBy 参数决定按门店还是按销售员统计
  if (groupBy === 'salesperson') {
      // 首先查询公司总销售额
      const companyTotalResult = await prisma.$queryRaw<Array<{
        companyTotalSales: number | null;
      }>>`
        SELECT
          SUM(goodsNum * goodsPrice) as companyTotalSales
        FROM report.fur_sell_order_goods v
        WHERE v.goodsNameSpu = ${goodsNameSpu}
          ${startDate ? Prisma.sql`AND payTime >= ${startDate}` : Prisma.empty}
          ${endDate ? Prisma.sql`AND payTime <= ${endDate}` : Prisma.empty}
          AND shopNameDone NOT IN ('换返货', '项目', '线上', '小程序', '新零售', '小红书', '特卖', '友人', '天猫家居', '积分商城', '天猫(SD)', '深圳卓悦特卖')
          AND goodsBom NOT IN ('dingjin', '0500553', 'FY00049', 'FY00017', '6616801')
          AND goodsBom NOT LIKE 'FY%'
          AND goodsNum != 0
      `;
      const companyTotalSales = Number(companyTotalResult[0]?.companyTotalSales || 0);


	  const shopTotalResult = await prisma.$queryRaw<Array<{
        shopName: string;
        shopTotalSales: number | null;
      }>>`
        SELECT
		shopNameDone as shopName,
          SUM(goodsNum * goodsPrice) as shopTotalSales
        FROM report.fur_sell_order_goods v
        WHERE v.goodsNameSpu = ${goodsNameSpu}
          ${startDate ? Prisma.sql`AND payTime >= ${startDate}` : Prisma.empty}
          ${endDate ? Prisma.sql`AND payTime <= ${endDate}` : Prisma.empty}
          AND shopNameDone NOT IN ('换返货', '项目', '线上', '小程序', '新零售', '小红书', '特卖', '友人', '天猫家居', '积分商城', '天猫(SD)', '深圳卓悦特卖')
          AND goodsBom NOT IN ('dingjin', '0500553', 'FY00049', 'FY00017', '6616801')
          AND goodsBom NOT LIKE 'FY%'
          AND goodsNum != 0
		  group by shopNameDone
      `;


      // 按销售员统计（查询全部，然后根据权限过滤）
      // 第一步：从 sales_person 表获取销售员-门店映射（支持时间筛选）
      const salespersonMainShop = await prisma.$queryRaw<Array<{
        doneSales1Name: string;
        mainShopName: string;
        shopTotalSales: number;
        salesAmount: number;
      }>>`
        SELECT
           v.shopNameDone as mainShopName,  v.doneSales1Name,
		  SUM(v.goodsNum * v.goodsPrice) as salesAmount
        FROM report.fur_sell_order_goods v
        WHERE 1=1
          ${startDate ? Prisma.sql`AND v.payTime >= ${startDate}` : Prisma.empty}
          ${endDate ? Prisma.sql`AND v.payTime <= ${endDate}` : Prisma.empty}
          AND v.shopNameDone NOT IN ('换返货', '项目', '线上', '小程序', '新零售', '小红书', '特卖', '友人', '天猫家居', '积分商城', '天猫(SD)', '深圳卓悦特卖')
          AND v.goodsBom NOT IN ('dingjin', '0500553', 'FY00049', 'FY00017', '6616801')
          AND v.goodsBom NOT LIKE 'FY%'
          AND v.goodsNum != 0
          AND v.doneSales1Name IS NOT NULL and v.doneSales1Name!=''
		  group by v.shopNameDone, v.doneSales1Name
      `;

      // 创建销售员 -> 门店映射
      const salespersonShopMap = new Map(
        salespersonMainShop.map(item => [item.doneSales1Name, {
          shopName: item.mainShopName,
          shopTotalSales: shopTotalResult.find(item2 => item2.shopName === item.mainShopName)?.shopTotalSales || 0
        }])
      );

      // 第二步：查询销售员的商品销售数据
      const results = await prisma.$queryRaw<Array<{
        doneSales1Name: string;
        quantity: bigint;
        salesAmount: number;
        totalSales: number | null;
        hasShopSales: number | null;
      }>>`
        SELECT
          v.doneSales1Name,
          SUM(v.goodsNum) as quantity,
          SUM(v.goodsNum * v.goodsPrice) as salesAmount,
          st.totalSales,
          ${shopFilter ? Prisma.sql`MAX(CASE WHEN v.shopNameDone = ${shopFilter} THEN 1 ELSE 0 END)` : Prisma.sql`1`} as hasShopSales
        FROM report.fur_sell_order_goods v
        LEFT JOIN (
          SELECT
            doneSales1Name,
            SUM(goodsNum * goodsPrice) as totalSales
          FROM report.fur_sell_order_goods
          WHERE 1=1
            ${startDate ? Prisma.sql`AND payTime >= ${startDate}` : Prisma.empty}
            ${endDate ? Prisma.sql`AND payTime <= ${endDate}` : Prisma.empty}
            AND shopNameDone NOT IN ('换返货', '项目', '线上', '小程序', '新零售', '小红书', '特卖', '友人', '天猫家居', '积分商城', '天猫(SD)', '深圳卓悦特卖')
            AND goodsBom NOT IN ('dingjin', '0500553', 'FY00049', 'FY00017', '6616801')
            AND goodsBom NOT LIKE 'FY%'
            AND goodsNum != 0
          GROUP BY doneSales1Name
        ) st ON v.doneSales1Name = st.doneSales1Name
        WHERE v.goodsNameSpu = ${goodsNameSpu}
          ${startDate ? Prisma.sql`AND v.payTime >= ${startDate}` : Prisma.empty}
          ${endDate ? Prisma.sql`AND v.payTime <= ${endDate}` : Prisma.empty}
          AND v.shopNameDone NOT IN ('换返货', '项目', '线上', '小程序', '新零售', '小红书', '特卖', '友人', '天猫家居', '积分商城', '天猫(SD)', '深圳卓悦特卖')
          AND v.goodsBom NOT IN ('dingjin', '0500553', 'FY00049', 'FY00017', '6616801')
          AND v.goodsBom NOT LIKE 'FY%'
          AND v.goodsNum != 0
          AND v.doneSales1Name IS NOT NULL and v.doneSales1Name!=''
        GROUP BY v.doneSales1Name, st.totalSales
        ORDER BY ${type === 'quantity' ? Prisma.sql`quantity` : Prisma.sql`salesAmount`} DESC
      `;

      // 添加全局排名和计算加权金额
      const allResults = results.map((item, index) => {
        const quantity = Number(item.quantity);
        const salesAmount = Number(item.salesAmount);

        // 从 Map 中获取销售员的门店信息
        const shopInfo = salespersonShopMap.get(item.doneSales1Name);
        const shopName = shopInfo?.shopName || '未知门店';
        const shopTotalSales = shopInfo?.shopTotalSales || 0;

        // 计算加权金额 = 个人销售额 / (门店销售额/公司销售额) * 个人销售数量
        // = 个人销售额 * (公司销售额/门店销售额) * 个人销售数量
        let weightedAmount = 0;
        if (shopTotalSales > 0 && companyTotalSales > 0) {
          weightedAmount = salesAmount / (shopTotalSales / companyTotalSales ) * quantity;
        }

        return {
          name: item.doneSales1Name || '未知销售员',
          shopName,
          quantity,
          salesAmount,
          personTotalSales: Number(item.totalSales || 0),
          shopTotalSales,
          companyTotalSales,
          weightedAmount,
          rank: index + 1,  // 全局排名
          hasShopSales: Number(item.hasShopSales) === 1,
        };
      });

      // 计算基于 weightedAmount 的分档排名
      const sortedByWeight = [...allResults].sort((a, b) => b.weightedAmount - a.weightedAmount);
      const rankWeightMap = new Map<string, number>();
      sortedByWeight.forEach((item, index) => {
        const weightRank = index + 1;
        const rankWeight = Math.ceil(weightRank / 10);
        rankWeightMap.set(item.name, rankWeight);
      });

      // 将 rankWeight 添加到所有结果中
      const allResultsWithRankWeight = allResults.map(item => ({
        ...item,
        rankWeight: rankWeightMap.get(item.name) || 0,
      }));

      // 如果有shopFilter，利用 salespersonMainShop 数组筛选对应门店的销售员
      if (shopFilter) {
        // 获取该门店所有销售员名单
        const shopSalespeopleList = salespersonMainShop
          .filter(item => item.mainShopName === shopFilter);

        // 筛选出有销售数据的销售员
        const filteredResults = allResultsWithRankWeight.filter(item =>
          shopSalespeopleList.some(sp => sp.doneSales1Name === item.name)
        );

        // 找出没有销售数据的销售员（在门店人员名单中但不在结果数组中）
        // 排除 salesAmount < 0 的销售员
        const existingSalespeople = new Set(filteredResults.map(item => item.name));
        const missingSalespeopleData = shopSalespeopleList.filter(sp =>
          !existingSalespeople.has(sp.doneSales1Name) && Number(sp.salesAmount || 0) >= 0
        );

        // 获取门店总销售额用于计算
        const shopInfo = salespersonShopMap.get(missingSalespeopleData[0]?.doneSales1Name);
        const shopTotalSales = shopInfo?.shopTotalSales || 0;

        // 为缺失的销售员创建默认记录（从salespersonMainShop提取salesAmount）
        const missingRecords = missingSalespeopleData.map(sp => ({
          name: sp.doneSales1Name,
          shopName: shopFilter,
          quantity: 0,
          salesAmount: 0,
          personTotalSales: Number(sp.salesAmount || 0),
          shopTotalSales,
          companyTotalSales,
          weightedAmount: 0,
          rank: 65, // 排名在最后
          hasShopSales: true,
          rankWeight: 0,
        }));

        // 合并有数据的销售员和无数据的销售员
        return [...filteredResults, ...missingRecords];
      }

      // 没有shopFilter时，追加所有不在排行榜中的销售员
      // 找出没有销售该商品的销售员（在公司人员名单中但不在结果数组中）
      // 排除 salesAmount < 0 的销售员
      const existingAllSalespeople = new Set(allResultsWithRankWeight.map(item => item.name));
      const missingAllSalespeopleData = salespersonMainShop.filter(sp =>
        !existingAllSalespeople.has(sp.doneSales1Name) && Number(sp.salesAmount || 0) >= 0
      );

      // 为缺失的销售员创建默认记录
      const missingAllRecords = missingAllSalespeopleData.map(sp => {
        // 获取该销售员的门店信息
        const shopInfo = salespersonShopMap.get(sp.doneSales1Name);
        const shopName = shopInfo?.shopName || '未知门店';
        const shopTotalSales = shopInfo?.shopTotalSales || 0;

        return {
          name: sp.doneSales1Name,
          shopName,
          quantity: 0,
          salesAmount: 0,
          personTotalSales: Number(sp.salesAmount || 0),
          shopTotalSales,
          companyTotalSales,
          weightedAmount: 0,
          rank: 65, // 排名在最后
          hasShopSales: true,
          rankWeight: 0,
        };
      });

      // 合并有数据的销售员和无数据的销售员
      return [...allResultsWithRankWeight, ...missingAllRecords];
    } else {
      // 按门店统计 - 优化：直接使用 shopName，并判断是否摆场
      const results = await prisma.$queryRaw<Array<{
        shopName: string;
        shop: string;
        quantity: bigint;
        salesAmount: number;
        hasDisplay: number | null;
        totalSales: number | null;
      }>>`
        SELECT
          v.shopNameDone as shopName,
          v.shopNameDone,
          SUM(v.goodsNum) as quantity,
          SUM(v.goodsNum * v.goodsPrice) as salesAmount,
          MAX(CASE WHEN d.goodsName IS NOT NULL THEN 1 ELSE 0 END) as hasDisplay,
          st.totalSales
        FROM report.fur_sell_order_goods v
        LEFT JOIN (
          SELECT
            shopNameDone,
            SUM(goodsNum * goodsPrice) as totalSales
          FROM report.fur_sell_order_goods
          WHERE 1=1
            ${startDate ? Prisma.sql`AND payTime >= ${startDate}` : Prisma.empty}
            ${endDate ? Prisma.sql`AND payTime <= ${endDate}` : Prisma.empty}
            AND shopNameDone NOT IN ('换返货', '项目', '线上', '小程序', '新零售', '小红书', '特卖', '友人', '天猫家居', '积分商城', '天猫(SD)', '深圳卓悦特卖')
            AND goodsBom NOT IN ('dingjin', '0500553', 'FY00049', 'FY00017', '6616801')
            AND goodsBom NOT LIKE 'FY%'
            AND goodsNum != 0
          GROUP BY shopNameDone
        ) st ON v.shopNameDone = st.shopNameDone
        LEFT JOIN (
          SELECT DISTINCT c.name as goodsName, b.shopId as shop
          FROM fnjinew2.stock_goods a
          INNER JOIN fnjinew2.stock_type b ON a.storeBom = b.bom
          INNER JOIN fnjinew2.shop_product_sku c ON c.bom = a.bom
          WHERE a.storeNum > 0 AND b.name LIKE '%摆场%'
        ) d ON v.goodsName = d.goodsName AND v.shop = d.shop
        WHERE v.goodsNameSpu = ${goodsNameSpu}
          ${startDate ? Prisma.sql`AND v.payTime >= ${startDate}` : Prisma.empty}
          ${endDate ? Prisma.sql`AND v.payTime <= ${endDate}` : Prisma.empty}
          AND v.shopNameDone NOT IN ('换返货', '项目', '线上', '小程序', '新零售', '小红书', '特卖', '友人', '天猫家居', '积分商城', '天猫(SD)', '深圳卓悦特卖')
          AND v.goodsBom NOT IN ('dingjin', '0500553', 'FY00049', 'FY00017', '6616801')
          AND v.goodsBom NOT LIKE 'FY%'
          AND v.goodsNum != 0
          AND v.shopNameDone IS NOT NULL and v.doneSales1Name != ''
        GROUP BY v.shopNameDone, st.totalSales
        ORDER BY ${type === 'quantity' ? Prisma.sql`quantity` : Prisma.sql`salesAmount`} DESC
      `;

      // 添加全局排名
      const allResults = results.map((item, index) => ({
        name: item.shopName,
        quantity: Number(item.quantity),
        salesAmount: Number(item.salesAmount),
        hasDisplay: Number(item.hasDisplay) === 1,
        shopTotalSales: Number(item.totalSales || 0),
        rank: index + 1,  // 全局排名
      }));

      // 如果有shopFilter，过滤出对应门店
      if (shopFilter) {
        return allResults.filter(item => item.name === shopFilter);
      }

      return allResults;
    }
}

// 7. 合并受限数据和全局数据
/**
 * 合并受限数据和全局数据
 * 将全局数据的quantity映射到受限数据的totalQuantity
 * @param restrictedData 受权限限制的排行数据
 * @param globalData 全局排行数据（无权限筛选）
 * @returns 合并后的数据（包含totalQuantity字段）
 */
export function mergeRankingWithGlobal(
  restrictedData: RankingItem[],
  globalData: RankingItem[]
): RankingItem[] {
  // 创建全局数据的商品名称到数量的映射
  const globalMap = new Map<string, number>();
  globalData.forEach(item => {
    globalMap.set(item.goodsName, item.quantity || 0);
  });

  // 将全局数据合并到受限数据
  return restrictedData.map(item => ({
    ...item,
    totalQuantity: globalMap.get(item.goodsName),
  }));
}

// 获取产品订单明细
export async function getProductOrderDetails(params: {
  goodsName: string;
  startDate?: Date;
  endDate?: Date;
  shopFilter?: string;
}) {
  const { goodsName: goodsNameSpu, startDate, endDate, shopFilter } = params;

  const results = await prisma.$queryRaw<Array<{
    payTime: Date;
    orderSn: string;
    doneSales1Name: string;
    shopNameDone: string;
    goodsBom: string;
    goodsName: string;
    goodsSpec: string;
    goodsNum: number;
    goodsPrice: number;
  }>>`
    SELECT
      payTime,
      orderSn,
      doneSales1Name,
      shopNameDone,
      goodsBom,
      goodsName,
      goodsSpec,
      goodsNum,
      goodsPrice
    FROM report.fur_sell_order_goods
    WHERE goodsNameSpu = ${goodsNameSpu}
      ${startDate ? Prisma.sql`AND payTime >= ${startDate}` : Prisma.empty}
      ${endDate ? Prisma.sql`AND payTime <= ${endDate}` : Prisma.empty}
      ${shopFilter ? Prisma.sql`AND shopNameDone = ${shopFilter}` : Prisma.empty}
      AND shopNameDone NOT IN ('换返货', '项目', '线上', '小程序', '新零售', '小红书', '特卖', '友人', '天猫家居', '积分商城', '天猫(SD)', '深圳卓悦特卖')
      AND goodsBom NOT IN ('dingjin', '0500553', 'FY00049', 'FY00017', '6616801')
      AND goodsBom NOT LIKE 'FY%'
      AND goodsNum != 0
    ORDER BY payTime DESC
  `;

  return results.map(item => ({
    payTime: item.payTime,
    orderSn: item.orderSn,
    doneSales1Name: item.doneSales1Name,
    shopNameDone: item.shopNameDone,
    goodsBom: item.goodsBom,
    goodsName: item.goodsName,
    goodsSpec: item.goodsSpec,
    goodsNum: Number(item.goodsNum),
    goodsPrice: Number(item.goodsPrice),
  }));
}
