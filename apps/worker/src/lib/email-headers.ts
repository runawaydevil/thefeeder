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
  subject: string;
  messageId: string;
  date: Date;
  headers: {
    "List-Unsubscribe": string;
    "List-Unsubscribe-Post": string;
    "Precedence": string;
    "X-Mailer": string;
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
  
  // Build subject line
  let subject = "Daily Digest";
  if (itemCount > 0) {
    subject = `Daily Digest: ${itemCount} ${itemCount === 1 ? 'novo artigo' : 'novos artigos'}`;
  }
  subject += ` - ${formattedDate}`;
  
  // Limit subject to 50 characters (excluding date)
  if (subject.length > 70) {
    subject = `Daily Digest - ${formattedDate}`;
  }
  
  return {
    from: `TheFeeder Daily Digest <${fromEmail}>`,
    to,
    subject,
    messageId,
    date: currentDate,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>, <mailto:unsubscribe@${domain}?subject=Unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      "Precedence": "bulk",
      "X-Mailer": "TheFeeder v2.0",
    },
  };
}
