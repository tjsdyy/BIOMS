import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET() {
  try {
    // 测试基本查询
    const orderCount = await prisma.shopOrder.count();

    // 获取第一条订单
    const firstOrder = await prisma.shopOrder.findFirst();

    // 获取门店列表
    const shops = await prisma.ubiggerEnum.findMany({
      where: { enumName: 'shop' },
      take: 5,
    });

    return NextResponse.json({
      success: true,
      data: {
        orderCount,
        firstOrder,
        shops: shops.length,
      },
    });
  } catch (error: any) {
    console.error('Test API error:', error);
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
