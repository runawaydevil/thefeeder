import { NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { prisma } from "@/src/lib/prisma";
import { Role } from "@prisma/client";

// GET - Get count of pending subscribers (admin only)
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== Role.admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pendingCount = await prisma.subscriber.count({
      where: {
        status: "pending",
      },
    });

    return NextResponse.json({ pending: pendingCount });
  } catch (error) {
    console.error("Error fetching pending subscriber count:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

