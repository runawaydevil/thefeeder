import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { prisma } from "@/src/lib/prisma";
import { Role } from "@prisma/client";
import { normalizeFeedUrl } from "@/src/lib/feed-url";

const MIN_REFRESH_INTERVAL = 10; // minutes

/**
 * Parse OPML XML and extract feeds
 */
function parseOPML(opmlContent: string): Array<{ title: string; url: string; siteUrl?: string }> {
  const feeds: Array<{ title: string; url: string; siteUrl?: string }> = [];
  
  try {
    // Simple XML parsing for OPML
    // Look for <outline> elements with xmlUrl attribute
    const outlineRegex = /<outline[^>]*xmlUrl=["']([^"']+)["'][^>]*>/gi;
    const matches = opmlContent.matchAll(outlineRegex);
    
    for (const match of matches) {
      const outlineTag = match[0];
      const xmlUrl = match[1];
      
      if (!xmlUrl) continue;
      
      // Extract title from text attribute or title attribute
      const textMatch = outlineTag.match(/text=["']([^"']+)["']/i);
      const titleMatch = outlineTag.match(/title=["']([^"']+)["']/i);
      const htmlUrlMatch = outlineTag.match(/htmlUrl=["']([^"']+)["']/i);
      
      const title = textMatch?.[1] || titleMatch?.[1] || xmlUrl;
      const htmlUrl = htmlUrlMatch?.[1];
      
      feeds.push({
        title: title.trim(),
        url: xmlUrl.trim(),
        siteUrl: htmlUrl?.trim(),
      });
    }
  } catch (error) {
    console.error("Error parsing OPML:", error);
    throw new Error("Failed to parse OPML file");
  }
  
  return feeds;
}

/**
 * Import OPML file
 * POST /api/feeds/import/opml
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== Role.admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 },
      );
    }

    // Validate file type
    if (!file.type.includes("xml") && !file.name.endsWith(".opml")) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an OPML (.opml) file" },
        { status: 400 },
      );
    }

    // Read file content
    const fileContent = await file.text();
    
    // Parse OPML
    const feeds = parseOPML(fileContent);
    
    if (feeds.length === 0) {
      return NextResponse.json(
        { error: "No feeds found in OPML file" },
        { status: 400 },
      );
    }

    // Get existing feeds to check for duplicates
    const existingFeeds = await prisma.feed.findMany({
      select: { url: true },
    });

    const existingUrls = new Set(
      existingFeeds.map((feed: { url: string }) => normalizeFeedUrl(feed.url))
    );

    // Import feeds
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const feed of feeds) {
      try {
        // Validate URL
        try {
          new URL(feed.url);
        } catch {
          errors.push(`Invalid URL: ${feed.url}`);
          skipped++;
          continue;
        }

        // Normalize URL
        const normalizedUrl = normalizeFeedUrl(feed.url);
        
        // Check if already exists
        if (existingUrls.has(normalizedUrl)) {
          skipped++;
          continue;
        }

        // Create feed with default refresh interval
        const createdFeed = await prisma.feed.create({
          data: {
            title: feed.title,
            url: normalizedUrl,
            siteUrl: feed.siteUrl || null,
            refreshIntervalMinutes: 60, // Default 1 hour
          },
        });

        // Add to existing URLs set to prevent duplicates in same import
        existingUrls.add(normalizedUrl);
        
        // Schedule feed in worker and trigger immediate fetch (non-blocking)
        import("@/src/lib/worker-api").then(({ scheduleFeed, fetchFeedImmediately }) => {
          scheduleFeed(createdFeed.id).catch((err) => {
            console.error("Failed to schedule feed in worker:", err);
          });
          // Trigger immediate fetch after import
          fetchFeedImmediately(createdFeed.id).catch((err) => {
            console.error("Failed to trigger immediate fetch:", err);
          });
        });

        imported++;
      } catch (error: any) {
        if (error.code === "P2002") {
          // Unique constraint violation (shouldn't happen due to check above, but handle anyway)
          skipped++;
        } else {
          errors.push(`Error importing ${feed.title}: ${error.message}`);
          skipped++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: feeds.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Error importing OPML:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

