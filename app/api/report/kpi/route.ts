import { NextRequest, NextResponse } from 'next/server';
import { getKPIMetrics } from '@/lib/db/queries';
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
    const requestedSalesperson = searchParams.get('salesperson') || undefined;
    // 当有 salesperson 参数时，不需要控制 shop
    const requestedShop = requestedSalesperson ? undefined : (searchParams.get('shop') || undefined);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 应用权限控制
    const shop = getShopFilter(user, requestedShop);
    const salesperson = await getSalespersonFilterAsync(user, requestedSalesperson);

    const metrics = await getKPIMetrics({
      shop,
      salesperson,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching KPI metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KPI metrics' },
      { status: 500 }
    );
  }
}
