import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { prisma } from "@/src/lib/prisma";
import { Role } from "@prisma/client";
import { rateLimitByIP } from "@/src/lib/rate-limit-redis";
import { validateRequestBody, validateEmail } from "@/src/lib/payload-validator";
import { getCorsHeaders } from "@/src/lib/cors";

// GET - List all subscribers (admin only)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== Role.admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: getCorsHeaders(req.headers.get("origin")) },
      );
    }

    const subscribers = await prisma.subscriber.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(subscribers, {
      headers: getCorsHeaders(req.headers.get("origin")),
    });
  } catch (error) {
    console.error("Error fetching subscribers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: getCorsHeaders(req.headers.get("origin")) },
    );
  }
}

// POST - Create new subscriber (public)
export async function POST(req: NextRequest) {
  try {
    // Rate limiting - 5 requests per minute per IP
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const rateLimit = await rateLimitByIP(ip, 5, 60000, "subscribers");
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
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

    // Validate payload size
    const rawBody = await req.text();
    const sizeCheck = validateRequestBody({ body: rawBody });
    if (!sizeCheck.valid) {
      return NextResponse.json(
        { error: "Payload too large" },
        { status: 413, headers: getCorsHeaders(req.headers.get("origin")) },
      );
    }

    const body = JSON.parse(rawBody);
    const { name, email } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400, headers: getCorsHeaders(req.headers.get("origin")) },
      );
    }

    // Validate email format
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return NextResponse.json(
        { error: emailValidation.error },
        { status: 400, headers: getCorsHeaders(req.headers.get("origin")) },
      );
    }

    // Validate name length
    if (name.length > 200) {
      return NextResponse.json(
        { error: "Name too long (max: 200 characters)" },
        { status: 400, headers: getCorsHeaders(req.headers.get("origin")) },
      );
    }

    try {
      const subscriber = await prisma.subscriber.create({
        data: {
          name,
          email: email.toLowerCase(),
          status: "pending",
        },
      });

      return NextResponse.json(
        {
          message: "Subscription request submitted. You will receive a confirmation email once approved.",
          id: subscriber.id,
        },
        {
          status: 201,
          headers: {
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            ...getCorsHeaders(req.headers.get("origin")),
          },
        },
      );
    } catch (error: any) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "This email is already subscribed or pending approval" },
          { status: 409, headers: getCorsHeaders(req.headers.get("origin")) },
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Error creating subscriber:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: getCorsHeaders(req.headers.get("origin")) },
    );
  }
}

