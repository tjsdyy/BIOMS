import { NextRequest, NextResponse } from 'next/server';
import { getRankingByShop } from '@/lib/db/home-queries';
import { getUserFromRequest } from '@/lib/auth/api-auth';
import { getSalespersonFilterAsync } from '@/lib/auth/permissions';

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
    const requestedSalesperson = searchParams.get('salesperson') || undefined;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = searchParams.get('limit');

    // 应用权限控制 - 门店排行榜不筛选特定门店，只筛选销售员
    const salesperson = await getSalespersonFilterAsync(user, requestedSalesperson);

    const rankings = await getRankingByShop({
      salesperson,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });

    return NextResponse.json({ rankings });
  } catch (error) {
    console.error('Error fetching shop ranking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shop ranking' },
      { status: 500 }
    );
  }
}
