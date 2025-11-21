import Parser from "rss-parser";
import { getRandomUserAgent } from "./user-agents.js";
import { generateProxyUrls, isLikelyBlocked } from "./rss-proxy.js";
import { fetchFeed } from "./http-client.js";
import { parseFeedV2, type ParsedFeedV2 } from "./feed-parser-v2.js";
import { browserAutomationService } from "./browser-automation.js";

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
  _metadata?: {
    usedBrowserAutomation?: boolean;
  };
}

/**
 * Convert ParsedFeedV2 to legacy ParsedFeed format
 */
function convertV2ToLegacyFormat(v2: ParsedFeedV2): ParsedFeed {
  return {
    title: v2.title,
    link: v2.link,
    items: v2.items.map(item => ({
      title: item.title,
      link: item.link,
      contentSnippet: item.description,
      content: item.content,
      isoDate: item.pubDate,
      pubDate: item.pubDate,
      creator: item.author,
      author: item.author,
      "dc:creator": item.author,
      guid: item.guid,
      id: item.guid,
    })),
  };
}

export async function parseFeed(feedUrl: string, customUserAgent?: string, requiresBrowser: boolean = false): Promise<ParsedFeed> {
  console.log(`[RSS Parser] ===== STARTING PARSE FEED: ${feedUrl} =====`);
  
  // If feed requires browser automation, use it directly
  if (requiresBrowser && browserAutomationService.isAvailable()) {
    try {
      console.log(`[RSS Parser] Feed requires browser automation, using Puppeteer directly...`);
      
      const htmlContent = await browserAutomationService.fetchWithBrowser(feedUrl, {
        timeout: 60000,
      });
      
      const feed = await parser.parseString(htmlContent);
      
      console.log(`[RSS Parser] ✓ Browser automation succeeded: ${feed.title || 'Untitled'}`);
      
      return {
        title: feed.title || "Untitled Feed",
        link: feed.link,
        items: feed.items || [],
        _metadata: {
          usedBrowserAutomation: true,
        },
      };
    } catch (browserError) {
      console.error(`[RSS Parser] ✗ Browser automation failed:`, browserError instanceof Error ? browserError.message : browserError);
      // Fall through to standard methods
    }
  }
  
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
      
      console.log(`[RSS Parser] STEP 2: Parsing feed (attempt ${i + 1}/${userAgents.length}): ${feedUrl}`);
      
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
      
      console.log(`[RSS Parser] ✓ STEP 2 SUCCESS: Successfully parsed feed: ${feed.title || 'Untitled'}`);
      
      return {
        title: feed.title || "Untitled Feed",
        link: feed.link,
        items: feed.items || [],
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
  
  // STEP 3: Try advanced HTTP client with multiple strategies
  console.log(`[RSS Parser] STEP 3: Trying advanced HTTP client + rss-parser...`);
  if (isLikelyBlocked(lastError)) {
    console.warn(`[RSS Parser] STEP 3: Feed appears to be blocked, trying advanced HTTP client...`);
    
    try {
      let text = await fetchFeed(feedUrl);
      
      // Log first 500 chars to debug
      console.log(`[RSS Parser] Raw response first 500 chars:`, text.substring(0, 500));
      console.log(`[RSS Parser] First char code:`, text.charCodeAt(0));
      
      // Additional cleanup for XML parsing
      // Remove BOM if present
      if (text.charCodeAt(0) === 0xFEFF) {
        console.log(`[RSS Parser] Removing BOM`);
        text = text.substring(1);
      }
      // Remove any leading/trailing whitespace
      text = text.trim();
      
      // Check if it looks like XML
      if (!text.startsWith('<?xml') && !text.startsWith('<rss') && !text.startsWith('<feed')) {
        console.error(`[RSS Parser] Content doesn't look like XML. First 200 chars:`, text.substring(0, 200));
        throw new Error('Response is not valid XML/RSS feed - got HTML or other content');
      }
      
      const parser = new Parser({
        customFields: {
          item: [
            ["media:content", "mediaContent"],
            ["media:thumbnail", "mediaThumbnail"],
            ["content:encoded", "contentEncoded"],
            ["content", "contentEncoded"],
            ["pubdate", "pubDate"],
          ],
        },
      });
      
      const feed = await parser.parseString(text);
      
      console.log(`[RSS Parser] ✓ STEP 3 SUCCESS: Successfully parsed feed via advanced HTTP client: ${feed.title || 'Untitled'}`);
      
      return {
        title: feed.title || "Untitled Feed",
        link: feed.link,
        items: feed.items || [],
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
              "User-Agent": getRandomUserAgent(),
              "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
            },
          },
        });
        
        const feed = await proxyParser.parseURL(url);
        
        console.log(`[RSS Parser] ✓ STEP 4 SUCCESS: Successfully parsed feed via ${proxy}: ${feed.title || 'Untitled'}`);
        
        return {
          title: feed.title || "Untitled Feed",
          link: feed.link,
          items: feed.items || [],
        };
      } catch (proxyError) {
        console.warn(`[RSS Parser] STEP 4: ${proxy} failed:`, proxyError instanceof Error ? proxyError.message : proxyError);
        continue;
      }
    }
  }
  
  // STEP 5: Try browser automation (last resort for blocked feeds)
  if (isLikelyBlocked(lastError) && browserAutomationService.isAvailable()) {
    try {
      console.log(`[RSS Parser] STEP 5: Trying browser automation (Puppeteer)...`);
      
      const htmlContent = await browserAutomationService.fetchWithBrowser(feedUrl, {
        timeout: 60000,
      });
      
      // Parse the HTML content as XML/RSS
      const feed = await parser.parseString(htmlContent);
      
      console.log(`[RSS Parser] ✓ STEP 5 SUCCESS: Browser automation succeeded: ${feed.title || 'Untitled'}`);
      
      return {
        title: feed.title || "Untitled Feed",
        link: feed.link,
        items: feed.items || [],
        _metadata: {
          usedBrowserAutomation: true,
        },
      };
    } catch (browserError) {
      console.error(`[RSS Parser] ✗ STEP 5 FAILED: Browser automation failed:`, browserError instanceof Error ? browserError.message : browserError);
    }
  }
  
  console.error(`[RSS Parser] ✗ ALL STEPS FAILED: Failed to parse feed ${feedUrl} after all attempts`);
  console.error(`[RSS Parser] Final error:`, lastError);
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

