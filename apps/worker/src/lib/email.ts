import nodemailer from "nodemailer";
import { Item, Feed } from "@prisma/client";
import { generateUnsubscribeToken } from "./unsubscribe-token.js";

interface TransporterConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

function createTransporter() {
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

  return nodemailer.createTransport(config);
}

export async function sendDigestEmail(
  email: string,
  name: string,
  items: (Item & { feed: Feed })[],
) {
  const transporter = createTransporter();
  const fromEmail = process.env.SMTP_FROM || "noreply@thefeeder.com";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:7389";
  const logoUrl = `${siteUrl.replace(/\/$/, "")}/logo.png`;
  
  // Generate unsubscribe token from email using HMAC
  const unsubscribeToken = generateUnsubscribeToken(email);

  // Group items by feed
  const itemsByFeed = items.reduce((acc, item) => {
    const feedTitle = item.feed.title;
    if (!acc[feedTitle]) {
      acc[feedTitle] = [];
    }
    acc[feedTitle].push(item);
    return acc;
  }, {} as Record<string, (Item & { feed: Feed })[]>);

  // Generate HTML email with Vaporwave theme
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Feed Digest - TheFeeder</title>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet">
  <style>
    /* Reset and base styles */
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      background: linear-gradient(180deg, hsl(280, 60%, 8%), hsl(260, 50%, 5%));
      color: #ffffff;
    }
    
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background: linear-gradient(180deg, hsl(280, 60%, 8%), hsl(260, 50%, 5%));
      position: relative;
    }
    
    /* Header styles */
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding: 20px 0;
    }
    
    .logo-container {
      margin-bottom: 15px;
    }
    
    .logo-img {
      width: 60px;
      height: 60px;
      display: block;
      margin: 0 auto;
    }
    
    .header h1 {
      font-family: 'Orbitron', sans-serif;
      font-size: 24px;
      font-weight: 900;
      color: hsl(320, 100%, 65%);
      text-shadow: 0 0 10px hsl(320, 100%, 65%), 0 0 20px hsl(320, 100%, 65%), 0 0 30px hsl(320, 100%, 65%);
      margin: 10px 0;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    
    .header p {
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
      margin: 0;
    }
    
    /* Feed section styles - Cyber card */
    .feed-section {
      margin-bottom: 25px;
      background: linear-gradient(135deg, hsla(280, 50%, 12%, 0.8), hsla(270, 40%, 10%, 0.9));
      border: 2px solid hsl(180, 100%, 60%);
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 0 20px hsla(180, 100%, 60%, 0.5), 0 0 40px hsla(270, 100%, 70%, 0.3);
    }
    
    .feed-title {
      font-family: 'Orbitron', sans-serif;
      font-size: 14px;
      font-weight: 700;
      color: hsl(180, 100%, 60%);
      text-shadow: 0 0 10px hsl(180, 100%, 60%), 0 0 20px hsl(180, 100%, 60%);
      margin-bottom: 15px;
      padding: 8px 12px;
      background: hsla(180, 100%, 60%, 0.1);
      border: 1px solid hsla(180, 100%, 60%, 0.5);
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 1px;
      display: inline-block;
    }
    
    /* Item styles */
    .item {
      margin-bottom: 18px;
      padding-bottom: 18px;
      border-bottom: 1px solid rgba(180, 100%, 60%, 0.2);
    }
    
    .item:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    
    .item-title {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    .item-title a {
      color: hsl(320, 100%, 65%);
      text-decoration: none;
      text-shadow: 0 0 8px rgba(255, 0, 110, 0.3), 0 0 12px rgba(0, 255, 255, 0.2);
      display: inline-block;
    }
    
    .item-title a:hover {
      color: hsl(180, 100%, 60%);
      text-shadow: 0 0 10px hsl(180, 100%, 60%);
    }
    
    .item-summary {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.85);
      margin-bottom: 10px;
      line-height: 1.5;
    }
    
    .item-meta {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.7);
      line-height: 1.6;
    }
    
    .meta-item {
      display: inline-block;
      margin-right: 12px;
      vertical-align: middle;
    }
    
    .meta-dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      display: inline-block;
      margin-right: 4px;
      vertical-align: middle;
    }
    
    .meta-dot-cyan {
      background: hsl(180, 100%, 60%);
      box-shadow: 0 0 6px hsl(180, 100%, 60%);
    }
    
    .meta-dot-purple {
      background: hsl(270, 100%, 70%);
      box-shadow: 0 0 6px hsl(270, 100%, 70%);
    }
    
    /* Footer styles */
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid rgba(180, 100%, 60%, 0.2);
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
    }
    
    .footer a {
      color: hsl(320, 100%, 65%);
      text-decoration: none;
      font-weight: bold;
      text-shadow: 0 0 8px rgba(255, 0, 110, 0.5);
    }
    
    .footer a:hover {
      color: hsl(180, 100%, 60%);
      text-shadow: 0 0 10px hsl(180, 100%, 60%);
    }
    
    /* Responsive styles */
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        padding: 15px;
      }
      
      .header h1 {
        font-size: 20px;
      }
      
      .feed-section {
        padding: 15px;
      }
      
      .item-title {
        font-size: 15px;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <div class="logo-container">
        <img src="${logoUrl}" alt="TheFeeder Logo" class="logo-img" />
      </div>
      <h1>THE FEEDER</h1>
      <p>Hello ${escapeHtml(name)}, here are the latest updates from your feeds:</p>
    </div>

    ${Object.entries(itemsByFeed)
      .map(
        ([feedTitle, feedItems]) => `
      <div class="feed-section">
        <div class="feed-title">${escapeHtml(feedTitle)}</div>
        ${feedItems
          .map(
            (item) => `
          <div class="item">
            <div class="item-title">
              <a href="${item.url}" target="_blank">${escapeHtml(item.title)}</a>
            </div>
            ${item.summary ? `<div class="item-summary">${escapeHtml(item.summary.substring(0, 200))}...</div>` : ""}
            <div class="item-meta">
              ${item.author ? `<span class="meta-item"><span class="meta-dot meta-dot-cyan"></span>${escapeHtml(item.author)}</span>` : ""}
              ${item.publishedAt ? `<span class="meta-item"><span class="meta-dot meta-dot-purple"></span>${new Date(item.publishedAt).toLocaleDateString("pt-BR", { timeZone: process.env.TZ || "UTC" })}</span>` : ""}
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    `,
      )
      .join("")}

    <div class="footer">
      <p>You're receiving this because you subscribed to daily digests.</p>
      <p><a href="${siteUrl}">Visit TheFeeder</a></p>
      <p><a href="${siteUrl}/unsubscribe/${unsubscribeToken}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Daily Feed Digest

Hello ${name}, here are the latest updates:

${items
  .map((item) => `
${item.feed.title}: ${item.title}
${item.url}
${item.summary ? item.summary.substring(0, 200) + "..." : ""}

`)
  .join("\n---\n\n")}

Visit ${siteUrl} for more.

To unsubscribe, visit: ${siteUrl}/unsubscribe/${unsubscribeToken}
  `;

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject: `Daily Feed Digest - ${new Date().toLocaleDateString("pt-BR", { timeZone: process.env.TZ || "UTC" })}`,
      html,
      text,
    });

    if (!process.env.SMTP_HOST) {
      console.log("Email (console):", { to: email, subject: `Daily Feed Digest`, html, text });
    }
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error);
    throw error;
  }
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

