import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";
import { validateUnsubscribeToken } from "@/src/lib/unsubscribe-token";

// GET - Unsubscribe using token (public)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Since HMAC is not reversible, we need to check all active subscribers
    // This is acceptable since unsubscribe is an infrequent operation
    const subscribers = await prisma.subscriber.findMany({
      where: { 
        status: { in: [SubscriptionStatus.pending, SubscriptionStatus.approved] }
      },
    });

    // Find subscriber whose email matches the token
    let subscriber = null;
    for (const sub of subscribers) {
      if (validateUnsubscribeToken(token, sub.email)) {
        subscriber = sub;
        break;
      }
    }

    if (!subscriber) {
      return NextResponse.json({ error: "Invalid unsubscribe token" }, { status: 404 });
    }

    // Update status to rejected (maintains history)
    await prisma.subscriber.update({
      where: { id: subscriber.id },
      data: {
        status: SubscriptionStatus.rejected,
      },
    });

    // Redirect to confirmation page
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    return NextResponse.redirect(`${siteUrl}/unsubscribe/${token}/success`);
  } catch (error) {
    console.error("Error unsubscribing:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

