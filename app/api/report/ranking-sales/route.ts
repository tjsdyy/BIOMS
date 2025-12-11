import { NextRequest, NextResponse } from 'next/server';
import { getProductRankingBySales } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get('shop') || undefined;
    const salesperson = searchParams.get('salesperson') || undefined;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = searchParams.get('limit');

    const rankings = await getProductRankingBySales({
      shop,
      salesperson,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : 20,
    });

    return NextResponse.json({ rankings });
  } catch (error) {
    console.error('Error fetching sales ranking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales ranking' },
      { status: 500 }
    );
  }
}
