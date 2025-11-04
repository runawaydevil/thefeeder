import Parser from "rss-parser";
import { getRandomUserAgent } from "./user-agents.js";

const parser = new Parser({
  customFields: {
    item: [
      ["media:content", "mediaContent"],
      ["media:thumbnail", "mediaThumbnail"],
      ["content:encoded", "contentEncoded"],
      ["content", "contentEncoded"],
      // Map pubdate (lowercase) to pubDate for compatibility
      ["pubdate", "pubDate"],
    ],
  },
  requestOptions: {
    headers: {
      "User-Agent": getRandomUserAgent(),
    },
  },
});

export interface FeedItem {
  title: string;
  link: string;
  contentSnippet?: string;
  content?: string;
  isoDate?: string;
  pubDate?: string;
  creator?: string;
  author?: string;
  "dc:creator"?: string;
  mediaContent?: any;
  mediaThumbnail?: any;
  guid?: string;
  id?: string;
}

export interface ParsedFeed {
  title: string;
  link?: string;
  items: FeedItem[];
}

export async function parseFeed(feedUrl: string, customUserAgent?: string): Promise<ParsedFeed> {
  try {
    // Use custom user agent if provided, otherwise use random one from parser config
    const feedParser = customUserAgent
      ? new Parser({
          customFields: {
            item: [
              ["media:content", "mediaContent"],
              ["media:thumbnail", "mediaThumbnail"],
              ["content:encoded", "contentEncoded"],
              ["content", "contentEncoded"],
              ["pubdate", "pubDate"],
            ],
          },
          requestOptions: {
            headers: {
              "User-Agent": customUserAgent,
            },
          },
        })
      : parser;
    
    const feed = await feedParser.parseURL(feedUrl);
    return {
      title: feed.title || "Untitled Feed",
      link: feed.link,
      items: feed.items || [],
    };
  } catch (error) {
    console.error(`Error parsing feed ${feedUrl}:`, error);
    throw new Error(`Failed to parse feed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export function normalizeFeedItem(item: FeedItem) {
  const title = item.title || "Untitled";
  const url = item.link || item.guid || item.id || "";
  const summary = item.contentSnippet || item.content?.substring(0, 500) || undefined;
  const content = item.content || item.contentEncoded || undefined;
  const author = item.creator || item.author || item["dc:creator"] || undefined;

  let imageUrl: string | undefined;
  if (item.mediaThumbnail?.$?.url) {
    imageUrl = item.mediaThumbnail.$.url;
  } else if (item.mediaContent?.$?.url) {
    imageUrl = item.mediaContent.$.url;
  } else if (item.content) {
    const imgMatch = item.content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch) imageUrl = imgMatch[1];
  }

  // Extract published date - try multiple fields and formats
  let publishedAt: Date | undefined;
  
  // Try isoDate first (ISO 8601 format)
  if (item.isoDate) {
    publishedAt = new Date(item.isoDate);
  }
  
  // Try pubDate (RSS format, e.g., "Tue, 04 Nov 2025 15:10:59 +0000")
  if ((!publishedAt || isNaN(publishedAt.getTime())) && item.pubDate) {
    publishedAt = new Date(item.pubDate);
  }
  
  // Validate date - if invalid, set to undefined
  if (publishedAt && isNaN(publishedAt.getTime())) {
    publishedAt = undefined;
  }

  const sourceGuid = item.guid || item.id || item.link || undefined;

  return {
    title,
    url,
    summary,
    content: content ? sanitizeHtml(content) : undefined,
    author,
    imageUrl,
    publishedAt: publishedAt && !isNaN(publishedAt.getTime()) ? publishedAt : undefined,
    sourceGuid,
  };
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript:/gi, "");
}

