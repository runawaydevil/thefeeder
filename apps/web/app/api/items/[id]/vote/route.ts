import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { rateLimitByIP } from "@/src/lib/rate-limit-redis";
import { getCorsHeaders } from "@/src/lib/cors";
import { cacheKey, del } from "@/src/lib/cache";
import { getVoterId } from "@/src/lib/voter-id";

type VoteAction = "like" | "dislike" | "remove_like" | "remove_dislike";

interface VoteRequest {
  action: VoteAction;
}

interface VoteResponse {
  success: boolean;
  likes: number;
  dislikes: number;
  userVote: "like" | "dislike" | null;
}

// POST - Vote on an item
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get or create voter ID
    const voterId = await getVoterId();

    // Rate limiting - 5 requests per minute per IP (using Redis)
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const rateLimit = await rateLimitByIP(ip, 5, 60000, "vote");
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many vote requests. Please try again later.",
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

    // Parse and validate request body
    const body = await req.json() as VoteRequest;
    const { action } = body;

    if (!action || !["like", "dislike", "remove_like", "remove_dislike"].includes(action)) {
      return NextResponse.json(
        {
          error: "Invalid action. Must be 'like', 'dislike', 'remove_like', or 'remove_dislike'.",
          code: "INVALID_ACTION",
        },
        { status: 400, headers: getCorsHeaders(req.headers.get("origin")) },
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
          code: "NOT_FOUND",
        },
        { status: 404, headers: getCorsHeaders(req.headers.get("origin")) },
      );
    }

    // Check for existing vote
    const existingVote = await prisma.voteTracker.findUnique({
      where: {
        voterId_itemId: {
          voterId,
          itemId: id,
        },
      },
    });

    // Process vote action with VoteTracker
    let updatedItem;
    let userVote: "like" | "dislike" | null = null;
    
    switch (action) {
      case "like":
        // Create or update vote tracker
        await prisma.voteTracker.upsert({
          where: {
            voterId_itemId: {
              voterId,
              itemId: id,
            },
          },
          create: {
            voterId,
            itemId: id,
            voteType: "like",
          },
          update: {
            voteType: "like",
          },
        });

        // Update item counter only if this is a new vote or changed from dislike
        if (!existingVote) {
          updatedItem = await prisma.item.update({
            where: { id },
            data: { likes: { increment: 1 } },
            select: { likes: true, dislikes: true },
          });
        } else if (existingVote.voteType === "dislike") {
          // Changed from dislike to like
          updatedItem = await prisma.item.update({
            where: { id },
            data: { 
              likes: { increment: 1 },
              dislikes: { decrement: 1 },
            },
            select: { likes: true, dislikes: true },
          });
        } else {
          // Already liked, no change
          updatedItem = item;
        }
        userVote = "like";
        break;
        
      case "dislike":
        // Create or update vote tracker
        await prisma.voteTracker.upsert({
          where: {
            voterId_itemId: {
              voterId,
              itemId: id,
            },
          },
          create: {
            voterId,
            itemId: id,
            voteType: "dislike",
          },
          update: {
            voteType: "dislike",
          },
        });

        // Update item counter only if this is a new vote or changed from like
        if (!existingVote) {
          updatedItem = await prisma.item.update({
            where: { id },
            data: { dislikes: { increment: 1 } },
            select: { likes: true, dislikes: true },
          });
        } else if (existingVote.voteType === "like") {
          // Changed from like to dislike
          updatedItem = await prisma.item.update({
            where: { id },
            data: { 
              likes: { decrement: 1 },
              dislikes: { increment: 1 },
            },
            select: { likes: true, dislikes: true },
          });
        } else {
          // Already disliked, no change
          updatedItem = item;
        }
        userVote = "dislike";
        break;
        
      case "remove_like":
        if (existingVote && existingVote.voteType === "like") {
          // Delete vote tracker
          await prisma.voteTracker.delete({
            where: {
              voterId_itemId: {
                voterId,
                itemId: id,
              },
            },
          });

          // Decrement like counter
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
        } else {
          updatedItem = item;
        }
        userVote = null;
        break;
        
      case "remove_dislike":
        if (existingVote && existingVote.voteType === "dislike") {
          // Delete vote tracker
          await prisma.voteTracker.delete({
            where: {
              voterId_itemId: {
                voterId,
                itemId: id,
              },
            },
          });

          // Decrement dislike counter
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
        } else {
          updatedItem = item;
        }
        userVote = null;
        break;
    }

    // Invalidate caches
    const voteCacheKey = cacheKey("vote", id);
    const userVotesCacheKey = cacheKey("votes", "user", voterId);
    await del(voteCacheKey);
    await del(userVotesCacheKey);

    // Log vote action
    console.log(`[Vote] ${action} on item ${id} by voter ${voterId} (IP: ${ip})`);

    const response: VoteResponse = {
      success: true,
      likes: updatedItem.likes,
      dislikes: updatedItem.dislikes,
      userVote,
    };

    return NextResponse.json(response, {
      headers: {
        "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        "X-RateLimit-Reset": new Date(rateLimit.resetAt).toISOString(),
        ...getCorsHeaders(req.headers.get("origin")),
      },
    });
  } catch (error) {
    console.error("Error processing vote:", error);
    return NextResponse.json(
      {
        error: "Internal server error.",
        code: "SERVER_ERROR",
      },
      { status: 500, headers: getCorsHeaders(req.headers.get("origin")) },
    );
  }
}
