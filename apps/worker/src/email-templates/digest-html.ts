import { DigestHtmlOptions } from "./types.js";

/**
 * Escape HTML special characters to prevent XSS
 */
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
 * Group items by feed
 */
function groupItemsByFeed(items: DigestHtmlOptions["items"]) {
  return items.reduce((acc, item) => {
    const feedTitle = item.feed.title;
    if (!acc[feedTitle]) {
      acc[feedTitle] = [];
    }
    acc[feedTitle].push(item);
    return acc;
  }, {} as Record<string, DigestHtmlOptions["items"]>);
}

/**
 * Generate HTML email for daily digest using table-based layout
 * Compatible with major email clients including Outlook
 * 
 * @param options - Email generation options
 * @returns HTML string compatible with major email clients
 * 
 * @example
 * const html = generateDigestHtml({
 *   name: 'John Doe',
 *   items: [...],
 *   siteUrl: 'https://feeder.works',
 *   logoUrl: 'https://feeder.works/logo.png',
 *   unsubscribeUrl: 'https://feeder.works/unsubscribe/token',
 *   viewInBrowserUrl: 'https://feeder.works/digest/123',
 *   timezone: 'America/Sao_Paulo'
 * });
 */
export function generateDigestHtml(options: DigestHtmlOptions): string {
  const { name, items, siteUrl, logoUrl, unsubscribeUrl, viewInBrowserUrl, timezone } = options;
  
  const itemsByFeed: Record<string, DigestHtmlOptions["items"]> = groupItemsByFeed(items);
  const currentDate = formatDate(new Date(), timezone);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Daily Digest - TheFeeder</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
  </style>
  <![endif]-->
  <style type="text/css">
    /* Reset styles */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    
    /* Responsive styles */
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .mobile-padding { padding: 15px !important; }
      .mobile-font-size { font-size: 20px !important; }
      .mobile-item-title { font-size: 15px !important; }
      .mobile-hide { display: none !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #1a0a2e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;">
  <!-- Wrapper table -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #1a0a2e;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        
        <!-- Main container table (600px) -->
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(180deg, #1f0d3d 0%, #150a28 100%); max-width: 600px;">
          
          ${viewInBrowserUrl ? `
          <!-- View in browser link -->
          <tr>
            <td align="center" style="padding: 10px 20px; font-size: 11px; color: rgba(255, 255, 255, 0.6);">
              Having trouble viewing? <a href="${viewInBrowserUrl}" target="_blank" rel="noopener noreferrer" style="color: #ff006e; text-decoration: none;">Open in browser</a>
            </td>
          </tr>
          ` : ''}
          
          <!-- Header -->
          <tr>
            <td align="center" class="mobile-padding" style="padding: 30px 20px 20px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 15px;">
                    <img src="${logoUrl}" alt="TheFeeder Logo" width="60" height="60" style="display: block; width: 60px; height: 60px;">
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-family: 'Orbitron', 'Arial Black', sans-serif; font-size: 24px; font-weight: 900; color: #ff006e; letter-spacing: 2px; text-transform: uppercase; padding-bottom: 10px;" class="mobile-font-size">
                    THE FEEDER
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-size: 14px; color: rgba(255, 255, 255, 0.9); line-height: 1.5;">
                    Hello ${escapeHtml(name)}, here are the latest updates from your feeds
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-size: 12px; color: rgba(255, 255, 255, 0.7); padding-top: 5px;">
                    ${currentDate}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td class="mobile-padding" style="padding: 0 20px 20px 20px;">
              ${Object.entries(itemsByFeed).map(([feedTitle, feedItems]) => `
              <!-- Feed section -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, rgba(31, 13, 61, 0.8) 0%, rgba(21, 10, 40, 0.9) 100%); border: 2px solid #00d9ff; border-radius: 8px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px;">
                    <!-- Feed title -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-family: 'Orbitron', 'Arial Black', sans-serif; font-size: 14px; font-weight: 700; color: #00d9ff; text-transform: uppercase; letter-spacing: 1px; padding: 8px 12px; background: rgba(0, 217, 255, 0.1); border: 1px solid rgba(0, 217, 255, 0.5); border-radius: 4px; margin-bottom: 15px;">
                          ${escapeHtml(feedTitle)}
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Feed items -->
                    ${feedItems.map((item, index) => `
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${index < feedItems.length - 1 ? 'border-bottom: 1px solid rgba(0, 217, 255, 0.2); padding-bottom: 18px; margin-bottom: 18px;' : ''}">
                      <tr>
                        <td>
                          <!-- Item title -->
                          <div style="font-size: 16px; font-weight: bold; margin-bottom: 8px;" class="mobile-item-title">
                            <a href="${item.url}" target="_blank" rel="noopener noreferrer" style="color: #ff006e; text-decoration: none;">
                              ${escapeHtml(item.title)}
                            </a>
                          </div>
                          
                          ${item.summary ? `
                          <!-- Item summary -->
                          <div style="font-size: 13px; color: rgba(255, 255, 255, 0.85); margin-bottom: 10px; line-height: 1.5;">
                            ${escapeHtml(item.summary.substring(0, 200))}${item.summary.length > 200 ? '...' : ''}
                          </div>
                          ` : ''}
                          
                          <!-- Item meta -->
                          <div style="font-size: 11px; color: rgba(255, 255, 255, 0.7); line-height: 1.6;">
                            ${item.author ? `
                            <span style="display: inline-block; margin-right: 12px;">
                              <span style="display: inline-block; width: 4px; height: 4px; border-radius: 50%; background: #00d9ff; box-shadow: 0 0 6px #00d9ff; margin-right: 4px; vertical-align: middle;"></span>
                              ${escapeHtml(item.author)}
                            </span>
                            ` : ''}
                            ${item.publishedAt ? `
                            <span style="display: inline-block; margin-right: 12px;">
                              <span style="display: inline-block; width: 4px; height: 4px; border-radius: 50%; background: #b794f6; box-shadow: 0 0 6px #b794f6; margin-right: 4px; vertical-align: middle;"></span>
                              ${formatDate(new Date(item.publishedAt), timezone)}
                            </span>
                            ` : ''}
                          </div>
                        </td>
                      </tr>
                    </table>
                    `).join('')}
                  </td>
                </tr>
              </table>
              `).join('')}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td class="mobile-padding" style="padding: 20px; text-align: center; border-top: 1px solid rgba(0, 217, 255, 0.2);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="font-size: 12px; color: rgba(255, 255, 255, 0.7); padding-bottom: 10px;">
                    You're receiving this email because you subscribed to TheFeeder
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 10px 0;">
                    <a href="${siteUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 30px; background: #ff006e; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 14px; min-height: 44px; line-height: 20px;">
                      Visit TheFeeder
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 15px;">
                    <a href="${unsubscribeUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 8px 20px; color: #ff006e; text-decoration: none; font-size: 12px; font-weight: bold; border: 1px solid #ff006e; border-radius: 4px; min-height: 32px; line-height: 16px;">
                      Unsubscribe
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-size: 11px; color: rgba(255, 255, 255, 0.5); padding-top: 15px;">
                    TheFeeder - Modern RSS Aggregator
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>`;
}
