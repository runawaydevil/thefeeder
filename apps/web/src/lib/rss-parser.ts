import Parser from "rss-parser";
import { Feed, Item } from "@prisma/client";
import { getRandomUserAgent } from "./user-agents";
import { generateProxyUrls, isLikelyBlocked } from "./rss-proxy";
import { fetchFeed } from "./http-client";
import { parseFeedV2, type ParsedFeedV2 } from "./feed-parser-v2";

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

/**
 * Convert ParsedFeedV2 to legacy ParsedFeed format
 */
function convertV2ToLegacyFormat(v2: ParsedFeedV2): ParsedFeed {
  const validItems: FeedItem[] = v2.items.map((item) => ({
    title: item.title,
    link: item.link,
    contentSnippet: item.description,
    content: item.content,
    contentEncoded: item.content,
    isoDate: item.pubDate,
    pubDate: item.pubDate,
    creator: item.author,
    author: item.author,
    "dc:creator": item.author,
    mediaContent: undefined,
    mediaThumbnail: undefined,
    guid: item.guid,
    id: item.guid,
  } as FeedItem));
  
  return {
    title: v2.title,
    link: v2.link,
    items: validItems,
  };
}

export async function parseFeed(feedUrl: string, customUserAgent?: string): Promise<ParsedFeed> {
  console.log(`[RSS Parser] ===== STARTING PARSE FEED: ${feedUrl} =====`);
  
  // STEP 1: Try custom robust parser FIRST (PRIMARY METHOD)
  try {
    console.log(`[RSS Parser] STEP 1: Trying custom parser V2...`);
    const result = await parseFeedV2(feedUrl);
    console.log(`[RSS Parser] ✓ STEP 1 SUCCESS: Custom parser V2 succeeded`);
    
    // Convert to expected format
    return convertV2ToLegacyFormat(result);
  } catch (error) {
    console.error(`[RSS Parser] ✗ STEP 1 FAILED: Custom parser V2 failed:`, error instanceof Error ? error.message : error);
    console.log(`[RSS Parser] → Continuing to fallback strategies...`);
  }
  
  // STEP 2: Try rss-parser with multiple User-Agents
  console.log(`[RSS Parser] STEP 2: Trying rss-parser with multiple User-Agents...`);
  
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
      
      console.log(`[RSS Parser] STEP 2: Parsing feed (attempt ${i + 1}/${userAgents.length}): ${feedUrl}`);
      
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

      console.log(`[RSS Parser] ✓ STEP 2 SUCCESS: Successfully parsed feed: ${feed.title || 'Untitled'}`);

      return {
        title: feed.title || "Untitled Feed",
        link: feed.link,
        items: validItems,
      };
    } catch (error: any) {
      lastError = error;
      
      // If it's a 403, try next User-Agent
      if (error.message?.includes("403") || error.message?.includes("Forbidden")) {
        console.warn(`[RSS Parser] STEP 2: Got 403 with User-Agent ${i + 1}, trying next...`);
        continue;
      }
      
      // For other errors, break the loop
      console.error(`[RSS Parser] ✗ STEP 2 FAILED: ${error.message}`);
      break;
    }
  }
  
  // STEP 2.5: Try fallback for contentType errors
  console.log(`[RSS Parser] STEP 2.5: Checking for contentType errors...`);
  if (lastError) {
    // Check if error is related to contentType
    const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
    if (errorMessage.includes("contentType") || errorMessage.includes("Expected contentType string")) {
      console.warn(`[RSS Parser] STEP 2.5: ContentType error detected, attempting fallback:`, errorMessage);
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
        
        console.log(`[RSS Parser] ✓ STEP 2.5 SUCCESS: ContentType fallback succeeded`);

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
        console.error(`[RSS Parser] ✗ STEP 2.5 FAILED: Fallback parsing also failed:`, fallbackError);
      }
    }
  }
  
  // STEP 3: Try advanced HTTP client with multiple strategies
  console.log(`[RSS Parser] STEP 3: Trying advanced HTTP client + rss-parser...`);
  if (isLikelyBlocked(lastError)) {
    console.warn(`[RSS Parser] STEP 3: Feed appears to be blocked, trying advanced HTTP client...`);
    
    try {
      let text = await fetchFeed(feedUrl);
      
      // Additional cleanup for XML parsing
      // Remove BOM if present
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.substring(1);
      }
      // Remove any leading/trailing whitespace
      text = text.trim();
      
      const parser = new Parser({ customFields });
      
      const feed = await parser.parseString(text);
      
      console.log(`[RSS Parser] ✓ STEP 3 SUCCESS: Successfully parsed feed via advanced HTTP client: ${feed.title || 'Untitled'}`);
      
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
    } catch (fetchError) {
      console.error(`[RSS Parser] ✗ STEP 3 FAILED: Advanced HTTP client failed:`, fetchError instanceof Error ? fetchError.message : fetchError);
    }
    
    // STEP 4: Try proxy services
    console.log(`[RSS Parser] STEP 4: Trying proxy services...`);
    
    const proxyUrls = generateProxyUrls(feedUrl);
    
    for (const { proxy, url } of proxyUrls) {
      try {
        console.log(`[RSS Parser] STEP 4: Trying ${proxy}: ${url}`);
        
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
        
        console.log(`[RSS Parser] ✓ STEP 4 SUCCESS: Successfully parsed feed via ${proxy}: ${feed.title || 'Untitled'}`);
        
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
      } catch (proxyError) {
        console.warn(`[RSS Parser] STEP 4: ${proxy} failed:`, proxyError instanceof Error ? proxyError.message : proxyError);
        continue;
      }
    }
  }
  
  console.error(`[RSS Parser] ✗ ALL STEPS FAILED: Failed to parse feed ${feedUrl} after all attempts`);
  console.error(`[RSS Parser] Final error:`, lastError);
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

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&euro;': '€',
    '&pound;': '£',
    '&yen;': '¥',
    '&cent;': '¢',
    '&sect;': '§',
    '&para;': '¶',
    '&middot;': '·',
    '&bull;': '•',
    '&hellip;': '…',
    '&prime;': '′',
    '&Prime;': '″',
    '&lsaquo;': '‹',
    '&rsaquo;': '›',
    '&laquo;': '«',
    '&raquo;': '»',
    '&ndash;': '–',
    '&mdash;': '—',
    '&lsquo;': '\u2018',
    '&rsquo;': '\u2019',
    '&sbquo;': '‚',
    '&ldquo;': '\u201C',
    '&rdquo;': '\u201D',
    '&bdquo;': '„',
  };
  
  let decoded = text;
  
  // Replace named entities
  Object.keys(entities).forEach(entity => {
    decoded = decoded.replace(new RegExp(entity, 'g'), entities[entity]);
  });
  
  // Replace numeric entities (&#123; or &#xAB;)
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(parseInt(dec, 10));
  });
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  return decoded;
}

function sanitizeHtml(html: string): string {
  // First decode HTML entities
  let clean = decodeHtmlEntities(html);
  
  // Then sanitize dangerous content
  clean = clean
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript:/gi, "");
  
  return clean;
}

