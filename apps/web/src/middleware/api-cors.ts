import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders, handleCorsPreflight } from "@/src/lib/cors";

/**
 * CORS middleware for API routes
 * Call this at the start of API route handlers
 */
export function withCors(
  handler: (req: NextRequest) => Promise<NextResponse>,
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Handle preflight requests
    if (req.method === "OPTIONS") {
      const corsResponse = handleCorsPreflight(req.headers.get("origin"));
      if (corsResponse) {
        // Convert Response to NextResponse
        const nextResponse = new NextResponse(null, {
          status: corsResponse.status,
          statusText: corsResponse.statusText,
        });
        corsResponse.headers.forEach((value, key) => {
          nextResponse.headers.set(key, value);
        });
        return nextResponse;
      }
    }

    // Execute handler
    const response = await handler(req);

    // Add CORS headers to response
    const corsHeaders = getCorsHeaders(req.headers.get("origin"));
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  };
}

