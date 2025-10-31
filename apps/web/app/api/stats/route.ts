import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function GET() {
  try {
    const [feedsCount, itemsCount] = await Promise.all([
      prisma.feed.count({ where: { isActive: true } }),
      prisma.item.count(),
    ]);

    return NextResponse.json({
      feeds: feedsCount,
      items: itemsCount,
      online: 420, // Placeholder
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

