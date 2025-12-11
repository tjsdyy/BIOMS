import { NextRequest, NextResponse } from 'next/server';
import { getProductDetail } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const goodsName = searchParams.get('goodsName');
    const shop = searchParams.get('shop') || undefined;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type') as 'quantity' | 'sales';
    const groupBy = searchParams.get('groupBy') as 'shop' | 'salesperson' | undefined;

    if (!goodsName || !type) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const details = await getProductDetail({
      goodsName,
      shop,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      type,
      groupBy,
    });

    return NextResponse.json({ details });
  } catch (error) {
    console.error('Error fetching product detail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product detail' },
      { status: 500 }
    );
  }
}
