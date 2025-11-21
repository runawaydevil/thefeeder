import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/src/auth';

/**
 * POST /api/feeds/:id/retry
 * Trigger manual retry for a feed
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Call worker API to trigger immediate fetch
    const workerUrl = process.env.WORKER_API_URL || 'http://localhost:7388';
    const workerToken = process.env.WORKER_API_TOKEN;

    const response = await fetch(`${workerUrl}/api/schedule/immediate/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(workerToken && { 'Authorization': `Bearer ${workerToken}` }),
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error || 'Failed to trigger retry' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error triggering retry:', error);
    return NextResponse.json(
      { error: 'Failed to trigger retry' },
      { status: 500 }
    );
  }
}
