import nodemailer from "nodemailer";
import { Item, Feed } from "@prisma/client";

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

  // Group items by feed
  const itemsByFeed = items.reduce((acc, item) => {
    const feedTitle = item.feed.title;
    if (!acc[feedTitle]) {
      acc[feedTitle] = [];
    }
    acc[feedTitle].push(item);
    return acc;
  }, {} as Record<string, (Item & { feed: Feed })[]>);

  // Generate HTML email
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Feed Digest</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background: linear-gradient(to bottom, #1a0b2e, #2d1b4e);
      color: #fff;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #ff6b35;
      text-shadow: 0 0 20px rgba(255, 107, 53, 0.5);
    }
    .feed-section {
      margin-bottom: 30px;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 8px;
      padding: 20px;
      border: 1px solid rgba(255, 107, 53, 0.3);
    }
    .feed-title {
      font-size: 18px;
      font-weight: bold;
      color: #ff6b35;
      margin-bottom: 15px;
    }
    .item {
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .item:last-child {
      border-bottom: none;
    }
    .item-title {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .item-title a {
      color: #ff6b35;
      text-decoration: none;
    }
    .item-title a:hover {
      text-decoration: underline;
    }
    .item-summary {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.8);
      margin-bottom: 8px;
    }
    .item-meta {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.6);
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 12px;
      color: rgba(255, 255, 255, 0.6);
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📰 Daily Feed Digest</h1>
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
            ${item.author ? `By ${escapeHtml(item.author)} • ` : ""}
            ${item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("pt-BR", { timeZone: process.env.TZ || "UTC" }) : ""}
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
    <p><a href="${siteUrl}" style="color: #ff6b35;">Visit TheFeeder</a></p>
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

