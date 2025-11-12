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
    name: "RSS.app",
    buildUrl: (feedUrl: string) => {
      // RSS.app provides a simple proxy service
      const encoded = encodeURIComponent(feedUrl);
      return `https://rss.app/feeds/${Buffer.from(feedUrl).toString('base64').replace(/=/g, '')}`;
    },
    enabled: true,
  },
  {
    name: "FetchRSS",
    buildUrl: (feedUrl: string) => {
      // FetchRSS can generate feeds from any URL
      const encoded = encodeURIComponent(feedUrl);
      return `https://fetchrss.com/rss/${encoded}`;
    },
    enabled: true,
  },
  {
    name: "OpenRSS",
    buildUrl: (feedUrl: string) => `https://openrss.org/${encodeURIComponent(feedUrl)}`,
    enabled: true,
  },
  {
    name: "RSS2JSON",
    buildUrl: (feedUrl: string) => {
      // RSS2JSON converts RSS to JSON, but we can still parse it
      const encoded = encodeURIComponent(feedUrl);
      return `https://api.rss2json.com/v1/api.json?rss_url=${encoded}`;
    },
    enabled: false, // Returns JSON format, needs special handling
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
