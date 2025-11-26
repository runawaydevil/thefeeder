import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { rateLimitByIP } from "@/src/lib/rate-limit-redis";
import { getCorsHeaders } from "@/src/lib/cors";

const MAX_SEARCH_LENGTH = 200;
const MAX_RESULTS = 100;

export async function GET(req: NextRequest) {
  try {
    // Rate limiting - 20 requests per minute per IP
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const rateLimit = await rateLimitByIP(ip, 20, 60000, "search_api");
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many search requests. Please try again later.",
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
    const query = searchParams.get("q")?.trim() || "";

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400, headers: getCorsHeaders(req.headers.get("origin")) },
      );
    }

    if (query.length > MAX_SEARCH_LENGTH) {
      return NextResponse.json(
        { error: `Search query too long (max: ${MAX_SEARCH_LENGTH} characters)` },
        { status: 400, headers: getCorsHeaders(req.headers.get("origin")) },
      );
    }

    // Search in title, summary, content, and author
    const items = await prisma.item.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { summary: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
          { author: { contains: query, mode: "insensitive" } },
        ],
      },
      take: MAX_RESULTS,
      orderBy: { publishedAt: "desc" },
      include: {
        feed: {
          select: {
            title: true,
            url: true,
          },
        },
      },
    });

    const transformedItems = items.map((item) => ({
      id: item.id,
      title: item.title,
      url: item.url,
      summary: item.summary ?? undefined,
      author: item.author ?? undefined,
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
        total: items.length,
        query,
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
    console.error("Error searching items:", error);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      {
        status: 500,
        headers: getCorsHeaders(req.headers.get("origin")),
      },
    );
  }
}

