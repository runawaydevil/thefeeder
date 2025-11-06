import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { Role } from "@prisma/client";
import { discoverFeeds } from "@/src/lib/feed-discovery";
import { cached, cacheKey } from "@/src/lib/cache";

// POST - Discover feeds from a website URL
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== Role.admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 },
      );
    }

    // Normalize URL for cache key
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // Cache discovery results for 1 hour (3600 seconds)
    const cacheKeyForUrl = cacheKey("discover", normalizedUrl);
    const feeds = await cached(
      cacheKeyForUrl,
      () => discoverFeeds(normalizedUrl),
      3600, // 1 hour TTL
    );

    return NextResponse.json({ feeds });
  } catch (error: any) {
    console.error("Error discovering feeds:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}


