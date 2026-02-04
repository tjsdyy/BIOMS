import { NextRequest, NextResponse } from 'next/server';
import { getRankingBySalesperson } from '@/lib/db/home-queries';
import { getUserFromRequest } from '@/lib/auth/api-auth';
import { getShopFilter } from '@/lib/auth/permissions';

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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = searchParams.get('limit');

    // 应用权限控制
    const shop = getShopFilter(user, requestedShop);

    const rankings = await getRankingBySalesperson({
      shop,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });

    return NextResponse.json({ rankings });
  } catch (error) {
    console.error('Error fetching salesperson ranking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch salesperson ranking' },
      { status: 500 }
    );
  }
}
