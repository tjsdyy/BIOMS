import { NextRequest, NextResponse } from 'next/server';
import { getShopSalespersonDetail } from '@/lib/db/home-queries';
import { getUserFromRequest } from '@/lib/auth/api-auth';

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
    const shopName = searchParams.get('shopName');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!shopName) {
      return NextResponse.json(
        { error: '缺少门店名称参数' },
        { status: 400 }
      );
    }

    const salespersonDetails = await getShopSalespersonDetail({
      shopName,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return NextResponse.json({ salespersonDetails });
  } catch (error) {
    console.error('Error fetching shop salesperson detail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shop salesperson detail' },
      { status: 500 }
    );
  }
}
