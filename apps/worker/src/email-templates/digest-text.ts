import { DigestTextOptions } from "./types.js";

/**
 * Format date in English format
 */
function formatDate(date: Date, timezone: string): string {
  return date.toLocaleDateString("en-US", { 
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Wrap text to specified line width
 */
function wrapText(text: string, maxWidth: number = 70): string {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + word).length > maxWidth) {
      if (currentLine) {
        lines.push(currentLine.trim());
      }
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  }
  
  if (currentLine) {
    lines.push(currentLine.trim());
  }
  
  return lines.join('\n  ');
}

/**
 * Group items by feed
 */
function groupItemsByFeed(items: DigestTextOptions["items"]) {
  return items.reduce((acc, item) => {
    const feedTitle = item.feed.title;
    if (!acc[feedTitle]) {
      acc[feedTitle] = [];
    }
    acc[feedTitle].push(item);
    return acc;
  }, {} as Record<string, DigestTextOptions["items"]>);
}

/**
 * Generate plain text email for daily digest
 * Well-formatted and readable in any email client
 * 
 * @param options - Email generation options
 * @returns Plain text string with proper formatting
 * 
 * @example
 * const text = generateDigestText({
 *   name: 'John Doe',
 *   items: [...],
 *   siteUrl: 'https://feeder.works',
 *   unsubscribeUrl: 'https://feeder.works/unsubscribe/token',
 *   timezone: 'America/Sao_Paulo'
 * });
 */
export function generateDigestText(options: DigestTextOptions): string {
  const { name, items, siteUrl, unsubscribeUrl, timezone } = options;
  
  const itemsByFeed: Record<string, DigestTextOptions["items"]> = groupItemsByFeed(items);
  const currentDate = formatDate(new Date(), timezone);
  
  let text = '';
  
  // Header
  text += '═══════════════════════════════════════════════════════════\n';
  text += '  THE FEEDER - DAILY DIGEST\n';
  text += `  ${currentDate}\n`;
  text += '═══════════════════════════════════════════════════════════\n\n';
  
  text += `Hello ${name},\n\n`;
  text += 'Here are the latest updates from your feeds:\n\n';
  
  // Feed sections
  for (const [feedTitle, feedItems] of Object.entries(itemsByFeed)) {
    text += '───────────────────────────────────────────────────────────\n';
    text += `📰 ${feedTitle.toUpperCase()}\n`;
    text += '───────────────────────────────────────────────────────────\n\n';
    
    for (const item of feedItems) {
      text += `• ${item.title}\n`;
      text += `  ${item.url}\n`;
      
      if (item.summary) {
        const summary = item.summary.substring(0, 200);
        text += `\n  ${wrapText(summary, 70)}\n`;
        if (item.summary.length > 200) {
          text += '  ...\n';
        }
      }
      
      text += '\n';
      
      // Meta information
      const metaParts: string[] = [];
      if (item.author) {
        metaParts.push(`By: ${item.author}`);
      }
      if (item.publishedAt) {
        metaParts.push(formatDate(new Date(item.publishedAt), timezone));
      }
      if (metaParts.length > 0) {
        text += `  ${metaParts.join(' | ')}\n`;
      }
      
      text += '\n';
    }
  }
  
  text += '───────────────────────────────────────────────────────────\n\n';
  
  // Footer
  text += `Visit TheFeeder: ${siteUrl}\n\n`;
  text += `To unsubscribe: ${unsubscribeUrl}\n\n`;
  text += '═══════════════════════════════════════════════════════════\n';
  text += 'TheFeeder - Modern RSS Aggregator\n';
  text += '═══════════════════════════════════════════════════════════\n';
  
  return text;
}
