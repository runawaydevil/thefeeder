import { del, delPattern, cacheKey } from "./cache";

/**
 * Invalidate statistics cache
 */
export async function invalidateStatsCache(): Promise<void> {
  await del(cacheKey("stats", "main"));
}

/**
 * Invalidate feed parsing cache
 * @param feedUrl - Optional specific feed URL to invalidate. If not provided, invalidates all feed parsing cache
 */
export async function invalidateFeedCache(feedUrl?: string): Promise<void> {
  if (feedUrl) {
    await del(cacheKey("feed", "parse", feedUrl));
  } else {
    // Invalidate all feed parsing cache
    await delPattern(cacheKey("feed", "parse", "*"));
  }
}

/**
 * Invalidate feed discovery cache
 * @param url - Optional specific URL to invalidate. If not provided, invalidates all discovery cache
 */
export async function invalidateDiscoveryCache(url?: string): Promise<void> {
  if (url) {
    await del(cacheKey("discover", url));
  } else {
    // Invalidate all discovery cache
    await delPattern(cacheKey("discover", "*"));
  }
}

/**
 * Invalidate all cache related to feeds (stats, feed parsing, discovery)
 * Useful when feeds are created/deleted
 */
export async function invalidateAllFeedCache(): Promise<void> {
  await Promise.all([
    invalidateStatsCache(),
    invalidateFeedCache(),
    // Don't invalidate discovery cache - it's less critical and has long TTL
  ]);
}

/**
 * Invalidate cache related to items (mainly stats)
 * Useful when items are created/deleted
 */
export async function invalidateItemCache(): Promise<void> {
  await invalidateStatsCache();
}

