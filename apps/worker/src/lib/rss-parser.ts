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
  items: any[]; // Using any[] to avoid type conflicts with rss-parser
}

export async function parseFeed(feedUrl: string, customUserAgent?: string): Promise<ParsedFeed> {
  // Try with multiple User-Agents if we get 403
  const userAgents = [
    customUserAgent || getRandomUserAgent(), // Custom or random from pool
    'Feedly/1.0 (+http://www.feedly.com/fetcher.html; like FeedFetcher-Google)', // Feed reader
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', // Googlebot
    'curl/7.68.0', // Simple curl
  ];
  
  let lastError: any = null;
  
  for (let i = 0; i < userAgents.length; i++) {
    try {
      // Add delay between attempts to avoid rate limiting
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
      
      console.log(`[RSS Parser] Parsing feed (attempt ${i + 1}/${userAgents.length}): ${feedUrl}`);
      
      const feedParser = new Parser({
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
            "User-Agent": userAgents[i],
            "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        },
      });
      
      const feed = await feedParser.parseURL(feedUrl);
      
      console.log(`[RSS Parser] ✓ Successfully parsed feed: ${feed.title || 'Untitled'}`);
      
      return {
        title: feed.title || "Untitled Feed",
        link: feed.link,
        items: feed.items || [],
      };
    } catch (error: any) {
      lastError = error;
      
      // If it's a 403, try next User-Agent
      if (error.message?.includes("403") || error.message?.includes("Forbidden")) {
        console.warn(`[RSS Parser] Got 403 with User-Agent ${i + 1}, trying next...`);
        continue;
      }
      
      // For other errors, break the loop
      break;
    }
  }
  
  // All attempts failed
  console.error(`[RSS Parser] ✗ Failed to parse feed ${feedUrl} after ${userAgents.length} attempts:`, lastError);
  throw new Error(`Failed to parse feed: ${lastError instanceof Error ? lastError.message : "Unknown error"}`);
}

export function normalizeFeedItem(item: any) {
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

