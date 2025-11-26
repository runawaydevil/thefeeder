import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { prisma } from "@/src/lib/prisma";
import { Role } from "@prisma/client";
import { normalizeFeedUrl } from "@/src/lib/feed-url";
import { invalidateAllFeedCache } from "@/src/lib/cache-invalidation";
import { validateRequestBody, validatePayloadSize } from "@/src/lib/payload-validator";
import { rateLimitByIP } from "@/src/lib/rate-limit-redis";
import { getCorsHeaders } from "@/src/lib/cors";

const MIN_REFRESH_INTERVAL = 10; // minutes

// GET - List all feeds
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== Role.admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: getCorsHeaders(req.headers.get("origin")) },
      );
    }

    const feeds = await prisma.feed.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        url: true,
        siteUrl: true,
        refreshIntervalMinutes: true,
        lastFetchedAt: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { items: true },
        },
      },
    });

    return NextResponse.json(feeds, {
      headers: getCorsHeaders(req.headers.get("origin")),
    });
  } catch (error) {
    console.error("Error fetching feeds:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: getCorsHeaders(req.headers.get("origin")) },
    );
  }
}

// POST - Create new feed
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== Role.admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: getCorsHeaders(req.headers.get("origin")) },
      );
    }

    // Rate limiting - 10 feed creations per minute per IP
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const rateLimit = await rateLimitByIP(ip, 10, 60000, "feeds_create");
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
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

    // Validate payload size
    const rawBody = await req.text();
    const sizeCheck = validatePayloadSize(rawBody, 10240); // 10KB max for feed creation
    if (!sizeCheck.valid) {
      return NextResponse.json(
        { error: sizeCheck.error },
        { status: 413, headers: getCorsHeaders(req.headers.get("origin")) },
      );
    }

    const body = JSON.parse(rawBody);
    
    // Validate request body
    const validation = validateRequestBody(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400, headers: getCorsHeaders(req.headers.get("origin")) },
      );
    }
    const { title, url, siteUrl, refreshIntervalMinutes } = body;

    if (!title || !url || !refreshIntervalMinutes) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (refreshIntervalMinutes < MIN_REFRESH_INTERVAL) {
      return NextResponse.json(
        { error: `Refresh interval must be at least ${MIN_REFRESH_INTERVAL} minutes` },
        { status: 400 },
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid feed URL" }, { status: 400 });
    }

    // Normalize URL to prevent duplicates
    const normalizedUrl = normalizeFeedUrl(url);
    
    // Check if feed with normalized URL already exists
    const existingFeeds = await prisma.feed.findMany({
      select: { url: true },
    });
    
    // Check if any existing feed URL matches the normalized URL
    const isDuplicate = existingFeeds.some((feed: { url: string }) => {
      try {
        const normalizedExisting = normalizeFeedUrl(feed.url);
        return normalizedExisting === normalizedUrl;
      } catch {
        return false;
      }
    });
    
    if (isDuplicate) {
      return NextResponse.json(
        { error: "A feed with this URL already exists (duplicate detected)" },
        { status: 409 },
      );
    }

    const feed = await prisma.feed.create({
      data: {
        title,
        url: normalizedUrl, // Store normalized URL
        siteUrl: siteUrl || null,
        refreshIntervalMinutes,
      },
    });

    // Invalidate cache after creating feed
    invalidateAllFeedCache().catch((err) => {
      console.error("Failed to invalidate cache:", err);
    });

    // Schedule feed in worker and trigger immediate fetch (non-blocking)
    import("@/src/lib/worker-api").then(({ scheduleFeed, fetchFeedImmediately }) => {
      scheduleFeed(feed.id).catch((err) => {
        console.error("Failed to schedule feed in worker:", err);
      });
      // Trigger immediate fetch after creation
      fetchFeedImmediately(feed.id).catch((err) => {
        console.error("Failed to trigger immediate fetch:", err);
      });
    });

    return NextResponse.json(feed, {
      status: 201,
      headers: {
        "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        ...getCorsHeaders(req.headers.get("origin")),
      },
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A feed with this URL already exists" },
        { status: 409, headers: getCorsHeaders(req.headers.get("origin")) },
      );
    }
    console.error("Error creating feed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: getCorsHeaders(req.headers.get("origin")) },
    );
  }
}

