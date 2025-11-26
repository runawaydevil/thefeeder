import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { Role } from "@prisma/client";
import { discoverFeeds } from "@/src/lib/feed-discovery";
import { cached, cacheKey } from "@/src/lib/cache";
import { rateLimitByIP } from "@/src/lib/rate-limit-redis";
import { validateUrl } from "@/src/lib/payload-validator";
import { getCorsHeaders } from "@/src/lib/cors";

// POST - Discover feeds from a website URL
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== Role.admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting - 10 discoveries per minute per IP
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const rateLimit = await rateLimitByIP(ip, 10, 60000, "feed_discover");
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many discovery requests. Please try again later.",
          code: "RATE_LIMIT",
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": rateLimit.retryAfter?.toString() || "60",
            ...getCorsHeaders(req.headers.get("origin")),
          },
        },
      );
    }

    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400, headers: getCorsHeaders(req.headers.get("origin")) },
      );
    }

    // Validate URL format
    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
      return NextResponse.json(
        { error: urlValidation.error },
        { status: 400, headers: getCorsHeaders(req.headers.get("origin")) },
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

    return NextResponse.json(
      { feeds },
      {
        headers: {
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          ...getCorsHeaders(req.headers.get("origin")),
        },
      },
    );
  } catch (error: any) {
    console.error("Error discovering feeds:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500, headers: getCorsHeaders(req.headers.get("origin")) },
    );
  }
}


