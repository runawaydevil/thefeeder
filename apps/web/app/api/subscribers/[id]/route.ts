import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { prisma } from "@/src/lib/prisma";
import { Role, SubscriptionStatus } from "@prisma/client";

// PUT - Update subscriber status (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== Role.admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || !["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'pending', 'approved', or 'rejected'" },
        { status: 400 },
      );
    }

    const updateData: any = {
      status: status as SubscriptionStatus,
    };

    if (status === "approved") {
      updateData.approvedAt = new Date();
    } else if (status !== "approved") {
      updateData.approvedAt = null;
    }

    const subscriber = await prisma.subscriber.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(subscriber);
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
    }
    console.error("Error updating subscriber:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE - Delete subscriber (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== Role.admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.subscriber.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
    }
    console.error("Error deleting subscriber:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

