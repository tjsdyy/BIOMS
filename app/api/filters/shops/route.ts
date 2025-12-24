import { NextRequest, NextResponse } from 'next/server';
import { getShops } from '@/lib/db/queries';
import { getUserFromRequest } from '@/lib/auth/api-auth';
import { isManager, isAdmin } from '@/lib/auth/permissions';

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

    // 根据用户权限返回门店列表
    if (isAdmin(user)) {
      // 管理员可以看到所有门店
      const shops = await getShops();
      return NextResponse.json({ shops });
    } else if (isManager(user)) {
      // 店长只能看到自己的门店
      if (!user.shopId) {
        return NextResponse.json({ shops: [] });
      }

      // 根据shopId查找对应的门店信息
      const shopIdStr = user.shopId.toString();
      const allShops = await getShops();
      const shops = allShops.filter(shop => shop.value === shopIdStr);
      return NextResponse.json({ shops });
    } else {
      // 普通员工可以看到所有门店（但数据会受其他权限限制）
      const shops = await getShops();
      return NextResponse.json({ shops });
    }
  } catch (error) {
    console.error('Error fetching shops:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shops' },
      { status: 500 }
    );
  }
}
