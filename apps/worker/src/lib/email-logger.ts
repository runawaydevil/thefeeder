/**
 * Email log entry for structured logging
 */
export interface EmailLogEntry {
  timestamp: string;
  messageId: string;
  to: string;
  subject: string;
  status: "sent" | "failed";
  error?: string;
  itemCount: number;
}

/**
 * Log successful email send
 * 
 * @param entry - Email log entry
 * 
 * @example
 * logEmailSent({
 *   timestamp: new Date().toISOString(),
 *   messageId: '<123@domain.com>',
 *   to: 'user@example.com',
 *   subject: 'Daily Digest',
 *   status: 'sent',
 *   itemCount: 15
 * });
 */
export function logEmailSent(entry: EmailLogEntry): void {
  console.log(
    `[EMAIL SENT] ${entry.timestamp} | To: ${entry.to} | Subject: "${entry.subject}" | ` +
    `Items: ${entry.itemCount} | MessageID: ${entry.messageId}`
  );
}

/**
 * Log email send error
 * 
 * @param entry - Email log entry with error
 * 
 * @example
 * logEmailError({
 *   timestamp: new Date().toISOString(),
 *   messageId: '<123@domain.com>',
 *   to: 'user@example.com',
 *   subject: 'Daily Digest',
 *   status: 'failed',
 *   error: 'SMTP connection failed',
 *   itemCount: 15
 * });
 */
export function logEmailError(entry: EmailLogEntry): void {
  console.error(
    `[EMAIL FAILED] ${entry.timestamp} | To: ${entry.to} | Subject: "${entry.subject}" | ` +
    `Items: ${entry.itemCount} | MessageID: ${entry.messageId} | Error: ${entry.error || "Unknown error"}`
  );
}

/**
 * Preview email in console for development
 * Shows formatted preview of email content and headers
 * 
 * @param html - HTML content
 * @param text - Plain text content
 * @param to - Recipient email
 * @param subject - Email subject
 * @param headers - Email headers
 * 
 * @example
 * previewEmail(
 *   '<html>...</html>',
 *   'Plain text...',
 *   'user@example.com',
 *   'Daily Digest',
 *   { 'List-Unsubscribe': '...' }
 * );
 */
export function previewEmail(
  html: string,
  text: string,
  to: string,
  subject: string,
  headers: Record<string, string>
): void {
  console.log("\n" + "=".repeat(70));
  console.log("EMAIL PREVIEW (Development Mode)");
  console.log("=".repeat(70));
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log("\nHeaders:");
  for (const [key, value] of Object.entries(headers)) {
    console.log(`  ${key}: ${value}`);
  }
  console.log("\n" + "-".repeat(70));
  console.log("HTML Content (first 500 chars):");
  console.log("-".repeat(70));
  console.log(html.substring(0, 500) + (html.length > 500 ? "..." : ""));
  console.log("\n" + "-".repeat(70));
  console.log("Plain Text Content (first 500 chars):");
  console.log("-".repeat(70));
  console.log(text.substring(0, 500) + (text.length > 500 ? "..." : ""));
  console.log("=".repeat(70) + "\n");
}
