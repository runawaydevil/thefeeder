import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getExistingVoterId } from "@/src/lib/voter-id";
import { cached, cacheKey } from "@/src/lib/cache";

interface UserVotesResponse {
  votes: Record<string, "like" | "dislike">;
}

/**
 * GET /api/votes/user
 * Returns all votes for the current user (identified by voter_id cookie)
 */
export async function GET(req: NextRequest) {
  try {
    // Get voter ID from cookie (don't create new one)
    const voterId = await getExistingVoterId();

    // If no voter ID, return empty votes
    if (!voterId) {
      return NextResponse.json({
        votes: {},
      });
    }

    // Try to get from cache first
    const userVotesCacheKey = cacheKey("votes", "user", voterId);
    
    const votes = await cached(
      userVotesCacheKey,
      async () => {
        // Fetch all votes for this user
        const voteRecords = await prisma.voteTracker.findMany({
          where: { voterId },
          select: {
            itemId: true,
            voteType: true,
          },
        });

        // Convert to object format
        const votesMap: Record<string, "like" | "dislike"> = {};
        for (const vote of voteRecords) {
          votesMap[vote.itemId] = vote.voteType;
        }

        return votesMap;
      },
      300 // 5 minutes TTL
    );

    const response: UserVotesResponse = {
      votes,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Votes] Error fetching user votes:", error);
    
    // Return empty votes on error (graceful degradation)
    return NextResponse.json({
      votes: {},
    });
  }
}
