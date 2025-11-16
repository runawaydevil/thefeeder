import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { rateLimit } from "@/src/lib/rate-limit";
import { cached, cacheKey, del } from "@/src/lib/cache";

type VoteAction = "like" | "dislike" | "remove_like" | "remove_dislike";

interface VoteRequest {
  action: VoteAction;
}

interface VoteResponse {
  success: boolean;
  likes: number;
  dislikes: number;
}

// POST - Vote on an item
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Rate limiting - 5 requests per minute per IP
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const limit = rateLimit(`vote:${ip}`, 5, 60000); // 5 requests per minute
    
    if (!limit.allowed) {
      return NextResponse.json(
        { 
          error: "Too many vote requests. Please try again later.",
          code: "RATE_LIMIT"
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await req.json() as VoteRequest;
    const { action } = body;

    if (!action || !["like", "dislike", "remove_like", "remove_dislike"].includes(action)) {
      return NextResponse.json(
        { 
          error: "Invalid action. Must be 'like', 'dislike', 'remove_like', or 'remove_dislike'.",
          code: "INVALID_ACTION"
        },
        { status: 400 }
      );
    }

    // Check if item exists
    const item = await prisma.item.findUnique({
      where: { id },
      select: { id: true, likes: true, dislikes: true },
    });

    if (!item) {
      return NextResponse.json(
        { 
          error: "Item not found.",
          code: "NOT_FOUND"
        },
        { status: 404 }
      );
    }

    // Process vote action
    let updatedItem;
    
    switch (action) {
      case "like":
        updatedItem = await prisma.item.update({
          where: { id },
          data: { likes: { increment: 1 } },
          select: { likes: true, dislikes: true },
        });
        break;
        
      case "dislike":
        updatedItem = await prisma.item.update({
          where: { id },
          data: { dislikes: { increment: 1 } },
          select: { likes: true, dislikes: true },
        });
        break;
        
      case "remove_like":
        updatedItem = await prisma.item.update({
          where: { id },
          data: { likes: { decrement: 1 } },
          select: { likes: true, dislikes: true },
        });
        // Ensure likes don't go below 0
        if (updatedItem.likes < 0) {
          updatedItem = await prisma.item.update({
            where: { id },
            data: { likes: 0 },
            select: { likes: true, dislikes: true },
          });
        }
        break;
        
      case "remove_dislike":
        updatedItem = await prisma.item.update({
          where: { id },
          data: { dislikes: { decrement: 1 } },
          select: { likes: true, dislikes: true },
        });
        // Ensure dislikes don't go below 0
        if (updatedItem.dislikes < 0) {
          updatedItem = await prisma.item.update({
            where: { id },
            data: { dislikes: 0 },
            select: { likes: true, dislikes: true },
          });
        }
        break;
    }

    // Invalidate cache
    const voteCacheKey = cacheKey("vote", id);
    await del(voteCacheKey);

    // Log vote action
    console.log(`[Vote] ${action} on item ${id} by IP ${ip}`);

    const response: VoteResponse = {
      success: true,
      likes: updatedItem.likes,
      dislikes: updatedItem.dislikes,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error processing vote:", error);
    return NextResponse.json(
      { 
        error: "Internal server error.",
        code: "SERVER_ERROR"
      },
      { status: 500 }
    );
  }
}
