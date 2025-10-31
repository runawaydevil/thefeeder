import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { prisma } from "@/src/lib/prisma";
import { Role } from "@prisma/client";
import { rateLimit } from "@/src/lib/rate-limit";

// GET - List all subscribers (admin only)
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== Role.admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscribers = await prisma.subscriber.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(subscribers);
  } catch (error) {
    console.error("Error fetching subscribers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST - Create new subscriber (public)
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const limit = rateLimit(`subscribe:${ip}`, 5, 60000); // 5 requests per minute
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const body = await req.json();
    const { name, email } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 },
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
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
          id: subscriber.id 
        },
        { status: 201 },
      );
    } catch (error: any) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "This email is already subscribed or pending approval" },
          { status: 409 },
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Error creating subscriber:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

