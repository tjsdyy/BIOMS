import { NextRequest, NextResponse } from 'next/server';
import { getShopSalespersonDetail, getShopSkuRanking } from '@/lib/db/home-queries';
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

    const params = {
      shopName,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    // 并行查询销售员排行和SKU排行
    const [salespersonDetails, skuDetails] = await Promise.all([
      getShopSalespersonDetail(params),
      getShopSkuRanking({ ...params, limit: 30 }),
    ]);

    return NextResponse.json({ salespersonDetails, skuDetails });
  } catch (error) {
    console.error('Error fetching shop detail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shop detail' },
      { status: 500 }
    );
  }
}
