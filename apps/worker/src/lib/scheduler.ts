import { Queue } from "bullmq";
import { prisma } from "./prisma.js";
import { FeedFetchJobData } from "../jobs/feed-fetch.js";

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
    console.log(`Skipping inactive feed: ${feed.title}`);
    return;
  }

  const jobId = `feed-${feed.id}`;
  
  // Remove existing repeat job if it exists
  const existingJobs = await queue.getRepeatableJobs();
  const existing = existingJobs.find((j) => j.id === jobId);
  if (existing) {
    await queue.removeRepeatableByKey(existing.key);
  }

  const lastFetched = feed.lastFetchedAt
    ? new Date(feed.lastFetchedAt)
    : new Date(0);
  const nextFetch = new Date(
    lastFetched.getTime() + feed.refreshIntervalMinutes * 60 * 1000,
  );
  const now = new Date();

  // Calculate delay (0 if should run immediately)
  const delay = nextFetch <= now ? 0 : nextFetch.getTime() - now.getTime();

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
  console.log(
    `Scheduled feed fetch: ${feed.title} ${delayMinutes === 0 ? "(immediate)" : `(in ${delayMinutes} minutes)`}`,
  );
}

export async function unscheduleFeed(feedId: string) {
  const queue = getQueue();
  const jobId = `feed-${feedId}`;
  
  // Remove existing repeat job if it exists
  const existingJobs = await queue.getRepeatableJobs();
  const existing = existingJobs.find((j) => j.id === jobId);
  if (existing) {
    await queue.removeRepeatableByKey(existing.key);
    console.log(`Unscheduled feed: ${feedId}`);
  }
}

