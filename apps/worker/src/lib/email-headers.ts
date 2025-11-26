import { randomBytes } from "crypto";

/**
 * Extract domain from email address
 */
function extractDomain(email: string): string {
  const match = email.match(/@(.+)$/);
  return match ? match[1] : "localhost";
}

/**
 * Generate unique Message-ID for email
 * Format: <timestamp-random@domain.com>
 * 
 * @param fromEmail - From email address to extract domain
 * @returns Unique Message-ID string
 * 
 * @example
 * const messageId = generateMessageId('noreply@feeder.works');
 * // Returns: <1699876543210-a1b2c3d4@feeder.works>
 */
export function generateMessageId(fromEmail: string): string {
  const timestamp = Date.now();
  const random = randomBytes(8).toString("hex");
  const domain = extractDomain(fromEmail);
  
  return `<${timestamp}-${random}@${domain}>`;
}

/**
 * Email headers for digest email
 */
export interface EmailHeaders {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  messageId: string;
  date: Date;
  headers: {
    "List-Unsubscribe": string;
    "List-Unsubscribe-Post": string;
    "MIME-Version": string;
    "X-Mailer": string;
    "X-Auto-Response-Suppress": string;
    "Importance": string;
    "X-Priority": string;
    "Return-Path"?: string;
  };
}

/**
 * Build complete email headers for digest email
 * Includes anti-spam headers and proper formatting
 * 
 * @param to - Recipient email address
 * @param name - Recipient name
 * @param itemCount - Number of items in digest
 * @param unsubscribeUrl - Unsubscribe URL
 * @param fromEmail - From email address
 * @returns Complete email headers object
 * 
 * @example
 * const headers = buildEmailHeaders(
 *   'user@example.com',
 *   'John Doe',
 *   15,
 *   'https://feeder.works/unsubscribe/token',
 *   'noreply@feeder.works'
 * );
 */
export function buildEmailHeaders(
  to: string,
  name: string,
  itemCount: number,
  unsubscribeUrl: string,
  fromEmail: string,
  timezone: string = "America/Sao_Paulo"
): EmailHeaders {
  const messageId = generateMessageId(fromEmail);
  const domain = extractDomain(fromEmail);
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString("pt-BR", { timeZone: timezone });
  
  // Build subject line - use English only to avoid spam filters
  // Keep it simple and professional
  let subject = "Daily Digest";
  if (itemCount > 0) {
    subject = `Daily Digest: ${itemCount} ${itemCount === 1 ? 'new article' : 'new articles'}`;
  }
  subject += ` - ${formattedDate}`;
  
  // Limit subject to 70 characters total
  if (subject.length > 70) {
    subject = `Daily Digest - ${formattedDate}`;
  }
  
  // Sanitize subject to remove any problematic characters
  subject = subject.replace(/[^\x20-\x7E]/g, '').trim();
  
  // Set reply-to to a valid address (prefer support email, fallback to from)
  const replyToEmail = process.env.SMTP_REPLY_TO || fromEmail;
  
  return {
    from: `TheFeeder <${fromEmail}>`,
    to,
    replyTo: replyToEmail,
    subject,
    messageId,
    date: currentDate,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>, <mailto:unsubscribe@${domain}?subject=Unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      "MIME-Version": "1.0",
      "X-Mailer": "TheFeeder/2.0",
      "X-Auto-Response-Suppress": "All",
      "Importance": "normal",
      "X-Priority": "3",
      "Return-Path": fromEmail,
    },
  };
}
