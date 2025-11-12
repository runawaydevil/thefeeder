import Parser from "rss-parser";
import { Feed, Item } from "@prisma/client";
import { getRandomUserAgent } from "./user-agents";
import { generateProxyUrls, isLikelyBlocked } from "./rss-proxy";

const customFields = {
  item: [
    ["media:content", "mediaContent"],
    ["media:thumbnail", "mediaThumbnail"],
    ["content:encoded", "contentEncoded"],
    ["content", "contentEncoded"],
    // Map pubdate (lowercase) to pubDate for compatibility
    ["pubdate", "pubDate"],
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
  // Try with multiple User-Agents if we get 403
  const userAgents = customUserAgent 
    ? [customUserAgent]
    : [
        getRandomUserAgent(), // Random from pool
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
        customFields,
        requestOptions: {
          headers: {
            "User-Agent": userAgents[i],
            "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, application/json, text/html, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        },
      });
      
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

      console.log(`[RSS Parser] ✓ Successfully parsed feed: ${feed.title || 'Untitled'}`);

      return {
        title: feed.title || "Untitled Feed",
        link: feed.link,
        items: validItems,
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
  
  // All attempts failed - try fallback for contentType errors
  if (lastError) {
    // Check if error is related to contentType
    const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
    if (errorMessage.includes("contentType") || errorMessage.includes("Expected contentType string")) {
      console.warn(`ContentType error parsing feed ${feedUrl}, attempting fallback:`, errorMessage);
      // Try to parse anyway by fetching raw content
      try {
        const response = await fetch(feedUrl, {
          headers: {
            "User-Agent": userAgents[0],
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
          customFields: customFields,
          requestOptions: {
            headers: {
              "User-Agent": userAgents[0],
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
  }
  
  // All attempts failed - try direct fetch with custom headers (like curl)
  if (isLikelyBlocked(lastError)) {
    console.warn(`[RSS Parser] Feed appears to be blocked, trying direct fetch with curl-like headers...`);
    
    try {
      const response = await fetch(feedUrl, {
        headers: {
          "User-Agent": "curl/7.68.0",
          "Accept": "*/*",
        },
      });
      
      if (response.ok) {
        const text = await response.text();
        const parser = new Parser({ customFields });
        
        const feed = await parser.parseString(text);
        
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
        
        console.log(`[RSS Parser] ✓ Successfully parsed feed via direct fetch: ${feed.title || 'Untitled'}`);
        
        return {
          title: feed.title || "Untitled Feed",
          link: feed.link,
          items: validItems,
        };
      }
    } catch (fetchError) {
      console.warn(`[RSS Parser] Direct fetch failed:`, fetchError instanceof Error ? fetchError.message : fetchError);
    }
    
    // If direct fetch failed, try proxy services
    console.warn(`[RSS Parser] Trying proxy services...`);
    
    const proxyUrls = generateProxyUrls(feedUrl);
    
    for (const { proxy, url } of proxyUrls) {
      try {
        console.log(`[RSS Parser] Trying ${proxy}: ${url}`);
        
        const proxyParser = new Parser({
          customFields,
          requestOptions: {
            headers: {
              "User-Agent": getRandomUserAgent(),
              "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
            },
          },
        });
        
        const feed = await proxyParser.parseURL(url);
        
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
        
        console.log(`[RSS Parser] ✓ Successfully parsed feed via ${proxy}: ${feed.title || 'Untitled'}`);
        
        return {
          title: feed.title || "Untitled Feed",
          link: feed.link,
          items: validItems,
        };
      } catch (proxyError) {
        console.warn(`[RSS Parser] ${proxy} failed:`, proxyError instanceof Error ? proxyError.message : proxyError);
        continue;
      }
    }
  }
  
  // This should never happen, but TypeScript needs it
  console.error(`[RSS Parser] ✗ Failed to parse feed ${feedUrl} after ${userAgents.length} attempts and ${generateProxyUrls(feedUrl).length} proxy attempts:`, lastError);
  throw new Error(`Failed to parse feed: ${lastError instanceof Error ? lastError.message : "Unknown error"}`);
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

