/**
 * Email log entry for structured logging
 */
import { logger } from './logger.js';

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
  logger.info(
    `Email sent to ${entry.to} | Subject: "${entry.subject}" | Items: ${entry.itemCount} | MessageID: ${entry.messageId}`
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
  logger.error(
    `Email failed to ${entry.to} | Subject: "${entry.subject}" | Items: ${entry.itemCount} | MessageID: ${entry.messageId} | Error: ${entry.error || "Unknown error"}`
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
  const preview = [
    "EMAIL PREVIEW (Development Mode)",
    "=".repeat(70),
    `To: ${to}`,
    `Subject: ${subject}`,
    "\nHeaders:",
    ...Object.entries(headers).map(([key, value]) => `  ${key}: ${value}`),
    "\nHTML Content (first 500 chars):",
    "-".repeat(70),
    html.substring(0, 500) + (html.length > 500 ? "..." : ""),
    "\nPlain Text Content (first 500 chars):",
    "-".repeat(70),
    text.substring(0, 500) + (text.length > 500 ? "..." : ""),
    "=".repeat(70)
  ].join("\n");
  
  logger.debug(preview);
}
