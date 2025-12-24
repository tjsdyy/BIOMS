import { NextRequest, NextResponse } from 'next/server';
import { getProductRankingByQuantity, mergeRankingWithGlobal } from '@/lib/db/queries';
import { getUserFromRequest } from '@/lib/auth/api-auth';
import { getShopFilter, getSalespersonFilterAsync } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    // 获取用户信息
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: '未授权访问：缺少用户认证信息' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const requestedShop = searchParams.get('shop') || undefined;
    const requestedSalesperson = searchParams.get('salesperson') || undefined;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = searchParams.get('limit');

    // 应用权限控制
    const shop = getShopFilter(user, requestedShop);
    const salesperson = await getSalespersonFilterAsync(user, requestedSalesperson);

    // 执行受限查询（所有角色都需要）
    const rankings = await getProductRankingByQuantity({
      shop,
      salesperson,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined, // 不传limit则返回所有数据
    });

    // 判断是否需要计算占比（shopRatio）
    // 条件：有门店筛选 或 有销售员筛选（即有明确的对比主体）
    const shouldCalculateRatio = shop || salesperson;

    if (shouldCalculateRatio) {
      console.log('=== 需要计算占比 ===');
      console.log('shop:', shop);
      console.log('salesperson:', salesperson);

      // 执行全局查询（不带shop和salesperson筛选）
      const globalRankings = await getProductRankingByQuantity({
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });

      // 合并数据：将全局数据映射到受限数据的totalQuantity
      const mergedRankings = mergeRankingWithGlobal(rankings, globalRankings);

      // 计算门店占比
      const rankingsWithRatio = mergedRankings.map(item => ({
        ...item,
        shopRatio: item.totalQuantity && item.totalQuantity > 0 && item.quantity
          ? (item.quantity / item.totalQuantity) * 100
          : 0
      }));

      console.log('前5条数据的 shopRatio:', rankingsWithRatio.slice(0, 5).map(item => ({
        name: item.goodsName,
        quantity: item.quantity,
        totalQuantity: item.totalQuantity,
        shopRatio: item.shopRatio
      })));

      return NextResponse.json({ rankings: rankingsWithRatio });
    }

    // 管理员未选门店时直接返回（不需要totalQuantity和shopRatio）
    return NextResponse.json({ rankings });
  } catch (error) {
    console.error('Error fetching quantity ranking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quantity ranking' },
      { status: 500 }
    );
  }
}
