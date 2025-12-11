import { NextResponse } from 'next/server';
import { getShops } from '@/lib/db/queries';

export async function GET() {
  try {
    const shops = await getShops();
    return NextResponse.json({ shops });
  } catch (error) {
    console.error('Error fetching shops:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shops' },
      { status: 500 }
    );
  }
}
