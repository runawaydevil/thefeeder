import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { verifyUnsubscribeToken } from "@/src/lib/unsubscribe-token";

// Force Node.js runtime (not Edge)
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    // Verify and decode token
    const email = await verifyUnsubscribeToken(token);
    
    if (!email) {
      return NextResponse.json(
        { error: "Invalid or expired unsubscribe link" },
        { status: 400 }
      );
    }

    // Find subscriber
    const subscriber = await prisma.subscriber.findUnique({
      where: { email },
    });

    if (!subscriber) {
      return NextResponse.json(
        { error: "Subscriber not found" },
        { status: 404 }
      );
    }

    // Update subscriber status to unsubscribed
    await prisma.subscriber.update({
      where: { email },
      data: { 
        status: "unsubscribed" as const,
      },
    });

    console.log(`[Unsubscribe] Successfully unsubscribed: ${email}`);

    return NextResponse.json({
      success: true,
      message: "You have been successfully unsubscribed from TheFeeder daily digest.",
    });
  } catch (error) {
    console.error("[Unsubscribe] Error:", error);
    return NextResponse.json(
      { error: "Failed to process unsubscribe request" },
      { status: 500 }
    );
  }
}

// Also support GET for direct link clicks
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  return POST(request, { params });
}
