import { getRandomUserAgent } from "./user-agents";
import Parser from "rss-parser";

export interface DiscoveredFeed {
  url: string;
  title: string;
  type: "rss" | "atom" | "json";
  description?: string;
  itemCount?: number;
  lastItemDate?: Date;
  discoveryMethod?: "direct" | "html" | "common-path" | "special";
}

export interface FeedValidationResult {
  isValid: boolean;
  feedInfo?: {
    title: string;
    description?: string;
    itemCount: number;
    lastItemDate?: Date;
    type: "rss" | "atom" | "json";
  };
  error?: string;
}

// Create parser instance with timeout and custom fields
const parser = new Parser({
  timeout: 10000,
  requestOptions: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
    },
  },
  customFields: {
    feed: ["subtitle", "updated"],
    item: [
      ["media:content", "mediaContent"],
      ["media:thumbnail", "mediaThumbnail"],
      ["content:encoded", "contentEncoded"],
    ],
  },
});

// Cache for feed validation results (5 minutes TTL)
interface CacheEntry {
  result: FeedValidationResult;
  timestamp: number;
}

const validationCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Clean expired cache entries
 */
function cleanCache() {
  const now = Date.now();
  for (const [key, entry] of validationCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      validationCache.delete(key);
    }
  }
  // Limit cache size to 100 entries
  if (validationCache.size > 100) {
    const entriesToDelete = validationCache.size - 100;
    let deleted = 0;
    for (const key of validationCache.keys()) {
      if (deleted >= entriesToDelete) break;
      validationCache.delete(key);
      deleted++;
    }
  }
}

/**
 * Extract feed information from parsed feed
 */
function extractFeedInfo(feed: any): FeedValidationResult["feedInfo"] {
  const itemCount = feed.items?.length || 0;
  let lastItemDate: Date | undefined;
  
  if (feed.items && feed.items.length > 0) {
    const firstItem = feed.items[0];
    if (firstItem.pubDate) {
      lastItemDate = new Date(firstItem.pubDate);
    } else if (firstItem.isoDate) {
      lastItemDate = new Date(firstItem.isoDate);
    }
  }
  
  // Detect feed type
  let type: "rss" | "atom" | "json" = "rss";
  if (feed.feedUrl?.includes(".atom") || feed.link?.includes("/atom")) {
    type = "atom";
  } else if (feed.feedUrl?.includes(".json") || feed.link?.includes("/json")) {
    type = "json";
  }
  
  return {
    title: feed.title || "Untitled Feed",
    description: feed.description || feed.subtitle,
    itemCount,
    lastItemDate,
    type,
  };
}

/**
 * Validate if a URL points to a valid RSS/Atom/JSON feed
 * Uses rss-parser to validate feed structure
 * 
 * @param url - URL to validate
 * @returns Validation result with feed info if valid
 * 
 * @example
 * const result = await validateFeedDirect('https://example.com/feed');
 * if (result.isValid) {
 *   console.log(`Found feed: ${result.feedInfo.title}`);
 * }
 */
export async function validateFeedDirect(url: string): Promise<FeedValidationResult> {
  const startTime = Date.now();
  
  // Check cache first
  cleanCache();
  const cached = validationCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[Feed Discovery] Cache hit for ${url}`);
    return cached.result;
  }
  
  // Try with multiple User-Agents if we get 403
  const userAgents = [
    getRandomUserAgent(), // Random from pool
    'Feedly/1.0 (+http://www.feedly.com/fetcher.html; like FeedFetcher-Google)', // Feed reader
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', // Googlebot
    'curl/7.68.0', // Simple curl
  ];
  
  let lastError: any = null;
  
  for (let i = 0; i < userAgents.length; i++) {
    try {
      console.log(`[Feed Discovery] Validating direct feed (attempt ${i + 1}/${userAgents.length}): ${url}`);
      
      // Create a parser with specific User-Agent for this attempt
      const parserWithUA = new Parser({
        timeout: 10000,
        requestOptions: {
          headers: {
            'User-Agent': userAgents[i],
            'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
          },
        },
        customFields: {
          feed: ["subtitle", "updated"],
          item: [
            ["media:content", "mediaContent"],
            ["media:thumbnail", "mediaThumbnail"],
            ["content:encoded", "contentEncoded"],
          ],
        },
      });
      
      // Try to parse the feed
      const feed = await parserWithUA.parseURL(url);
      
      if (!feed.items || feed.items.length === 0) {
        console.warn(`[Feed Discovery] Feed ${url} has no items`);
      }
      
      const feedInfo = extractFeedInfo(feed);
      const result: FeedValidationResult = {
        isValid: true,
        feedInfo,
      };
      
      // Cache the result
      validationCache.set(url, {
        result,
        timestamp: Date.now(),
      });
      
      const duration = Date.now() - startTime;
      console.log(`[Feed Discovery] ✓ Valid feed found: ${result.feedInfo?.title} (${result.feedInfo?.itemCount} items) - ${duration}ms`);
      
      return result;
    } catch (error: any) {
      lastError = error;
      
      // If it's a 403, try next User-Agent
      if (error.message?.includes("403") || error.message?.includes("Forbidden")) {
        console.warn(`[Feed Discovery] Got 403 with User-Agent ${i + 1}, trying next...`);
        continue;
      }
      
      // For other errors, break the loop
      break;
    }
  }
  
  // All attempts failed
  const duration = Date.now() - startTime;
  let errorMessage = "Invalid feed format";
  
  if (lastError) {
    if (lastError.code === "ETIMEDOUT" || lastError.message?.includes("timeout")) {
      errorMessage = "Feed validation timeout";
      console.error(`[Feed Discovery] ✗ Timeout validating ${url} - ${duration}ms`);
    } else if (lastError.code === "ENOTFOUND") {
      errorMessage = "Feed URL not found";
      console.error(`[Feed Discovery] ✗ URL not found: ${url} - ${duration}ms`);
    } else if (lastError.code === "ECONNREFUSED") {
      errorMessage = "Connection refused";
      console.error(`[Feed Discovery] ✗ Connection refused: ${url} - ${duration}ms`);
    } else if (lastError.code === "ECONNRESET" || lastError.code === "EPIPE") {
      errorMessage = "Connection reset by server";
      console.error(`[Feed Discovery] ✗ Connection reset: ${url} - ${duration}ms`);
    } else if (lastError.code === "CERT_HAS_EXPIRED" || lastError.message?.includes("certificate")) {
      errorMessage = "SSL certificate error";
      console.error(`[Feed Discovery] ✗ SSL error: ${url} - ${duration}ms`);
    } else if (lastError.message?.includes("403") || lastError.message?.includes("Forbidden")) {
      errorMessage = "Access forbidden (403) - tried multiple User-Agents";
      console.error(`[Feed Discovery] ✗ Access forbidden after ${userAgents.length} attempts: ${url} - ${duration}ms`);
    } else if (lastError.message?.includes("404") || lastError.message?.includes("Not Found")) {
      errorMessage = "Feed not found (404)";
      console.error(`[Feed Discovery] ✗ Not found: ${url} - ${duration}ms`);
    } else {
      console.error(`[Feed Discovery] ✗ Parse error for ${url}: ${lastError.message} - ${duration}ms`, lastError);
    }
  }
  
  const result: FeedValidationResult = {
    isValid: false,
    error: errorMessage,
  };
  
  // Cache negative results too (but for shorter time)
  validationCache.set(url, {
    result,
    timestamp: Date.now(),
  });
  
  return result;
}

/**
 * Validate multiple feed URLs in parallel
 */
export async function validateMultipleFeeds(urls: string[]): Promise<FeedValidationResult[]> {
  return Promise.all(urls.map(url => validateFeedDirect(url)));
}

/**
 * Discover RSS/Atom feeds from a website URL
 * Uses 3-level fallback strategy:
 * 1. Direct validation - Try to parse URL as feed
 * 2. HTML discovery - Search for feed links in HTML
 * 3. Common paths - Try standard feed URLs
 */
export async function discoverFeeds(siteUrl: string): Promise<DiscoveredFeed[]> {
  const discoveredFeeds: DiscoveredFeed[] = [];
  const startTime = Date.now();

  try {
    // Normalize URL
    let normalizedUrl = siteUrl.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    const urlObj = new URL(normalizedUrl);
    
    console.log(`[Feed Discovery] ===== STARTING DISCOVERY FOR: ${normalizedUrl} =====`);
    
    // LEVEL 1: Try direct feed validation first
    console.log(`[Feed Discovery] → Level 1: Trying direct validation...`);
    const directValidation = await validateFeedDirect(normalizedUrl);
    if (directValidation.isValid && directValidation.feedInfo) {
      console.log(`[Feed Discovery] ✓ Level 1 SUCCESS: Direct feed detected!`);
      discoveredFeeds.push({
        url: normalizedUrl,
        title: directValidation.feedInfo.title,
        type: directValidation.feedInfo.type,
        description: directValidation.feedInfo.description,
        itemCount: directValidation.feedInfo.itemCount,
        lastItemDate: directValidation.feedInfo.lastItemDate,
        discoveryMethod: "direct",
      });
      const duration = Date.now() - startTime;
      console.log(`[Feed Discovery] ===== COMPLETED in ${duration}ms - Found 1 feed (direct) =====`);
      return discoveredFeeds;
    }
    
    // Handle Reddit subreddits
    if (urlObj.hostname.includes("reddit.com")) {
      const redditFeed = await discoverRedditFeed(normalizedUrl);
      if (redditFeed) {
        discoveredFeeds.push(redditFeed);
      }
      return discoveredFeeds;
    }

    // Handle YouTube channels
    if (urlObj.hostname.includes("youtube.com") || urlObj.hostname.includes("youtu.be")) {
      const youtubeFeeds = await discoverYouTubeFeeds(normalizedUrl);
      discoveredFeeds.push(...youtubeFeeds);
      if (youtubeFeeds.length > 0) {
        return discoveredFeeds;
      }
    }

    // Handle GitHub
    if (urlObj.hostname.includes("github.com")) {
      const githubFeeds = await discoverGitHubFeeds(normalizedUrl);
      discoveredFeeds.push(...githubFeeds);
      if (githubFeeds.length > 0) {
        return discoveredFeeds;
      }
    }

    // LEVEL 2: Try to fetch the page and discover feeds via HTML
    console.log(`[Feed Discovery] → Level 2: Searching HTML for feed links...`);
    const htmlFeeds = await discoverFeedsFromHTML(normalizedUrl);
    discoveredFeeds.push(...htmlFeeds);

    // LEVEL 3: If no feeds found in HTML, try common feed paths
    if (discoveredFeeds.length === 0) {
      console.log(`[Feed Discovery] → Level 3: Trying common feed paths...`);
      const commonFeeds = await discoverCommonFeeds(normalizedUrl);
      discoveredFeeds.push(...commonFeeds);
    }
    
    // Sort feeds by discovery method (direct > html > common-path)
    const methodPriority = { direct: 0, special: 1, html: 2, "common-path": 3 };
    discoveredFeeds.sort((a, b) => {
      const aPriority = methodPriority[a.discoveryMethod || "html"] || 99;
      const bPriority = methodPriority[b.discoveryMethod || "html"] || 99;
      return aPriority - bPriority;
    });
    
    const duration = Date.now() - startTime;
    console.log(`[Feed Discovery] ===== COMPLETED in ${duration}ms - Found ${discoveredFeeds.length} feed(s) =====`);
  } catch (error) {
    console.error("[Feed Discovery] ✗ Error discovering feeds:", error);
  }

  return discoveredFeeds;
}

async function discoverRedditFeed(url: string): Promise<DiscoveredFeed | null> {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    
    // Check if it's a subreddit URL
    if (pathParts[0] === "r" && pathParts[1]) {
      const subreddit = pathParts[1];
      const feedUrl = `https://www.reddit.com/r/${subreddit}.rss`;
      
      // Verify feed exists using direct validation
      const validation = await validateFeedDirect(feedUrl);
      if (validation.isValid && validation.feedInfo) {
        return {
          url: feedUrl,
          title: validation.feedInfo.title || `Reddit - r/${subreddit}`,
          type: validation.feedInfo.type,
          description: validation.feedInfo.description,
          itemCount: validation.feedInfo.itemCount,
          lastItemDate: validation.feedInfo.lastItemDate,
          discoveryMethod: "special",
        };
      }
    }
  } catch (error) {
    console.error("Error discovering Reddit feed:", error);
  }
  
  return null;
}

async function discoverYouTubeFeeds(url: string): Promise<DiscoveredFeed[]> {
  const feeds: DiscoveredFeed[] = [];
  
  try {
    const urlObj = new URL(url);
    let channelId: string | null = null;
    let channelTitle: string | null = null;
    
    // YouTube channel ID format: /channel/CHANNEL_ID
    const channelIdMatch = urlObj.pathname.match(/\/channel\/([^\/]+)/);
    if (channelIdMatch) {
      channelId = channelIdMatch[1];
    }
    
    // YouTube username/handle format: /@USERNAME
    const handleMatch = urlObj.pathname.match(/\/@([^\/]+)/);
    if (handleMatch && !channelId) {
      const handle = handleMatch[1];
      const channelPageUrl = `https://www.youtube.com/@${handle}`;
      const extracted = await extractYouTubeChannelId(channelPageUrl);
      channelId = extracted.channelId;
      channelTitle = extracted.title || `@${handle}`;
    }
    
    // YouTube user format: /user/USERNAME
    const userMatch = urlObj.pathname.match(/\/user\/([^\/]+)/);
    if (userMatch && !channelId) {
      const username = userMatch[1];
      const channelPageUrl = `https://www.youtube.com/user/${username}`;
      const extracted = await extractYouTubeChannelId(channelPageUrl);
      channelId = extracted.channelId;
      channelTitle = extracted.title || username;
    }
    
    // YouTube custom URL format: /c/CHANNELNAME
    const customMatch = urlObj.pathname.match(/\/c\/([^\/]+)/);
    if (customMatch && !channelId) {
      const customName = customMatch[1];
      const channelPageUrl = `https://www.youtube.com/c/${customName}`;
      const extracted = await extractYouTubeChannelId(channelPageUrl);
      channelId = extracted.channelId;
      channelTitle = extracted.title || customName;
    }
    
    // If we have a channel ID, create the feed
    if (channelId) {
      const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      
      const validation = await validateFeedDirect(feedUrl);
      if (validation.isValid && validation.feedInfo) {
        feeds.push({
          url: feedUrl,
          title: validation.feedInfo.title || channelTitle || `YouTube Channel - ${channelId}`,
          type: validation.feedInfo.type,
          description: validation.feedInfo.description,
          itemCount: validation.feedInfo.itemCount,
          lastItemDate: validation.feedInfo.lastItemDate,
          discoveryMethod: "special",
        });
      }
    }
  } catch (error) {
    console.error("Error discovering YouTube feeds:", error);
  }
  
  return feeds;
}

/**
 * Extract YouTube channel ID from a channel page URL
 * by fetching the HTML and parsing for channel ID
 */
async function extractYouTubeChannelId(channelUrl: string): Promise<{ channelId: string | null; title: string | null }> {
  try {
    const response = await fetch(channelUrl, {
      headers: {
        "User-Agent": getRandomUserAgent(),
        "Accept": "text/html, application/xhtml+xml, application/xml, */*",
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      return { channelId: null, title: null };
    }

    const html = await response.text();
    
    // Method 1: Look for channelId in meta tags
    const metaChannelIdMatch = html.match(/<meta[^>]+itemprop=["']channelId["'][^>]+content=["']([^"']+)["']/i);
    if (metaChannelIdMatch && metaChannelIdMatch[1]) {
      const channelId = metaChannelIdMatch[1];
      // Try to extract channel title
      const titleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
      const title = titleMatch ? titleMatch[1] : null;
      return { channelId, title };
    }
    
    // Method 2: Look for channelId in JSON-LD structured data
    const jsonLdMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/is);
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        if (Array.isArray(jsonLd)) {
          for (const item of jsonLd) {
            if (item["@type"] === "Person" || item["@type"] === "Organization") {
              const url = item.url || item.sameAs?.[0];
              if (url && typeof url === "string") {
                const channelIdMatch = url.match(/channel_id=([^&]+)/);
                if (channelIdMatch) {
                  return { channelId: channelIdMatch[1], title: item.name || null };
                }
              }
            }
          }
        } else if (jsonLd["@type"] === "Person" || jsonLd["@type"] === "Organization") {
          const url = jsonLd.url || jsonLd.sameAs?.[0];
          if (url && typeof url === "string") {
            const channelIdMatch = url.match(/channel_id=([^&]+)/);
            if (channelIdMatch) {
              return { channelId: channelIdMatch[1], title: jsonLd.name || null };
            }
          }
        }
      } catch (e) {
        // JSON parse failed, continue to next method
      }
    }
    
    // Method 3: Look for channel ID in ytInitialData
    const ytDataMatch = html.match(/var ytInitialData = ({.*?});/s);
    if (ytDataMatch) {
      try {
        const ytData = JSON.parse(ytDataMatch[1]);
        // Navigate through the nested structure to find channel ID
        const channelId = findChannelIdInYtData(ytData);
        if (channelId) {
          const title = findChannelTitleInYtData(ytData) || null;
          return { channelId, title };
        }
      } catch (e) {
        // JSON parse failed
      }
    }
    
    // Method 4: Look for channel ID in external ID or RSS link
    const rssLinkMatch = html.match(/<link[^>]+rel=["']alternate["'][^>]+type=["'][^"']*atom[^"']*["'][^>]+href=["']([^"']+channel_id=([^"']+))["']/i);
    if (rssLinkMatch && rssLinkMatch[2]) {
      return { channelId: rssLinkMatch[2], title: null };
    }
    
    return { channelId: null, title: null };
  } catch (error) {
    console.error("Error extracting YouTube channel ID:", error);
    return { channelId: null, title: null };
  }
}

/**
 * Recursively search for channel ID in YouTube's ytInitialData structure
 */
function findChannelIdInYtData(obj: any): string | null {
  if (typeof obj !== "object" || obj === null) {
    return null;
  }
  
  // Check for common channel ID patterns
  if (typeof obj.channelId === "string" && obj.channelId.startsWith("UC")) {
    return obj.channelId;
  }
  
  if (typeof obj.externalId === "string" && obj.externalId.startsWith("UC")) {
    return obj.externalId;
  }
  
  // Recursively search in arrays and objects
  for (const key in obj) {
    if (Array.isArray(obj[key])) {
      for (const item of obj[key]) {
        const result = findChannelIdInYtData(item);
        if (result) return result;
      }
    } else if (typeof obj[key] === "object") {
      const result = findChannelIdInYtData(obj[key]);
      if (result) return result;
    }
  }
  
  return null;
}

/**
 * Recursively search for channel title in YouTube's ytInitialData structure
 */
function findChannelTitleInYtData(obj: any): string | null {
  if (typeof obj !== "object" || obj === null) {
    return null;
  }
  
  // Check for common title patterns
  if (typeof obj.title === "string" && obj.title.length > 0) {
    return obj.title;
  }
  
  if (typeof obj.name === "string" && obj.name.length > 0) {
    return obj.name;
  }
  
  // Recursively search
  for (const key in obj) {
    if (Array.isArray(obj[key])) {
      for (const item of obj[key]) {
        const result = findChannelTitleInYtData(item);
        if (result) return result;
      }
    } else if (typeof obj[key] === "object") {
      const result = findChannelTitleInYtData(obj[key]);
      if (result) return result;
    }
  }
  
  return null;
}

async function discoverGitHubFeeds(url: string): Promise<DiscoveredFeed[]> {
  const feeds: DiscoveredFeed[] = [];
  
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    
    // GitHub user: /username
    if (pathParts.length === 1) {
      const username = pathParts[0];
      const feedUrl = `https://github.com/${username}.atom`;
      
      const validation = await validateFeedDirect(feedUrl);
      if (validation.isValid && validation.feedInfo) {
        feeds.push({
          url: feedUrl,
          title: validation.feedInfo.title || `GitHub - ${username}`,
          type: validation.feedInfo.type,
          description: validation.feedInfo.description,
          itemCount: validation.feedInfo.itemCount,
          lastItemDate: validation.feedInfo.lastItemDate,
          discoveryMethod: "special",
        });
      }
    }
    
    // GitHub repository: /username/repo
    if (pathParts.length === 2) {
      const username = pathParts[0];
      const repo = pathParts[1];
      const releasesFeedUrl = `https://github.com/${username}/${repo}/releases.atom`;
      
      const validation = await validateFeedDirect(releasesFeedUrl);
      if (validation.isValid && validation.feedInfo) {
        feeds.push({
          url: releasesFeedUrl,
          title: validation.feedInfo.title || `GitHub - ${username}/${repo} Releases`,
          type: validation.feedInfo.type,
          description: validation.feedInfo.description,
          itemCount: validation.feedInfo.itemCount,
          lastItemDate: validation.feedInfo.lastItemDate,
          discoveryMethod: "special",
        });
      }
    }
  } catch (error) {
    console.error("Error discovering GitHub feeds:", error);
  }
  
  return feeds;
}

async function discoverFeedsFromHTML(siteUrl: string): Promise<DiscoveredFeed[]> {
  const feeds: DiscoveredFeed[] = [];
  
  try {
    const response = await fetch(siteUrl, {
      headers: {
        "User-Agent": getRandomUserAgent(),
        "Accept": "text/html, application/xhtml+xml, application/xml, */*",
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.warn(`Failed to fetch HTML from ${siteUrl}: ${response.status} ${response.statusText}`);
      return feeds;
    }

    const html = await response.text();
    
    // Multiple regex patterns to catch different feed link formats
    const patterns = [
      // Standard: <link rel="alternate" type="application/rss+xml" href="...">
      /<link[^>]+rel=["'](?:alternate|feed|service\.feed)["'][^>]+type=["'][^"']*(?:rss|atom|feed)[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>/gi,
      // Reversed: <link href="..." rel="alternate" type="...">
      /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:alternate|feed|service\.feed)["'][^>]+type=["'][^"']*(?:rss|atom|feed)[^"']*["'][^>]*>/gi,
      // Type first: <link type="..." rel="alternate" href="...">
      /<link[^>]+type=["'][^"']*(?:rss|atom|feed)[^"']*["'][^>]+rel=["'](?:alternate|feed|service\.feed)["'][^>]+href=["']([^"']+)["'][^>]*>/gi,
      // Just type with feed-like URL: <link type="application/rss+xml" href="/feed">
      /<link[^>]+type=["'][^"']*(?:rss|atom|feed)[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>/gi,
      // Just rel with feed-like URL: <link rel="alternate" href="/feed.xml">
      /<link[^>]+rel=["'](?:alternate|feed|service\.feed)["'][^>]+href=["']([^"']*(?:rss|feed|atom)[^"']*)["'][^>]*>/gi,
    ];
    
    const foundUrls = new Set<string>();
    
    for (const pattern of patterns) {
      const matches = html.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          let feedUrl = match[1];
          
          // Normalize URL
          if (feedUrl.startsWith("//")) {
            feedUrl = `https:${feedUrl}`;
          } else if (feedUrl.startsWith("/")) {
            const baseUrl = new URL(siteUrl);
            feedUrl = `${baseUrl.origin}${feedUrl}`;
          } else if (!feedUrl.startsWith("http")) {
            const baseUrl = new URL(siteUrl);
            feedUrl = `${baseUrl.origin}/${feedUrl}`;
          }
          
          // Skip if already processed
          if (foundUrls.has(feedUrl)) {
            continue;
          }
          foundUrls.add(feedUrl);
          
          // Determine feed type from URL
          let feedType: "rss" | "atom" | "json" = "rss";
          if (feedUrl.includes(".atom") || feedUrl.includes("/atom")) {
            feedType = "atom";
          } else if (feedUrl.includes(".json") || feedUrl.includes("/json")) {
            feedType = "json";
          } else if (feedUrl.includes(".rss") || feedUrl.includes("/rss")) {
            feedType = "rss";
          }
          
          // Validate feed
          const validation = await validateFeedDirect(feedUrl);
          if (validation.isValid && validation.feedInfo) {
            feeds.push({
              url: feedUrl,
              title: validation.feedInfo.title || `Feed (${feedType.toUpperCase()})`,
              type: validation.feedInfo.type,
              description: validation.feedInfo.description,
              itemCount: validation.feedInfo.itemCount,
              lastItemDate: validation.feedInfo.lastItemDate,
              discoveryMethod: "html",
            });
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error discovering feeds from HTML for ${siteUrl}:`, error);
  }
  
  return feeds;
}

async function discoverCommonFeeds(siteUrl: string): Promise<DiscoveredFeed[]> {
  const feeds: DiscoveredFeed[] = [];
  const baseUrl = new URL(siteUrl);
  
  // Expanded list of common feed paths
  const commonPaths = [
    "/feed",
    "/feed.xml",
    "/feed/rss",
    "/feed/atom",
    "/feed/index.xml",
    "/rss",
    "/rss.xml",
    "/rss/feed",
    "/atom.xml",
    "/atom",
    "/feeds/all",
    "/feeds/posts/default",
    "/feeds/rss",
    "/feeds/atom",
    "/index.xml",
    "/index.rss",
    "/index.atom",
    "/blog/feed",
    "/blog/rss",
    "/blog/atom.xml",
    "/blog/feed.xml",
    "/posts/feed",
    "/posts/rss",
    "/news/feed",
    "/news/rss",
    // WordPress specific
    "/feed/rss/",
    "/feed/rss2/",
    "/feed/atom/",
    // Common CMS patterns
    "/syndication.axd",
    "/rss.aspx",
  ];
  
  // Build all URLs to test
  const urlsToTest = commonPaths.map(path => `${baseUrl.origin}${path}`);
  
  // Validate all URLs in parallel
  const validations = await validateMultipleFeeds(urlsToTest);
  
  // Process results
  for (let i = 0; i < validations.length; i++) {
    const validation = validations[i];
    if (validation.isValid && validation.feedInfo) {
      feeds.push({
        url: urlsToTest[i],
        title: validation.feedInfo.title || `Feed (${validation.feedInfo.type.toUpperCase()})`,
        type: validation.feedInfo.type,
        description: validation.feedInfo.description,
        itemCount: validation.feedInfo.itemCount,
        lastItemDate: validation.feedInfo.lastItemDate,
        discoveryMethod: "common-path",
      });
    }
  }
  
  return feeds;
}




