import { prisma } from "@/src/lib/prisma";

/**
 * Server-side data fetching functions
 * These can be called directly during SSR without HTTP requests
 */

const MAX_ITEMS_LIMIT = 50000; // Maximum 50k articles

export async function getItems(limit: number = 20, skip: number = 0) {
  try {
    // Get total count for pagination, but cap at MAX_ITEMS_LIMIT
    const totalCount = await prisma.item.count();
    const total = Math.min(totalCount, MAX_ITEMS_LIMIT);
    
    // Only fetch items up to MAX_ITEMS_LIMIT
    const items = await prisma.item.findMany({
      take: Math.min(limit, MAX_ITEMS_LIMIT - skip),
      skip: skip,
      orderBy: { publishedAt: "desc" },
      include: {
        feed: {
          select: {
            title: true,
            url: true,
          },
        },
      },
    });

    // Transform Prisma null to undefined for TypeScript compatibility
    // Prisma returns null for nullable fields, but components expect undefined
    const transformedItems = items.map((item: typeof items[0]) => ({
      id: item.id,
      title: item.title,
      url: item.url,
      summary: item.summary ?? undefined,
      content: item.content ?? undefined,
      author: item.author ?? undefined,
      imageUrl: item.imageUrl ?? undefined,
      publishedAt: item.publishedAt ? item.publishedAt.toISOString() : undefined,
      feed: item.feed ? {
        title: item.feed.title,
        url: item.feed.url,
      } : undefined,
    }));

    return {
      items: transformedItems,
      total,
    };
  } catch (error) {
    console.error("Error fetching items:", error);
    return {
      items: [],
      total: 0,
    };
  }
}

export async function getStats() {
  try {
    const [feedsCount, itemsCount] = await Promise.all([
      prisma.feed.count({ where: { isActive: true } }),
      prisma.item.count(),
    ]);

    // Log for debugging
    console.log("[getStats] Real data:", { feeds: feedsCount, items: itemsCount });

    // Cap items count at MAX_ITEMS_LIMIT for display
    const displayItemsCount = Math.min(itemsCount, MAX_ITEMS_LIMIT);

    return {
      feeds: feedsCount,
      items: displayItemsCount,
      online: 420, // Placeholder
    };
  } catch (error) {
    console.error("[getStats] Error fetching stats:", error);
    // Return zeros but log the error for debugging
    return {
      feeds: 0,
      items: 0,
      online: 420,
    };
  }
}

