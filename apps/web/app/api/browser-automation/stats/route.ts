import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/src/auth';

/**
 * GET /api/browser-automation/stats
 * Get browser automation statistics
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call worker API to get browser automation stats
    const workerUrl = process.env.WORKER_API_URL || 'http://localhost:7388';
    const workerToken = process.env.WORKER_API_TOKEN;

    const response = await fetch(`${workerUrl}/api/browser-automation/stats`, {
      headers: {
        'Content-Type': 'application/json',
        ...(workerToken && { 'Authorization': `Bearer ${workerToken}` }),
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch browser automation stats' },
        { status: response.status }
      );
    }

    const stats = await response.json();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('[API] Error fetching browser automation stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch browser automation stats' },
      { status: 500 }
    );
  }
}
