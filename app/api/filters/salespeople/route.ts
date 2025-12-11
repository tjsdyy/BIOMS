import { NextRequest, NextResponse } from 'next/server';
import { getSalespeople } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get('shop') || undefined;

    const salespeople = await getSalespeople(shop);
    return NextResponse.json({ salespeople });
  } catch (error) {
    console.error('Error fetching salespeople:', error);
    return NextResponse.json(
      { error: 'Failed to fetch salespeople' },
      { status: 500 }
    );
  }
}
