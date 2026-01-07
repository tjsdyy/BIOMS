import { NextRequest, NextResponse } from 'next/server';
import { getProductOrderDetails } from '@/lib/db/queries';
import { getUserFromRequest } from '@/lib/auth/api-auth';
import { getShopFilter } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    // 1. 验证用户身份
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: '未授权访问：缺少用户认证信息' },
        { status: 401 }
      );
    }

    // 2. 获取请求参数
    const searchParams = request.nextUrl.searchParams;
    const goodsName = searchParams.get('goodsName');
    const requestedShop = searchParams.get('shop') || undefined;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 3. 应用权限控制
    const shop = getShopFilter(user, requestedShop);

    if (!goodsName) {
      return NextResponse.json(
        { error: 'Missing required parameter: goodsName' },
        { status: 400 }
      );
    }

    // 4. 调用查询
    const orderDetails = await getProductOrderDetails({
      goodsName,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      shopFilter: shop,
    });

    return NextResponse.json({ orderDetails });
  } catch (error) {
    console.error('Error fetching product order details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product order details' },
      { status: 500 }
    );
  }
}
