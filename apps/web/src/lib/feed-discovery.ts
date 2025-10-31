import { getRandomUserAgent } from "./user-agents";

export interface DiscoveredFeed {
  url: string;
  title: string;
  type: "rss" | "atom" | "json";
}

/**
 * Discover RSS/Atom feeds from a website URL
 */
export async function discoverFeeds(siteUrl: string): Promise<DiscoveredFeed[]> {
  const discoveredFeeds: DiscoveredFeed[] = [];

  try {
    // Normalize URL
    let normalizedUrl = siteUrl.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    const urlObj = new URL(normalizedUrl);
    
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

    // Try to fetch the page and discover feeds via HTML
    const htmlFeeds = await discoverFeedsFromHTML(normalizedUrl);
    discoveredFeeds.push(...htmlFeeds);

    // If no feeds found in HTML, try common feed paths
    if (discoveredFeeds.length === 0) {
      const commonFeeds = await discoverCommonFeeds(normalizedUrl);
      discoveredFeeds.push(...commonFeeds);
    }
  } catch (error) {
    console.error("Error discovering feeds:", error);
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
      
      // Verify feed exists
      const isValid = await validateFeed(feedUrl);
      if (isValid) {
        return {
          url: feedUrl,
          title: `Reddit - r/${subreddit}`,
          type: "rss",
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
      
      const isValid = await validateFeed(feedUrl);
      if (isValid) {
        feeds.push({
          url: feedUrl,
          title: channelTitle || `YouTube Channel - ${channelId}`,
          type: "atom",
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
      
      const isValid = await validateFeed(feedUrl);
      if (isValid) {
        feeds.push({
          url: feedUrl,
          title: `GitHub - ${username}`,
          type: "atom",
        });
      }
    }
    
    // GitHub repository: /username/repo
    if (pathParts.length === 2) {
      const username = pathParts[0];
      const repo = pathParts[1];
      const releasesFeedUrl = `https://github.com/${username}/${repo}/releases.atom`;
      
      const isValid = await validateFeed(releasesFeedUrl);
      if (isValid) {
        feeds.push({
          url: releasesFeedUrl,
          title: `GitHub - ${username}/${repo} Releases`,
          type: "atom",
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
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      return feeds;
    }

    const html = await response.text();
    
    // Parse HTML for feed links
    const feedLinkRegex = /<link[^>]+(?:rel=["']alternate["']|type=["'][^"']*rss[^"']*["']|type=["'][^"']*atom[^"']*["'])[^>]*>/gi;
    const matches = html.match(feedLinkRegex);
    
    if (matches) {
      for (const match of matches) {
        const hrefMatch = match.match(/href=["']([^"']+)["']/i);
        const typeMatch = match.match(/type=["']([^"']+)["']/i);
        
        if (hrefMatch) {
          let feedUrl = hrefMatch[1];
          if (feedUrl.startsWith("//")) {
            feedUrl = `https:${feedUrl}`;
          } else if (feedUrl.startsWith("/")) {
            const baseUrl = new URL(siteUrl);
            feedUrl = `${baseUrl.origin}${feedUrl}`;
          } else if (!feedUrl.startsWith("http")) {
            const baseUrl = new URL(siteUrl);
            feedUrl = `${baseUrl.origin}/${feedUrl}`;
          }
          
          // Determine feed type
          let feedType: "rss" | "atom" | "json" = "rss";
          if (typeMatch) {
            const type = typeMatch[1].toLowerCase();
            if (type.includes("atom")) {
              feedType = "atom";
            } else if (type.includes("json")) {
              feedType = "json";
            }
          } else if (feedUrl.includes(".atom") || feedUrl.includes("/atom")) {
            feedType = "atom";
          } else if (feedUrl.includes(".json") || feedUrl.includes("/json")) {
            feedType = "json";
          }
          
          const isValid = await validateFeed(feedUrl);
          if (isValid) {
            feeds.push({
              url: feedUrl,
              title: `Feed (${feedType.toUpperCase()})`,
              type: feedType,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("Error discovering feeds from HTML:", error);
  }
  
  return feeds;
}

async function discoverCommonFeeds(siteUrl: string): Promise<DiscoveredFeed[]> {
  const feeds: DiscoveredFeed[] = [];
  const baseUrl = new URL(siteUrl);
  
  const commonPaths = [
    "/feed",
    "/feed.xml",
    "/rss",
    "/rss.xml",
    "/atom.xml",
    "/index.xml",
    "/feeds/all",
    "/blog/feed",
    "/blog/rss",
  ];
  
  for (const path of commonPaths) {
    try {
      const feedUrl = `${baseUrl.origin}${path}`;
      const isValid = await validateFeed(feedUrl);
      
      if (isValid) {
        const feedType = path.includes("atom") ? "atom" : path.includes("json") ? "json" : "rss";
        feeds.push({
          url: feedUrl,
          title: `Feed (${feedType.toUpperCase()})`,
          type: feedType,
        });
        break; // Found at least one feed
      }
    } catch (error) {
      // Continue trying other paths
    }
  }
  
  return feeds;
}

async function validateFeed(feedUrl: string): Promise<boolean> {
  try {
    const response = await fetch(feedUrl, {
      method: "HEAD",
      headers: {
        "User-Agent": getRandomUserAgent(),
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      return false;
    }

    const contentType = response.headers.get("content-type") || "";
    
    // Check if it's a valid feed content type
    return (
      contentType.includes("application/rss+xml") ||
      contentType.includes("application/atom+xml") ||
      contentType.includes("application/xml") ||
      contentType.includes("text/xml") ||
      contentType.includes("application/json")
    );
  } catch (error) {
    return false;
  }
}


