import { NextRequest, NextResponse } from 'next/server';
import { getKPIMetrics } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get('shop') || undefined;
    const salesperson = searchParams.get('salesperson') || undefined;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const metrics = await getKPIMetrics({
      shop,
      salesperson,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching KPI metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KPI metrics' },
      { status: 500 }
    );
  }
}
