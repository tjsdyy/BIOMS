import { NextRequest, NextResponse } from 'next/server';
import { getSalespersonBrandDetail } from '@/lib/db/home-queries';
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
    const salespersonName = searchParams.get('salespersonName');
    const requestedShop = searchParams.get('shop') || undefined;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!salespersonName) {
      return NextResponse.json(
        { error: '缺少销售员名称参数' },
        { status: 400 }
      );
    }

    // 应用权限控制
    const shop = getShopFilter(user, requestedShop);

    const brandDetails = await getSalespersonBrandDetail({
      salespersonName,
      shop,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return NextResponse.json({ brandDetails });
  } catch (error) {
    console.error('Error fetching salesperson brand detail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch salesperson brand detail' },
      { status: 500 }
    );
  }
}
