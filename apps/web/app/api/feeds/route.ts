import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { prisma } from "@/src/lib/prisma";
import { Role } from "@prisma/client";

const MIN_REFRESH_INTERVAL = 10; // minutes

// GET - List all feeds
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== Role.admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const feeds = await prisma.feed.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    return NextResponse.json(feeds);
  } catch (error) {
    console.error("Error fetching feeds:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST - Create new feed
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== Role.admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
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

    const feed = await prisma.feed.create({
      data: {
        title,
        url,
        siteUrl: siteUrl || null,
        refreshIntervalMinutes,
      },
    });

    // Schedule feed in worker (non-blocking)
    import("@/src/lib/worker-api").then(({ scheduleFeed }) => {
      scheduleFeed(feed.id).catch((err) => {
        console.error("Failed to schedule feed in worker:", err);
      });
    });

    return NextResponse.json(feed, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A feed with this URL already exists" },
        { status: 409 },
      );
    }
    console.error("Error creating feed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

