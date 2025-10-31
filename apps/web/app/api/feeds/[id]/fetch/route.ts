import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { prisma } from "@/src/lib/prisma";
import { Role } from "@prisma/client";
import { parseFeed, normalizeFeedItem } from "@/src/lib/rss-parser";
import { getRandomUserAgent } from "@/src/lib/user-agents";

// POST - Manually fetch and update a feed
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== Role.admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const feed = await prisma.feed.findUnique({ where: { id } });

    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    if (!feed.isActive) {
      return NextResponse.json(
        { error: "Feed is inactive" },
        { status: 400 },
      );
    }

    // Parse the feed with random user agent
    const userAgent = getRandomUserAgent();
    const parsedFeed = await parseFeed(feed.url, userAgent);
    let itemsCreated = 0;
    let itemsUpdated = 0;

    // Process each item
    for (const item of parsedFeed.items) {
      const normalized = normalizeFeedItem(item);

      if (!normalized.url || !normalized.title) {
        continue; // Skip invalid items
      }

      // Check if item already exists (by sourceGuid or url + publishedAt)
      const existingItem = normalized.sourceGuid
        ? await prisma.item.findUnique({
            where: { sourceGuid: normalized.sourceGuid },
          })
        : await prisma.item.findFirst({
            where: {
              feedId: feed.id,
              url: normalized.url,
              publishedAt: normalized.publishedAt || undefined,
            },
          });

      if (existingItem) {
        // Update existing item
        await prisma.item.update({
          where: { id: existingItem.id },
          data: {
            title: normalized.title,
            summary: normalized.summary,
            content: normalized.content,
            author: normalized.author,
            imageUrl: normalized.imageUrl,
            publishedAt: normalized.publishedAt,
          },
        });
        itemsUpdated++;
      } else {
        // Create new item
        await prisma.item.create({
          data: {
            feedId: feed.id,
            title: normalized.title,
            url: normalized.url,
            summary: normalized.summary,
            content: normalized.content,
            author: normalized.author,
            imageUrl: normalized.imageUrl,
            publishedAt: normalized.publishedAt,
            sourceGuid: normalized.sourceGuid,
          },
        });
        itemsCreated++;
      }
    }

    // Update feed's lastFetchedAt
    await prisma.feed.update({
      where: { id },
      data: { lastFetchedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      itemsCreated,
      itemsUpdated,
      totalItems: parsedFeed.items.length,
    });
  } catch (error) {
    console.error("Error fetching feed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch feed",
      },
      { status: 500 },
    );
  }
}

