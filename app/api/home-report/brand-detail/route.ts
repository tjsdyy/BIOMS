import { NextRequest, NextResponse } from 'next/server';
import { getBrandSalespersonDetail } from '@/lib/db/home-queries';
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
    const brandName = searchParams.get('brandName');
    const requestedShop = searchParams.get('shop') || undefined;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!brandName) {
      return NextResponse.json(
        { error: '缺少品牌名称参数' },
        { status: 400 }
      );
    }

    // 应用权限控制
    const shop = getShopFilter(user, requestedShop);

    const salespersonDetails = await getBrandSalespersonDetail({
      brandName,
      shop,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return NextResponse.json({ salespersonDetails });
  } catch (error) {
    console.error('Error fetching brand salesperson detail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brand salesperson detail' },
      { status: 500 }
    );
  }
}
