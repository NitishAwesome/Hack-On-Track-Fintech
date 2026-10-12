import { NextResponse } from 'next/server';
import { getVerifiedIpoSchedule } from '@/lib/market/ipoData';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = getVerifiedIpoSchedule();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve IPO schedule',
      },
      { status: 500 }
    );
  }
}
