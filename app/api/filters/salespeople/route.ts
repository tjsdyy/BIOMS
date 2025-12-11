import { NextRequest, NextResponse } from 'next/server';
import { getSalespeople } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get('shop') || undefined;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

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
