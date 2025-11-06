import { Job } from "bullmq";
import { prisma } from "../lib/prisma.js";
import { sendDigestEmail } from "../lib/email.js";

export interface DailyDigestJobData {
  scheduledAt: Date;
}

export async function processDailyDigest(job: Job<DailyDigestJobData>) {
  try {
    console.log("Processing daily digest...");

    // Get all approved subscribers
    const subscribers = await prisma.subscriber.findMany({
      where: { status: "approved" },
    });

    if (subscribers.length === 0) {
      console.log("No approved subscribers found");
      return { success: true, recipients: 0, items: 0 };
    }

    // Get items from last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const items = await prisma.item.findMany({
      where: {
        publishedAt: {
          gte: yesterday,
        },
      },
      include: {
        feed: true,
      },
      orderBy: {
        publishedAt: "desc",
      },
      take: 20, // Limit to 20 most recent items for email digest
    });

    if (items.length === 0) {
      console.log("No items found for digest");
      return { success: true, recipients: 0, items: 0 };
    }

    // Send digest to each subscriber
    let sentCount = 0;
    for (const subscriber of subscribers) {
      try {
        await sendDigestEmail(
          subscriber.email,
          subscriber.name,
          items,
        );
        sentCount++;
      } catch (error) {
        console.error(`Failed to send digest to ${subscriber.email}:`, error);
      }
    }

    // Log the digest
    await prisma.dailyDigestLog.create({
      data: {
        numRecipients: sentCount,
        numItems: items.length,
      },
    });

    console.log(`Daily digest sent to ${sentCount} recipients with ${items.length} items`);

    return {
      success: true,
      recipients: sentCount,
      items: items.length,
    };
  } catch (error) {
    console.error("Error processing daily digest:", error);
    throw error;
  }
}

