/**
 * RSS Proxy Service
 * Provides fallback mechanisms for feeds that are blocked or inaccessible
 */

export interface ProxyConfig {
  name: string;
  buildUrl: (feedUrl: string) => string;
  enabled: boolean;
}

/**
 * Available RSS proxy services
 */
export const RSS_PROXIES: ProxyConfig[] = [
  {
    name: "OpenRSS",
    buildUrl: (feedUrl: string) => `https://openrss.org/${encodeURIComponent(feedUrl)}`,
    enabled: true,
  },
  {
    name: "RSS Bridge (Public)",
    buildUrl: (feedUrl: string) => {
      // RSS Bridge requires specific bridge format, this is a generic fallback
      const encoded = encodeURIComponent(feedUrl);
      return `https://rss-bridge.org/bridge01/?action=display&bridge=FeedExpander&url=${encoded}&format=Atom`;
    },
    enabled: false, // Disabled by default as it may not work for all feeds
  },
  {
    name: "FeedBurner Proxy",
    buildUrl: (feedUrl: string) => {
      // Try to extract domain and create a feedburner-style URL
      try {
        const url = new URL(feedUrl);
        const domain = url.hostname.replace(/^www\./, '');
        return `https://feeds.feedburner.com/${domain}`;
      } catch {
        return feedUrl;
      }
    },
    enabled: false, // Only works for feeds already on FeedBurner
  },
];

/**
 * Get list of enabled proxy services
 */
export function getEnabledProxies(): ProxyConfig[] {
  return RSS_PROXIES.filter(proxy => proxy.enabled);
}

/**
 * Generate proxy URLs for a given feed URL
 */
export function generateProxyUrls(feedUrl: string): Array<{ proxy: string; url: string }> {
  return getEnabledProxies().map(proxy => ({
    proxy: proxy.name,
    url: proxy.buildUrl(feedUrl),
  }));
}

/**
 * Check if a URL is likely to be blocked by Cloudflare or similar
 */
export function isLikelyBlocked(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message || String(error);
  const errorCode = error.code;
  
  // Status codes that indicate blocking
  const blockingCodes = ['403', '429', '503', '522', '524'];
  
  // Check for blocking indicators
  return (
    blockingCodes.some(code => errorMessage.includes(code)) ||
    errorMessage.includes('Forbidden') ||
    errorMessage.includes('Too Many Requests') ||
    errorMessage.includes('Cloudflare') ||
    errorCode === 'ECONNRESET' ||
    errorCode === 'ETIMEDOUT'
  );
}
