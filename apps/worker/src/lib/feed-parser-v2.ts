/**
 * Robust Feed Parser V2
 * Custom XML parser that bypasses xml2js/sax limitations
 * Handles malformed XML, BOM, whitespace, and blocking mechanisms
 */

import { fetchFeed } from "./http-client.js";
import { logger } from "./logger.js";

export interface ParsedFeedV2 {
  title: string;
  link?: string;
  description?: string;
  items: FeedItemV2[];
}

export interface FeedItemV2 {
  title: string;
  link: string;
  description?: string;
  content?: string;
  pubDate?: string;
  author?: string;
  guid?: string;
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

/**
 * Extract text content from XML node
 * Handles CDATA sections and nested tags
 */
function extractText(xmlString: string, tagName: string): string | undefined {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xmlString.match(regex);
  if (match) {
    let text = match[1]
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') // Remove CDATA
      .replace(/<[^>]+>/g, '') // Remove HTML tags
      .trim();
    
    // Decode HTML entities
    text = decodeHtmlEntities(text);
    
    return text;
  }
  return undefined;
}

/**
 * Extract attribute from XML tag
 */
function extractAttribute(xmlString: string, tagName: string, attribute: string): string | undefined {
  const regex = new RegExp(`<${tagName}[^>]*${attribute}=["']([^"']*?)["'][^>]*>`, 'i');
  const match = xmlString.match(regex);
  return match ? match[1] : undefined;
}

/**
 * Parse RSS feed using regex-based extraction
 */
function parseRSS(xmlContent: string): ParsedFeedV2 {
  logger.debug('Parsing as RSS');
  
  // Extract feed-level metadata
  const title = extractText(xmlContent, 'title') || 'Untitled RSS Feed';
  const link = extractText(xmlContent, 'link');
  const description = extractText(xmlContent, 'description');
  
  // Extract items
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  const items: FeedItemV2[] = [];
  let itemMatch;
  
  while ((itemMatch = itemRegex.exec(xmlContent)) !== null) {
    const itemXml = itemMatch[1];
    
    const itemTitle = extractText(itemXml, 'title');
    const itemLink = extractText(itemXml, 'link');
    
    // Only add items with both title and link
    if (itemTitle && itemLink) {
      items.push({
        title: itemTitle,
        link: itemLink,
        description: extractText(itemXml, 'description'),
        content: extractText(itemXml, 'content:encoded') || extractText(itemXml, 'content'),
        pubDate: extractText(itemXml, 'pubDate') || extractText(itemXml, 'dc:date'),
        author: extractText(itemXml, 'author') || extractText(itemXml, 'dc:creator'),
        guid: extractText(itemXml, 'guid'),
      });
    }
  }
  
  logger.debug(`RSS parsed: ${title} (${items.length} items)`);
  
  return { title, link, description, items };
}

/**
 * Parse Atom feed using regex-based extraction
 */
function parseAtom(xmlContent: string): ParsedFeedV2 {
  logger.debug('Parsing as Atom');
  
  // Extract feed-level metadata
  const title = extractText(xmlContent, 'title') || 'Untitled Atom Feed';
  const linkMatch = xmlContent.match(/<link[^>]*href=["']([^"']*?)["'][^>]*>/i);
  const link = linkMatch ? linkMatch[1] : undefined;
  const description = extractText(xmlContent, 'subtitle') || extractText(xmlContent, 'summary');
  
  // Extract entries
  const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
  const items: FeedItemV2[] = [];
  let entryMatch;
  
  while ((entryMatch = entryRegex.exec(xmlContent)) !== null) {
    const entryXml = entryMatch[1];
    
    const entryTitle = extractText(entryXml, 'title');
    const entryLinkMatch = entryXml.match(/<link[^>]*href=["']([^"']*?)["'][^>]*>/i);
    const entryLink = entryLinkMatch ? entryLinkMatch[1] : undefined;
    
    // Only add entries with both title and link
    if (entryTitle && entryLink) {
      items.push({
        title: entryTitle,
        link: entryLink,
        description: extractText(entryXml, 'summary'),
        content: extractText(entryXml, 'content'),
        pubDate: extractText(entryXml, 'published') || extractText(entryXml, 'updated'),
        author: extractText(entryXml, 'author'),
        guid: extractText(entryXml, 'id'),
      });
    }
  }
  
  logger.debug(`Atom parsed: ${title} (${items.length} items)`);
  
  return { title, link, description, items };
}

/**
 * Detect feed type and parse accordingly
 */
function detectAndParse(xmlContent: string): ParsedFeedV2 {
  const content = xmlContent.toLowerCase();
  
  if (content.includes('<rss') || content.includes('<channel>')) {
    return parseRSS(xmlContent);
  } else if (content.includes('<feed') || content.includes('xmlns="http://www.w3.org/2005/atom"')) {
    return parseAtom(xmlContent);
  } else {
    // Default to RSS if unsure
    logger.debug('Unknown format, trying RSS');
    return parseRSS(xmlContent);
  }
}

/**
 * Main parsing function - replaces rss-parser completely
 * Fetches feed content and parses with custom XML parser
 */
export async function parseFeedV2(feedUrl: string): Promise<ParsedFeedV2> {
  logger.debug(`Parsing feed: ${feedUrl}`);
  
  try {
    // Use robust HTTP client to fetch feed
    const xmlContent = await fetchFeed(feedUrl);
    
    // XML cleanup
    let cleanXml = xmlContent;
    
    // Remove BOM (Byte Order Mark)
    if (cleanXml.charCodeAt(0) === 0xFEFF) {
      logger.debug(`Removing BOM`);
      cleanXml = cleanXml.substring(1);
    }
    
    // Trim whitespace
    cleanXml = cleanXml.trim();
    
    // Remove any leading garbage before XML declaration
    const xmlStart = cleanXml.search(/<\?xml|<rss|<feed/i);
    if (xmlStart > 0) {
      logger.debug(`Removing ${xmlStart} chars before XML start`);
      cleanXml = cleanXml.substring(xmlStart);
    }
    
    // Log first 200 chars for debugging
    logger.debug(`Clean XML first 200 chars: ${cleanXml.substring(0, 200)}`);
    
    // Validate it looks like XML
    if (!cleanXml.startsWith('<?xml') && !cleanXml.startsWith('<rss') && !cleanXml.startsWith('<feed')) {
      logger.error(`Content doesn't look like XML. First 200 chars: ${cleanXml.substring(0, 200)}`);
      throw new Error('Response is not valid XML/RSS feed');
    }
    
    // Parse the feed
    const result = detectAndParse(cleanXml);
    
    logger.debug(`Successfully parsed: ${result.title} (${result.items.length} items)`);
    
    return result;
  } catch (error) {
    logger.error(`Failed to parse ${feedUrl}`, error as Error);
    throw new Error(`Failed to parse feed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
