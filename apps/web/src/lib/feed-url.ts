/**
 * Normalize feed URL to prevent duplicates
 * - Removes trailing slashes
 * - Normalizes protocol (http -> https)
 * - Removes fragments (#)
 * - Converts hostname to lowercase
 * - Removes default ports (80, 443)
 */
export function normalizeFeedUrl(url: string): string {
  try {
    const urlObj = new URL(url.trim());
    
    // Normalize protocol: http -> https
    if (urlObj.protocol === "http:") {
      urlObj.protocol = "https:";
    }
    
    // Remove fragment
    urlObj.hash = "";
    
    // Remove default ports (80 for http, 443 for https)
    if (urlObj.port === "80" || urlObj.port === "443") {
      urlObj.port = "";
    }
    
    // Convert hostname to lowercase
    urlObj.hostname = urlObj.hostname.toLowerCase();
    
    // Remove trailing slash from pathname
    let pathname = urlObj.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    urlObj.pathname = pathname;
    
    // Remove query parameters that are commonly used for tracking/caching
    // but keep essential ones like feed parameters
    const params = new URLSearchParams(urlObj.search);
    const filteredParams = new URLSearchParams();
    
    // Keep important query parameters
    const keepParams = ["format", "type", "feed", "rss", "atom"];
    for (const [key, value] of params.entries()) {
      const lowerKey = key.toLowerCase();
      // Keep if it's an important parameter or if it's not a tracking parameter
      if (keepParams.includes(lowerKey) || (!lowerKey.includes("utm_") && !lowerKey.includes("ref") && !lowerKey.includes("source"))) {
        filteredParams.append(key, value);
      }
    }
    
    urlObj.search = filteredParams.toString();
    
    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, return original URL trimmed
    return url.trim();
  }
}

/**
 * Check if two feed URLs are the same after normalization
 */
export function areFeedUrlsEqual(url1: string, url2: string): boolean {
  try {
    const normalized1 = normalizeFeedUrl(url1);
    const normalized2 = normalizeFeedUrl(url2);
    return normalized1 === normalized2;
  } catch {
    return false;
  }
}

