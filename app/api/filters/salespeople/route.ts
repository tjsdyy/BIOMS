import { NextRequest, NextResponse } from 'next/server';
import { getSalespeople } from '@/lib/db/queries';
import { getUserFromRequest } from '@/lib/auth/api-auth';
import { getShopFilter, isEmployee } from '@/lib/auth/permissions';

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

    // 应用权限控制：店长只能查看自己门店的数据
    const shop = getShopFilter(user, requestedShop);

    // 如果是普通员工，只返回自己的名字
    if (isEmployee(user)) {
      return NextResponse.json({ salespeople: [user.userId] });
    }

    // 管理员和店长可以看到筛选范围内的所有销售员
    const salespeople = await getSalespeople({
      shop,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return NextResponse.json({ salespeople });
  } catch (error) {
    console.error('Error fetching salespeople:', error);
    return NextResponse.json(
      { error: 'Failed to fetch salespeople' },
      { status: 500 }
    );
  }
}
