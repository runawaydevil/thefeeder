import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { Role } from "@prisma/client";
import { discoverFeeds } from "@/src/lib/feed-discovery";

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

    // Discover feeds
    const feeds = await discoverFeeds(url);

    return NextResponse.json({ feeds });
  } catch (error: any) {
    console.error("Error discovering feeds:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}


