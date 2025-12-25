import { Queue } from "bullmq";
import { prisma } from "./prisma.js";
import { FeedFetchJobData } from "../jobs/feed-fetch.js";
import { retryStrategyEngine } from "./retry-strategy.js";
import { logger } from "./logger.js";
import type { Feed } from "../types/prisma.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let feedFetchQueue: Queue<FeedFetchJobData> | null = null;

function getQueue(): Queue<FeedFetchJobData> {
  if (!feedFetchQueue) {
    feedFetchQueue = new Queue<FeedFetchJobData>("feed-fetch", {
      connection: { url: REDIS_URL },
    });
  }
  return feedFetchQueue;
}

export async function scheduleFeed(feedId: string) {
  const queue = getQueue();
  const feed = await prisma.feed.findUnique({ where: { id: feedId } });

  if (!feed) {
    throw new Error(`Feed ${feedId} not found`);
  }

  if (!feed.isActive) {
    logger.debug(`Skipping inactive feed: ${feed.title}`);
    return;
  }

  // Don't schedule paused feeds
  if (feed.status === 'paused') {
    logger.debug(`Skipping paused feed: ${feed.title}`);
    return;
  }

  const jobId = `feed-${feed.id}`;
  
  // Remove existing repeat job if it exists
  const existingJobs = await queue.getRepeatableJobs();
  const existing = existingJobs.find((j) => j.id === jobId);
  if (existing) {
    await queue.removeRepeatableByKey(existing.key);
  }

  // Calculate next fetch time using retry strategy
  let nextFetch: Date;
  
  if (feed.consecutiveFailures > 0 && feed.lastAttemptAt) {
    // Use retry strategy for failed feeds
    const lastAttempt = new Date(feed.lastAttemptAt);
    const errorType = determineErrorType(feed);
    
    nextFetch = retryStrategyEngine.calculateNextRetry({
      feed,
      errorType,
    });
    
    logger.debug(`Feed ${feed.title} has ${feed.consecutiveFailures} failures, using ${errorType} retry strategy`);
  } else {
    // Normal scheduling for healthy feeds
    const lastFetched = feed.lastFetchedAt
      ? new Date(feed.lastFetchedAt)
      : new Date(0);
    nextFetch = new Date(
      lastFetched.getTime() + feed.refreshIntervalMinutes * 60 * 1000,
    );
  }

  const now = new Date();
  const delay = nextFetch <= now ? 0 : nextFetch.getTime() - now.getTime();

  // Use custom timeout if configured
  const timeout = feed.customTimeout 
    ? feed.customTimeout * 1000 
    : undefined;

  // Use every() for repeat pattern - works for any interval in minutes
  await queue.add(
    jobId,
    { feedId: feed.id },
    {
      jobId,
      delay,
      repeat: {
        every: feed.refreshIntervalMinutes * 60 * 1000, // Convert minutes to milliseconds
      },
    },
  );

  const delayMinutes = Math.round(delay / 1000 / 60);
  const delayHours = Math.round(delay / 1000 / 60 / 60);
  const delayStr = delayMinutes === 0 
    ? "(immediate)" 
    : delayHours >= 1 
      ? `(in ${delayHours} hours)` 
      : `(in ${delayMinutes} minutes)`;
  
  logger.debug(`Scheduled feed fetch: ${feed.title} ${delayStr}`);
}

/**
 * Determine error type from feed's last error
 */
function determineErrorType(feed: any): 'timeout' | 'blocked' | 'server_error' | 'other' {
  const lastError = feed.lastError?.toLowerCase() || '';
  
  if (lastError.includes('timeout') || lastError.includes('timed out')) {
    return 'timeout';
  }
  
  if (lastError.includes('403') || lastError.includes('522')) {
    return 'blocked';
  }
  
  if (lastError.includes('5') && (lastError.includes('500') || lastError.includes('502') || lastError.includes('503'))) {
    return 'server_error';
  }
  
  return 'other';
}

export async function unscheduleFeed(feedId: string) {
  const queue = getQueue();
  const jobId = `feed-${feedId}`;
  
  // Remove existing repeat job if it exists
  const existingJobs = await queue.getRepeatableJobs();
  const existing = existingJobs.find((j) => j.id === jobId);
  if (existing) {
    await queue.removeRepeatableByKey(existing.key);
    logger.debug(`Unscheduled feed: ${feedId}`);
  }
}

/**
 * Trigger immediate feed fetch (without affecting scheduled repeat job)
 * This is used when a new feed is created or imported
 */
export async function fetchFeedImmediately(feedId: string) {
  const queue = getQueue();
  const feed = await prisma.feed.findUnique({ where: { id: feedId } });

  if (!feed) {
    throw new Error(`Feed ${feedId} not found`);
  }

  if (!feed.isActive) {
    logger.debug(`Skipping immediate fetch for inactive feed: ${feed.title}`);
    return;
  }

  // Add a one-time job with immediate execution (delay 0, no repeat)
  const immediateJobId = `feed-immediate-${feed.id}-${Date.now()}`;
  
  await queue.add(
    immediateJobId,
    { feedId: feed.id },
    {
      jobId: immediateJobId,
      delay: 0, // Execute immediately
      // No repeat - this is a one-time fetch
    },
  );

  logger.debug(`Immediate fetch triggered for feed: ${feed.title}`);
}

