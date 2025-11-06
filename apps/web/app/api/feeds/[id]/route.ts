import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { prisma } from "@/src/lib/prisma";
import { Role } from "@prisma/client";
import { scheduleFeed, unscheduleFeed } from "@/src/lib/worker-api";
import { invalidateAllFeedCache } from "@/src/lib/cache-invalidation";

const MIN_REFRESH_INTERVAL = 10; // minutes

// PUT - Update feed
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== Role.admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, url, siteUrl, refreshIntervalMinutes, isActive } = body;

    // Validate refresh interval if provided
    if (refreshIntervalMinutes !== undefined && refreshIntervalMinutes < MIN_REFRESH_INTERVAL) {
      return NextResponse.json(
        { error: `Refresh interval must be at least ${MIN_REFRESH_INTERVAL} minutes` },
        { status: 400 },
      );
    }

    // Validate URL if provided
    if (url) {
      try {
        new URL(url);
      } catch {
        return NextResponse.json({ error: "Invalid feed URL" }, { status: 400 });
      }
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (url !== undefined) updateData.url = url;
    if (siteUrl !== undefined) updateData.siteUrl = siteUrl;
    if (refreshIntervalMinutes !== undefined) updateData.refreshIntervalMinutes = refreshIntervalMinutes;
    if (isActive !== undefined) updateData.isActive = isActive;

    const feed = await prisma.feed.update({
      where: { id },
      data: updateData,
    });

    // Invalidate cache after updating feed
    invalidateAllFeedCache().catch((err) => {
      console.error("Failed to invalidate cache:", err);
    });

    // Reschedule feed in worker if interval or active status changed
    if (refreshIntervalMinutes !== undefined || isActive !== undefined) {
      if (feed.isActive) {
        scheduleFeed(feed.id).catch((err) => {
          console.error("Error rescheduling feed in worker:", err);
        });
      } else {
        unscheduleFeed(feed.id).catch((err) => {
          console.error("Error unscheduling feed in worker:", err);
        });
      }
    }

    return NextResponse.json(feed);
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A feed with this URL already exists" },
        { status: 409 },
      );
    }
    console.error("Error updating feed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE - Delete feed
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== Role.admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if feed exists first
    const feed = await prisma.feed.findUnique({
      where: { id },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    const itemCount = feed._count.items;

    // Delete items manually first to avoid foreign key constraint issues
    // This is a fallback if cascade delete doesn't work properly
    if (itemCount > 0) {
      try {
        // Delete items in batches to avoid overwhelming the database
        const batchSize = 1000;
        let deletedCount = 0;
        
        while (deletedCount < itemCount) {
          const itemsToDelete = await prisma.item.findMany({
            where: { feedId: id },
            take: batchSize,
            select: { id: true },
          });

          if (itemsToDelete.length === 0) break;

          const idsToDelete = itemsToDelete.map((item: { id: string }) => item.id);
          await prisma.item.deleteMany({
            where: { id: { in: idsToDelete } },
          });

          deletedCount += itemsToDelete.length;
        }

        console.log(`Deleted ${deletedCount} item(s) for feed ${feed.title}`);
      } catch (itemError: any) {
        console.error("Error deleting items:", itemError);
        // Continue with feed deletion even if item deletion fails
        // The cascade delete should handle it, or we'll see the error below
      }
    }

    // Delete the feed (items should already be deleted, but cascade will handle any remaining)
    await prisma.feed.delete({
      where: { id },
    });

    // Invalidate cache after deleting feed
    invalidateAllFeedCache().catch((err) => {
      console.error("Failed to invalidate cache:", err);
    });

    // Notify worker to unschedule this feed (non-blocking)
    unscheduleFeed(id).catch((err) => {
      console.error("Error unscheduling feed in worker:", err);
    });

    return NextResponse.json({ 
      success: true,
      message: `Feed "${feed.title}" deleted successfully${itemCount > 0 ? ` along with ${itemCount} item(s)` : ''}`,
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }
    if (error.code === "P2003") {
      // If we still get P2003 after manually deleting items, there's a deeper issue
      console.error("P2003 error after manual item deletion:", error);
      return NextResponse.json(
        { error: "Cannot delete feed: it has related items that cannot be deleted. Please contact support." },
        { status: 400 },
      );
    }
    console.error("Error deleting feed:", error);
    console.error("Error details:", {
      code: error.code,
      meta: error.meta,
      message: error.message,
    });
    return NextResponse.json(
      { error: error.message || "Internal server error. Please try again or contact support if the problem persists." },
      { status: 500 },
    );
  }
}

