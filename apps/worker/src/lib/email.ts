import nodemailer from "nodemailer";
import type { Item, Feed } from "../types/prisma.js";
import { generateUnsubscribeToken } from "./unsubscribe-token.js";
import { generateDigestHtml } from "../email-templates/digest-html.js";
import { generateDigestText } from "../email-templates/digest-text.js";
import { buildEmailHeaders } from "./email-headers.js";
import { validateSmtpConfig, isValidEmail, sanitizeEmailAddress, sanitizeSubject } from "./email-validation.js";
import { logEmailSent, logEmailError, previewEmail } from "./email-logger.js";
import { logger } from "./logger.js";

interface TransporterConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

// Cache transporter to reuse connection
let cachedTransporter: nodemailer.Transporter | null = null;

function createTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const config: TransporterConfig = {};

  if (process.env.SMTP_HOST) {
    config.host = process.env.SMTP_HOST;
    config.port = parseInt(process.env.SMTP_PORT || "587", 10);
    config.secure = process.env.SMTP_SECURE === "true";
    config.auth = {
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    };
  } else {
    // Default to console transport for development
    return nodemailer.createTransport({
      streamTransport: true,
      newline: "unix",
      buffer: true,
    });
  }

  cachedTransporter = nodemailer.createTransport(config);
  return cachedTransporter;
}

/**
 * Send daily digest email to subscriber
 * Uses new template system with proper headers and validation
 * 
 * @param email - Recipient email address
 * @param name - Recipient name
 * @param items - Feed items to include in digest
 */
export async function sendDigestEmail(
  email: string,
  name: string,
  items: (Item & { feed: Feed })[],
) {
  const timezone = process.env.TZ || "America/Sao_Paulo";
  const fromEmail = process.env.SMTP_FROM || "noreply@thefeeder.com";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:7389";
  
  // Validate SMTP configuration
  const validation = validateSmtpConfig();
  if (!validation.valid && process.env.SMTP_HOST) {
    logger.error("SMTP configuration invalid", new Error(validation.errors.join(', ')));
    throw new Error("Cannot send emails - SMTP not configured properly");
  }
  
  if (validation.warnings.length > 0) {
    logger.warn("SMTP configuration warnings: " + validation.warnings.join(', '));
  }
  
  // Validate and sanitize email address
  if (!isValidEmail(email)) {
    logger.warn(`Skipping invalid email address: ${email}`);
    return;
  }
  
  const sanitizedEmail = sanitizeEmailAddress(email);
  
  // Generate URLs
  const logoUrl = `${siteUrl.replace(/\/$/, "")}/logo.png`;
  const unsubscribeToken = generateUnsubscribeToken(sanitizedEmail);
  const unsubscribeUrl = `${siteUrl}/unsubscribe/${unsubscribeToken}`;
  
  // Build email headers
  const emailHeaders = buildEmailHeaders(
    sanitizedEmail,
    name,
    items.length,
    unsubscribeUrl,
    fromEmail,
    timezone
  );
  
  // Generate HTML and text content
  const html = generateDigestHtml({
    name,
    items,
    siteUrl,
    logoUrl,
    unsubscribeUrl,
    timezone,
  });
  
  const text = generateDigestText({
    name,
    items,
    siteUrl,
    unsubscribeUrl,
    timezone,
  });
  
  // Preview mode for development
  if (!process.env.SMTP_HOST) {
    previewEmail(html, text, sanitizedEmail, emailHeaders.subject, emailHeaders.headers);
    return;
  }
  
  // Send email
  const transporter = createTransporter();
  
  try {
    // Sanitize subject line to prevent header injection
    const sanitizedSubject = sanitizeSubject(emailHeaders.subject);
    
    // Set timeout for email sending (30 seconds)
    const sendPromise = transporter.sendMail({
      from: emailHeaders.from,
      to: emailHeaders.to,
      replyTo: emailHeaders.replyTo || emailHeaders.from,
      subject: sanitizedSubject,
      html,
      text,
      messageId: emailHeaders.messageId,
      date: emailHeaders.date,
      headers: emailHeaders.headers,
    });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Email send timeout (30s)")), 30000);
    });
    
    await Promise.race([sendPromise, timeoutPromise]);
    
    // Log successful send
    logEmailSent({
      timestamp: new Date().toISOString(),
      messageId: emailHeaders.messageId,
      to: sanitizedEmail,
      subject: emailHeaders.subject,
      status: "sent",
      itemCount: items.length,
    });
  } catch (error) {
    // Log error
    logEmailError({
      timestamp: new Date().toISOString(),
      messageId: emailHeaders.messageId,
      to: sanitizedEmail,
      subject: emailHeaders.subject,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      itemCount: items.length,
    });
    
    throw error;
  }
}

