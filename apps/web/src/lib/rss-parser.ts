import Parser from "rss-parser";
import { Feed, Item } from "@prisma/client";
import { getRandomUserAgent } from "./user-agents";

const customFields = {
  item: [
    ["media:content", "mediaContent"],
    ["media:thumbnail", "mediaThumbnail"],
    ["content:encoded", "contentEncoded"],
    ["content", "contentEncoded"],
  ],
};

const parser = new Parser({
  customFields,
  requestOptions: {
    headers: {
      "User-Agent": getRandomUserAgent(),
      "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, application/json, text/html, */*",
    },
  },
});

export interface FeedItem {
  title: string;
  link: string;
  contentSnippet?: string;
  content?: string;
  contentEncoded?: string;
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
          customFields,
          requestOptions: {
            headers: {
              "User-Agent": customUserAgent,
              "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, application/json, text/html, */*",
            },
          },
        })
      : parser;
    
    const feed = await feedParser.parseURL(feedUrl);

    // Filter and map items to ensure they have valid title and link
    const validItems: FeedItem[] = (feed.items || [])
      .filter((item: any) => {
        return !!item && typeof item.title === "string" && typeof item.link === "string";
      })
      .map((item: any) => ({
        title: item.title as string,
        link: item.link as string,
        contentSnippet: item.contentSnippet,
        content: item.content,
        contentEncoded: item.contentEncoded,
        isoDate: item.isoDate,
        pubDate: item.pubDate,
        creator: item.creator,
        author: item.author,
        "dc:creator": item["dc:creator"],
        mediaContent: item.mediaContent,
        mediaThumbnail: item.mediaThumbnail,
        guid: item.guid,
        id: item.id,
      } as FeedItem));

    return {
      title: feed.title || "Untitled Feed",
      link: feed.link,
      items: validItems,
    };
  } catch (error) {
    // Check if error is related to contentType
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("contentType") || errorMessage.includes("Expected contentType string")) {
      console.warn(`ContentType error parsing feed ${feedUrl}, attempting fallback:`, errorMessage);
      // Try to parse anyway by fetching raw content
      try {
        const response = await fetch(feedUrl, {
          headers: {
            "User-Agent": customUserAgent || getRandomUserAgent(),
            "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, application/json, text/html, */*",
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const text = await response.text();
        const contentType = response.headers.get("content-type") || "text/xml";
        
        // Create a new parser that accepts the content type we received
        const fallbackParser = new Parser({
          customFields,
          requestOptions: {
            headers: {
              "User-Agent": customUserAgent || getRandomUserAgent(),
              "Accept": contentType,
            },
          },
        });
        
        const feed = await fallbackParser.parseString(text);

        const validItems: FeedItem[] = (feed.items || [])
          .filter((item: any) => {
            return !!item && typeof item.title === "string" && typeof item.link === "string";
          })
          .map((item: any) => ({
            title: item.title as string,
            link: item.link as string,
            contentSnippet: item.contentSnippet,
            content: item.content,
            contentEncoded: item.contentEncoded,
            isoDate: item.isoDate,
            pubDate: item.pubDate,
            creator: item.creator,
            author: item.author,
            "dc:creator": item["dc:creator"],
            mediaContent: item.mediaContent,
            mediaThumbnail: item.mediaThumbnail,
            guid: item.guid,
            id: item.id,
          } as FeedItem));

        return {
          title: feed.title || "Untitled Feed",
          link: feed.link,
          items: validItems,
        };
      } catch (fallbackError) {
        console.error(`Fallback parsing also failed for feed ${feedUrl}:`, fallbackError);
        throw new Error(`Failed to parse feed: ${fallbackError instanceof Error ? fallbackError.message : "Unknown error"}`);
      }
    }
    
    console.error(`Error parsing feed ${feedUrl}:`, error);
    throw new Error(`Failed to parse feed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export function normalizeFeedItem(item: FeedItem): {
  title: string;
  url: string;
  summary?: string;
  content?: string;
  author?: string;
  imageUrl?: string;
  publishedAt?: Date;
  sourceGuid?: string;
} {
  // Extract title
  const title = item.title || "Untitled";

  // Extract URL
  const url = item.link || item.guid || item.id || "";

  // Extract summary/content
  const summary = item.contentSnippet || item.content?.substring(0, 500) || undefined;
  const content = item.content || item.contentEncoded || undefined;

  // Extract author
  const author =
    item.creator ||
    item.author ||
    item["dc:creator"] ||
    undefined;

  // Extract image
  let imageUrl: string | undefined;
  if (item.mediaThumbnail?.$?.url) {
    imageUrl = item.mediaThumbnail.$.url;
  } else if (item.mediaContent?.$?.url) {
    imageUrl = item.mediaContent.$.url;
  } else if (item.content) {
    // Try to extract first image from HTML content
    const imgMatch = item.content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch) {
      imageUrl = imgMatch[1];
    }
  }

  // Extract published date - try multiple fields
  let publishedAt: Date | undefined;
  if (item.isoDate) {
    publishedAt = new Date(item.isoDate);
  } else if (item.pubDate) {
    publishedAt = new Date(item.pubDate);
  }
  
  // Validate date - if invalid, set to undefined
  if (publishedAt && isNaN(publishedAt.getTime())) {
    publishedAt = undefined;
  }

  // Extract GUID for deduplication
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
  // Basic HTML sanitization - remove script tags and dangerous attributes
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript:/gi, "");
}

