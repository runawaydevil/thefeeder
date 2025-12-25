import { fetchFeed } from "./http-client.js";
import { getRandomUserAgent } from "./user-agents.js";
import { logger } from "./logger.js";

/**
 * Service for discovering alternative feed URLs
 */
export class FeedDiscoveryService {
  /**
   * Discover alternative feed URLs for a given URL
   */
  async discoverAlternatives(url: string): Promise<string[]> {
    const alternatives: string[] = [];
    
    try {
      const baseUrl = this.getBaseUrl(url);
      
      // Try common feed patterns
      const patterns = [
        '/rss',
        '/feed',
        '/atom.xml',
        '/rss.xml',
        '/feed.xml',
        '/index.xml',
        '/feeds/posts/default',
        '/blog/feed',
        '/blog/rss',
      ];
      
      for (const pattern of patterns) {
        const alternativeUrl = `${baseUrl}${pattern}`;
        if (alternativeUrl !== url) {
          alternatives.push(alternativeUrl);
        }
      }
      
      // Try to parse HTML and find feed links
      try {
        const htmlAlternatives = await this.findFeedLinksInHtml(baseUrl);
        alternatives.push(...htmlAlternatives.filter(alt => alt !== url));
      } catch (error) {
        logger.debug(`Could not parse HTML for ${baseUrl}`);
      }
      
      logger.debug(`Found ${alternatives.length} alternatives for ${url}`);
      return alternatives;
    } catch (error: any) {
      logger.error(`Error discovering alternatives: ${error.message}`);
      return alternatives;
    }
  }
  
  /**
   * Extract base URL from feed URL
   */
  private getBaseUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}`;
    } catch (error) {
      return url;
    }
  }
  
  /**
   * Find feed links in HTML page
   */
  private async findFeedLinksInHtml(url: string): Promise<string[]> {
    const alternatives: string[] = [];
    
    try {
      const userAgent = getRandomUserAgent();
      const html = await fetchFeed(url);
      
      // Look for <link> tags with feed types
      const linkRegex = /<link[^>]*(?:type=["']application\/(?:rss|atom)\+xml["']|rel=["']alternate["'])[^>]*>/gi;
      const matches = html.match(linkRegex) || [];
      
      for (const match of matches) {
        const hrefMatch = match.match(/href=["']([^"']+)["']/i);
        if (hrefMatch) {
          let feedUrl = hrefMatch[1];
          
          // Convert relative URLs to absolute
          if (feedUrl.startsWith('/')) {
            const baseUrl = this.getBaseUrl(url);
            feedUrl = `${baseUrl}${feedUrl}`;
          } else if (!feedUrl.startsWith('http')) {
            feedUrl = `${url}/${feedUrl}`;
          }
          
          alternatives.push(feedUrl);
        }
      }
      
      return alternatives;
    } catch (error: any) {
      logger.debug(`Could not fetch HTML: ${error.message}`);
      return alternatives;
    }
  }
  
  /**
   * Test if an alternative URL is valid
   */
  async testAlternative(url: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const userAgent = getRandomUserAgent();
      const Parser = (await import('rss-parser')).default;
      const parser = new Parser();
      
      // Try to fetch and parse the feed
      const feedContent = await fetchFeed(url);
      await parser.parseString(feedContent);
      
      return { valid: true };
    } catch (error: any) {
      return { 
        valid: false, 
        error: error.message 
      };
    }
  }
}

export const feedDiscoveryService = new FeedDiscoveryService();
