import { NextRequest, NextResponse } from 'next/server';
import { getProductDetail } from '@/lib/db/queries';
import { getUserFromRequest } from '@/lib/auth/api-auth';
import { getShopFilter, isEmployee, getSalespersonFilterAsync } from '@/lib/auth/permissions';

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
    const type = searchParams.get('type') as 'quantity' | 'sales';
    const groupBy = searchParams.get('groupBy') as 'shop' | 'salesperson' | undefined;

    // 3. 应用权限控制
    const shop = getShopFilter(user, requestedShop);

    if (!goodsName || !type) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // 4. 调用查询，传递shopFilter参数（查询全部数据，然后根据shopFilter过滤）
    const details = await getProductDetail({
      goodsName,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      type,
      groupBy,
      shopFilter: shop,  // 权限过滤：查询全部数据后，根据shopFilter筛选并返回全局排名
    });

    // 5. 如果是员工且查询销售员排行，只返回员工自己的数据
    if (isEmployee(user) && groupBy === 'salesperson') {
      const employeeName = await getSalespersonFilterAsync(user, undefined);
      if (employeeName) {
        const filteredDetails = details.filter(item => item.name === employeeName);
        return NextResponse.json({ details: filteredDetails });
      }
    }

    return NextResponse.json({ details });
  } catch (error) {
    console.error('Error fetching product detail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product detail' },
      { status: 500 }
    );
  }
}
