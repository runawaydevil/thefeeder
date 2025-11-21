import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/src/auth';
import { prisma } from '@/src/lib/prisma';

/**
 * GET /api/feeds/:id/health
 * Get health metrics for a feed
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const feed = await prisma.feed.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        url: true,
        status: true,
        totalAttempts: true,
        totalSuccesses: true,
        totalFailures: true,
        avgResponseTime: true,
        lastSuccessAt: true,
        lastAttemptAt: true,
        lastError: true,
        consecutiveFailures: true,
      },
    });

    if (!feed) {
      return NextResponse.json({ error: 'Feed not found' }, { status: 404 });
    }

    // Get recent health logs
    const recentLogs = await prisma.feedHealthLog.findMany({
      where: { feedId: id },
      orderBy: { attemptedAt: 'desc' },
      take: 100,
    });

    // Calculate success rate (last 7 days or 50 attempts)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentLogsForRate = recentLogs
      .filter(log => log.attemptedAt >= sevenDaysAgo)
      .slice(0, 50);

    const successRate = recentLogsForRate.length > 0
      ? Math.round((recentLogsForRate.filter(log => log.success).length / recentLogsForRate.length) * 100)
      : 0;

    return NextResponse.json({
      feed,
      metrics: {
        totalAttempts: feed.totalAttempts,
        totalSuccesses: feed.totalSuccesses,
        totalFailures: feed.totalFailures,
        successRate,
        avgResponseTime: feed.avgResponseTime,
        lastSuccessAt: feed.lastSuccessAt,
        lastAttemptAt: feed.lastAttemptAt,
      },
      recentLogs: recentLogs.slice(0, 10), // Return only 10 most recent for UI
    });
  } catch (error) {
    console.error('[API] Error fetching feed health:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feed health' },
      { status: 500 }
    );
  }
}
