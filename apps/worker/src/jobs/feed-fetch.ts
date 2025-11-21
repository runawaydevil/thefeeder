import { Job } from "bullmq";
import { prisma } from "../lib/prisma.js";
import { parseFeed, normalizeFeedItem } from "../lib/rss-parser.js";
import { getRandomUserAgent } from "../lib/user-agents.js";
import { cached, cacheKey } from "../lib/cache.js";
import { healthTrackingService } from "../lib/health-tracking.js";
import { autoPauseManager } from "../lib/auto-pause.js";
import { statusMachine } from "../lib/status-machine.js";
import { notificationService } from "../lib/notification-service.js";

export interface FeedFetchJobData {
  feedId: string;
}

function isRedditFeed(feedUrl: string): boolean {
  try {
    const url = new URL(feedUrl);
    return url.hostname.includes("reddit.com") && feedUrl.includes(".rss");
  } catch {
    return false;
  }
}

export async function processFeedFetch(job: Job<FeedFetchJobData>) {
  const { feedId } = job.data;
  const startTime = Date.now();
  let statusCode: number | undefined;
  let errorMessage: string | undefined;
  let strategy = 'standard';

  try {
    const feed = await prisma.feed.findUnique({ where: { id: feedId } });

    if (!feed) {
      console.warn(`Feed ${feedId} not found - removing orphaned job`);
      // Remove the repeat job if it exists
      if (job.opts?.repeat) {
        await job.remove();
      }
      // Return success to prevent retries
      return { skipped: true, reason: "feed_not_found" };
    }

    if (!feed.isActive) {
      console.log(`Skipping inactive feed: ${feed.title}`);
      return { skipped: true, reason: "inactive" };
    }

    // Check if feed is paused
    if (feed.status === 'paused') {
      console.log(`Skipping paused feed: ${feed.title}`);
      return { skipped: true, reason: "paused" };
    }

    // Rate limiting for Reddit: check only once per hour
    if (isRedditFeed(feed.url)) {
      if (feed.lastFetchedAt) {
        const hoursSinceLastFetch = (Date.now() - feed.lastFetchedAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastFetch < 1) {
          console.log(`Skipping Reddit feed ${feed.title} - fetched ${Math.round(hoursSinceLastFetch * 60)} minutes ago (minimum 60 minutes)`);
          return { skipped: true, reason: "reddit_rate_limit", hoursSinceLastFetch: hoursSinceLastFetch };
        }
      }
    }

    console.log(`Fetching feed: ${feed.title} (${feed.url})`);

    // Use random user agent for each fetch
    const userAgent = getRandomUserAgent();
    
    // Use custom timeout if configured
    const customTimeout = feed.customTimeout ? feed.customTimeout * 1000 : undefined;
    
    // Cache parsed feed for 30 minutes (1800 seconds)
    const parseCacheKey = cacheKey("feed", "parse", feed.url);
    const parsedFeed = await cached(
      parseCacheKey,
      () => parseFeed(feed.url, userAgent, feed.requiresBrowser || false),
      1800, // 30 minutes TTL
    );
    
    // Check if browser automation was used
    if (parsedFeed._metadata?.usedBrowserAutomation) {
      strategy = 'browser';
      
      // Mark feed as requiring browser automation if not already marked
      if (!feed.requiresBrowser) {
        await prisma.feed.update({
          where: { id: feedId },
          data: { requiresBrowser: true },
        });
        console.log(`[Feed Fetch] ✓ Marked feed ${feed.title} as requiring browser automation`);
      }
    }
    
    let itemsCreated = 0;
    let itemsUpdated = 0;

    for (const item of parsedFeed.items) {
      const normalized = normalizeFeedItem(item);

      if (!normalized.url || !normalized.title) {
        continue;
      }

      const existingItem = normalized.sourceGuid
        ? await prisma.item.findUnique({
            where: { sourceGuid: normalized.sourceGuid },
          })
        : await prisma.item.findFirst({
            where: {
              feedId: feed.id,
              url: normalized.url,
              publishedAt: normalized.publishedAt || undefined,
            },
          });

      if (existingItem) {
        await prisma.item.update({
          where: { id: existingItem.id },
          data: {
            title: normalized.title,
            summary: normalized.summary,
            content: normalized.content,
            author: normalized.author,
            imageUrl: normalized.imageUrl,
            publishedAt: normalized.publishedAt,
          },
        });
        itemsUpdated++;
      } else {
        await prisma.item.create({
          data: {
            feedId: feed.id,
            title: normalized.title,
            url: normalized.url,
            summary: normalized.summary,
            content: normalized.content,
            author: normalized.author,
            imageUrl: normalized.imageUrl,
            publishedAt: normalized.publishedAt,
            sourceGuid: normalized.sourceGuid,
          },
        });
        itemsCreated++;
      }
    }

    const responseTime = Date.now() - startTime;

    // Update feed with success
    await prisma.feed.update({
      where: { id: feedId },
      data: { 
        lastFetchedAt: new Date(),
        lastSuccessAt: new Date(),
        consecutiveFailures: 0,
        lastError: null,
      },
    });

    // Record successful attempt
    await healthTrackingService.recordAttempt({
      feedId,
      success: true,
      statusCode: 200,
      responseTime,
      strategy,
    });

    // Update feed status
    await statusMachine.updateFeedStatus(feedId, {
      success: true,
    });

    // Check for recovery notification
    const updatedFeed = await prisma.feed.findUnique({ where: { id: feedId } });
    if (updatedFeed) {
      await notificationService.createRecoveryNotification(updatedFeed);
    }

    // Clean up old items if total exceeds 50k
    await cleanupOldItems();

    console.log(`[Feed Fetch] ✓ Success: ${feed.title} (${itemsCreated} created, ${itemsUpdated} updated, ${responseTime}ms)`);

    return {
      success: true,
      itemsCreated,
      itemsUpdated,
      totalItems: parsedFeed.items.length,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    // Extract error details
    errorMessage = error.message || 'Unknown error';
    
    // Try to extract status code from error message
    const statusMatch = errorMessage.match(/Status code (\d+)/i);
    if (statusMatch) {
      statusCode = parseInt(statusMatch[1], 10);
    }

    // Determine error type
    let errorType: 'timeout' | 'blocked' | 'server_error' | 'other' = 'other';
    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      errorType = 'timeout';
    } else if (statusCode === 403 || statusCode === 522) {
      errorType = 'blocked';
    } else if (statusCode && statusCode >= 500) {
      errorType = 'server_error';
    }

    // Update feed with failure
    const feed = await prisma.feed.findUnique({ where: { id: feedId } });
    if (feed) {
      const updatedFeed = await prisma.feed.update({
        where: { id: feedId },
        data: {
          consecutiveFailures: feed.consecutiveFailures + 1,
          failureCount: feed.failureCount + 1,
          lastError: errorMessage.substring(0, 500), // Limit error message length
        },
      });

      // Create warning notification after 3 failures
      await notificationService.createWarningNotification(updatedFeed);

      // Check if feed should be auto-paused
      const wasAutoPaused = await autoPauseManager.checkAutoPause(updatedFeed);
      
      // Create auto-pause notification if feed was paused
      if (wasAutoPaused) {
        await notificationService.createAutoPauseNotification(updatedFeed);
      }
    }

    // Record failed attempt
    await healthTrackingService.recordAttempt({
      feedId,
      success: false,
      statusCode,
      errorMessage: errorMessage.substring(0, 500),
      responseTime,
      strategy,
    });

    // Update feed status
    await statusMachine.updateFeedStatus(feedId, {
      success: false,
      errorType,
      statusCode,
    });

    console.error(`[Feed Fetch] ✗ Failed: ${feedId} (${errorType}, ${responseTime}ms)`, errorMessage);
    throw error;
  }
}

const MAX_ITEMS_LIMIT = 50000; // Maximum 50k articles

/**
 * Clean up old items if total exceeds MAX_ITEMS_LIMIT
 * Keeps only the 50k most recent items (by publishedAt)
 */
async function cleanupOldItems() {
  try {
    const totalCount = await prisma.item.count();
    
    if (totalCount <= MAX_ITEMS_LIMIT) {
      return; // No cleanup needed
    }

    const itemsToDelete = totalCount - MAX_ITEMS_LIMIT;
    
    // Find the oldest items (by publishedAt, then by createdAt as fallback)
    // We want to keep the 50k most recent items
    const oldestItems = await prisma.item.findMany({
      orderBy: [
        { publishedAt: "asc" },
        { createdAt: "asc" },
      ],
      take: itemsToDelete,
      select: { id: true },
    });

    if (oldestItems.length > 0) {
      const idsToDelete = oldestItems.map((item: { id: string }) => item.id);
      
      // Delete in batches to avoid overwhelming the database
      const batchSize = 1000;
      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize);
        await prisma.item.deleteMany({
          where: { id: { in: batch } },
        });
      }

      console.log(`Cleaned up ${oldestItems.length} old items (total was ${totalCount}, now ${totalCount - oldestItems.length})`);
    }
  } catch (error) {
    console.error("Error cleaning up old items:", error);
    // Don't throw - cleanup failure shouldn't break feed fetching
  }
}

