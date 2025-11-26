import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/auth";
import { Role } from "@prisma/client";
import { rateLimitByIP } from "@/src/lib/rate-limit-redis";
import { getCorsHeaders } from "@/src/lib/cors";

/**
 * Export favorite articles (items with likes > 0)
 * Returns JSON or CSV format
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    // For now, allow anonymous exports (can be restricted later)
    // if (!session?.user || session.user.role !== Role.admin) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    // Rate limiting - 10 exports per hour per IP
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const rateLimit = await rateLimitByIP(ip, 10, 3600000, "export_api");
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many export requests. Please try again later.",
          code: "RATE_LIMIT",
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": rateLimit.retryAfter?.toString() || "3600",
            ...getCorsHeaders(req.headers.get("origin")),
          },
        },
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const format = searchParams.get("format") || "json"; // json or csv
    const minLikes = parseInt(searchParams.get("minLikes") || "1", 10);

    // Fetch favorite items
    const items = await prisma.item.findMany({
      where: {
        likes: {
          gte: minLikes,
        },
      },
      orderBy: [
        { likes: "desc" },
        { publishedAt: "desc" },
      ],
      take: 1000, // Max 1000 items
      include: {
        feed: {
          select: {
            title: true,
            url: true,
          },
        },
      },
    });

    if (format === "csv") {
      // Generate CSV
      const headers = ["Title", "URL", "Author", "Published", "Likes", "Dislikes", "Feed"];
      const rows = items.map((item) => [
        `"${(item.title || "").replace(/"/g, '""')}"`,
        item.url,
        `"${(item.author || "").replace(/"/g, '""')}"`,
        item.publishedAt ? item.publishedAt.toISOString() : "",
        item.likes.toString(),
        item.dislikes.toString(),
        `"${(item.feed?.title || "").replace(/"/g, '""')}"`,
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="thefeeder-favorites-${new Date().toISOString().split("T")[0]}.csv"`,
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          ...getCorsHeaders(req.headers.get("origin")),
        },
      });
    }

    // JSON format
    const jsonData = {
      exportedAt: new Date().toISOString(),
      total: items.length,
      minLikes,
      items: items.map((item) => ({
        title: item.title,
        url: item.url,
        author: item.author,
        publishedAt: item.publishedAt ? item.publishedAt.toISOString() : null,
        likes: item.likes,
        dislikes: item.dislikes,
        feed: item.feed ? {
          title: item.feed.title,
          url: item.feed.url,
        } : null,
      })),
    };

    return NextResponse.json(jsonData, {
      headers: {
        "Content-Disposition": `attachment; filename="thefeeder-favorites-${new Date().toISOString().split("T")[0]}.json"`,
        "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        ...getCorsHeaders(req.headers.get("origin")),
      },
    });
  } catch (error: any) {
    console.error("Error exporting items:", error);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      {
        status: 500,
        headers: getCorsHeaders(req.headers.get("origin")),
      },
    );
  }
}

