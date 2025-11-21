import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/src/auth';

/**
 * POST /api/feeds/test-alternative
 * Test if an alternative feed URL is valid
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Call worker API to test the alternative
    const workerUrl = process.env.WORKER_API_URL || 'http://localhost:7388';
    const workerToken = process.env.WORKER_API_TOKEN;

    const response = await fetch(`${workerUrl}/api/feeds/test-alternative`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(workerToken && { 'Authorization': `Bearer ${workerToken}` }),
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to test alternative' },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Error testing alternative:', error);
    return NextResponse.json(
      { error: 'Failed to test alternative' },
      { status: 500 }
    );
  }
}
