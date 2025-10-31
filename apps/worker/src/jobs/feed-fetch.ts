import { Job } from "bullmq";
import { prisma } from "../lib/prisma.js";
import { parseFeed, normalizeFeedItem } from "../lib/rss-parser.js";
import { getRandomUserAgent } from "../lib/user-agents.js";

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

  try {
    const feed = await prisma.feed.findUnique({ where: { id: feedId } });

    if (!feed) {
      throw new Error(`Feed ${feedId} not found`);
    }

    if (!feed.isActive) {
      console.log(`Skipping inactive feed: ${feed.title}`);
      return { skipped: true, reason: "inactive" };
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
    const parsedFeed = await parseFeed(feed.url, userAgent);
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

    await prisma.feed.update({
      where: { id: feedId },
      data: { lastFetchedAt: new Date() },
    });

    return {
      success: true,
      itemsCreated,
      itemsUpdated,
      totalItems: parsedFeed.items.length,
    };
  } catch (error) {
    console.error(`Error processing feed ${feedId}:`, error);
    throw error;
  }
}

