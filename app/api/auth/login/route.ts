import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const { userId, password } = await request.json();

    // 验证输入
    if (!userId || !password) {
      return NextResponse.json(
        { error: '用户ID和密码不能为空' },
        { status: 400 }
      );
    }

    // 从数据库查询用户
    const user = await prisma.ubiggerAdmRoleUser.findUnique({
      where: {
        userId: userId
      },
      select: {
        id: true,
        userId: true,
        password: true,
        roleIdTotal: true,
        shopId: true
      }
    });

    // 检查用户是否存在
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 401 }
      );
    }

    // 验证密码（这里假设密码是明文存储，在实际应用中应该使用哈希）
    if (user.password !== password) {
      return NextResponse.json(
        { error: '密码错误' },
        { status: 401 }
      );
    }

    // 查询门店名称
    let shopName: string | undefined;
    if (user.shopId !== null && user.shopId !== undefined) {
      const shopEnum = await prisma.ubiggerEnum.findFirst({
        where: {
          enumName: 'shop',
          value: user.shopId.toString()
        },
        select: {
          name: true
        }
      });
      shopName = shopEnum?.name;
    }

    // 登录成功，返回用户信息（不包含密码）
    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        userId: user.userId,
        roleIdTotal: user.roleIdTotal,
        shopId: user.shopId,
        shopName: shopName
      },
      message: '登录成功'
    });

  } catch (error: any) {
    console.error('Login API error:', error);
    return NextResponse.json(
      {
        error: '登录过程中发生错误',
        details: error.message
      },
      { status: 500 }
    );
  }
}