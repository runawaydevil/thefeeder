import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/src/auth';
import { prisma } from '@/src/lib/prisma';

/**
 * GET /api/notifications
 * Get unread notifications
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notifications = await prisma.feedNotification.findMany({
      where: { isRead: false },
      include: {
        feed: {
          select: {
            id: true,
            title: true,
            url: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('[API] Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
