import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { validatePayloadSize } from "@/src/lib/payload-validator";
import { rateLimitByIP } from "@/src/lib/rate-limit-redis";
import { getCorsHeaders } from "@/src/lib/cors";

const MAX_ITEMS_LIMIT = 50000; // Maximum 50k articles
const MAX_SEARCH_LENGTH = 200;
const MAX_RESULTS = 100;

export async function GET(req: NextRequest) {
  try {
    // Rate limiting - 30 requests per minute per IP
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const rateLimit = await rateLimitByIP(ip, 30, 60000, "items_api");
    
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

    const searchParams = req.nextUrl.searchParams;
    
    // Parse query parameters
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), MAX_RESULTS);
    const skip = Math.max(0, parseInt(searchParams.get("skip") || "0", 10));
    const search = searchParams.get("search")?.trim() || "";
    const feedId = searchParams.get("feedId") || null;
    const startDate = searchParams.get("startDate") || null;
    const endDate = searchParams.get("endDate") || null;
    const sortBy = searchParams.get("sortBy") || "publishedAt"; // publishedAt, createdAt, likes
    const sortOrder = searchParams.get("sortOrder") || "desc"; // asc, desc

    // Validate search query length
    if (search.length > MAX_SEARCH_LENGTH) {
      return NextResponse.json(
        { error: `Search query too long (max: ${MAX_SEARCH_LENGTH} characters)` },
        { status: 400, headers: getCorsHeaders(req.headers.get("origin")) },
      );
    }

    // Build where clause
    const where: any = {};

    // Search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { summary: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
        { author: { contains: search, mode: "insensitive" } },
      ];
    }

    // Feed filter
    if (feedId) {
      where.feedId = feedId;
    }

    // Date range filter
    if (startDate || endDate) {
      where.publishedAt = {};
      if (startDate) {
        where.publishedAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.publishedAt.lte = new Date(endDate);
      }
    }

    // Build orderBy
    const orderBy: any = {};
    if (sortBy === "likes") {
      orderBy.likes = sortOrder;
    } else if (sortBy === "createdAt") {
      orderBy.createdAt = sortOrder;
    } else {
      orderBy.publishedAt = sortOrder;
    }

    // Get total count
    const totalCount = await prisma.item.count({ where });
    const total = Math.min(totalCount, MAX_ITEMS_LIMIT);

    // Fetch items
    const items = await prisma.item.findMany({
      where,
      take: Math.min(limit, MAX_ITEMS_LIMIT - skip),
      skip: skip,
      orderBy,
      include: {
        feed: {
          select: {
            title: true,
            url: true,
          },
        },
      },
    });

    // Transform items
    const transformedItems = items.map((item) => ({
      id: item.id,
      title: item.title,
      url: item.url,
      summary: item.summary ?? undefined,
      content: item.content ?? undefined,
      author: item.author ?? undefined,
      imageUrl: item.imageUrl ?? undefined,
      publishedAt: item.publishedAt ? item.publishedAt.toISOString() : undefined,
      likes: item.likes,
      dislikes: item.dislikes,
      feed: item.feed ? {
        title: item.feed.title,
        url: item.feed.url,
      } : undefined,
    }));

    return NextResponse.json(
      {
        items: transformedItems,
        total,
        limit,
        skip,
        hasMore: skip + limit < total,
      },
      {
        headers: {
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          "X-RateLimit-Reset": new Date(rateLimit.resetAt).toISOString(),
          ...getCorsHeaders(req.headers.get("origin")),
        },
      },
    );
  } catch (error: any) {
    console.error("Error fetching items:", error);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      {
        status: 500,
        headers: getCorsHeaders(req.headers.get("origin")),
      },
    );
  }
}
