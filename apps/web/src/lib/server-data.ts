import { prisma } from "@/src/lib/prisma";
import { cached, cacheKey } from "@/src/lib/cache";
import { getExistingVoterId } from "@/src/lib/voter-id";

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

    // Get user votes if voter ID exists
    const voterId = await getExistingVoterId();
    let userVotes: Record<string, "like" | "dislike"> = {};

    if (voterId) {
      const userVotesCacheKey = cacheKey("votes", "user", voterId);
      
      userVotes = await cached(
        userVotesCacheKey,
        async () => {
          const voteRecords = await prisma.voteTracker.findMany({
            where: { voterId },
            select: {
              itemId: true,
              voteType: true,
            },
          });

          const votesMap: Record<string, "like" | "dislike"> = {};
          for (const vote of voteRecords) {
            votesMap[vote.itemId] = vote.voteType;
          }

          return votesMap;
        },
        300 // 5 minutes TTL
      );
    }

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
      likes: item.likes,
      dislikes: item.dislikes,
      userVote: userVotes[item.id] ?? null,
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
  // Cache stats for 5 minutes (300 seconds)
  const statsKey = cacheKey("stats", "main");
  
  return await cached(
    statsKey,
    async () => {
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
    },
    300, // 5 minutes TTL
  );
}

