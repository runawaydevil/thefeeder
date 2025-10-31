import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { prisma } from "@/src/lib/prisma";
import { Role } from "@prisma/client";

/**
 * Export all active feeds as OPML 2.0 format
 * Only accessible by admin users
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== Role.admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all active feeds
    const feeds = await prisma.feed.findMany({
      where: { isActive: true },
      orderBy: { title: "asc" },
    });

    // Get site URL from environment
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:7389";
    
    // Generate OPML XML
    const opml = generateOPML(feeds, siteUrl);

    // Return XML with proper headers for download
    const filename = `thefeeder-feeds-${new Date().toISOString().split('T')[0]}.opml`;
    
    return new NextResponse(opml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting OPML:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Generate OPML 2.0 XML from feeds
 */
function generateOPML(feeds: Array<{ title: string; url: string; siteUrl: string | null }>, siteUrl: string): string {
  const dateCreated = new Date().toUTCString();
  
  // Detect feed type from URL
  const detectFeedType = (url: string): string => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('.atom') || lowerUrl.includes('/atom')) {
      return 'atom';
    }
    if (lowerUrl.includes('.json') || lowerUrl.includes('/json')) {
      return 'rss'; // JSON Feed can be treated as RSS for compatibility
    }
    return 'rss'; // Default to RSS
  };

  // Escape XML special characters
  const escapeXml = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  // Build OPML structure
  let opml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  opml += '<opml version="2.0">\n';
  opml += '  <head>\n';
  opml += `    <title>TheFeeder - Exported Feeds</title>\n`;
  opml += `    <dateCreated>${dateCreated}</dateCreated>\n`;
  opml += `    <dateModified>${dateCreated}</dateModified>\n`;
  opml += `    <ownerName>TheFeeder</ownerName>\n`;
  opml += `    <ownerEmail>${siteUrl}</ownerEmail>\n`;
  opml += '  </head>\n';
  opml += '  <body>\n';

  // Add each feed as an outline
  for (const feed of feeds) {
    const feedType = detectFeedType(feed.url);
    const htmlUrl = feed.siteUrl || feed.url.split('/').slice(0, 3).join('/'); // Fallback to domain
    
    opml += '    <outline ';
    opml += `text="${escapeXml(feed.title)}" `;
    opml += `title="${escapeXml(feed.title)}" `;
    opml += `type="${feedType}" `;
    opml += `xmlUrl="${escapeXml(feed.url)}" `;
    opml += `htmlUrl="${escapeXml(htmlUrl)}"`;
    opml += '/>\n';
  }

  opml += '  </body>\n';
  opml += '</opml>\n';

  return opml;
}

