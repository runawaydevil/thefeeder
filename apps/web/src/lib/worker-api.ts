// Utility to call worker API for scheduling feeds
const WORKER_API_URL = process.env.WORKER_API_URL || "http://localhost:7388";
const WORKER_API_TOKEN = process.env.WORKER_API_TOKEN || "change-me-in-production";

export async function scheduleFeed(feedId: string): Promise<void> {
  try {
    const response = await fetch(`${WORKER_API_URL}/api/schedule/${feedId}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WORKER_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to schedule feed ${feedId}:`, error);
      // Don't throw - scheduling failure shouldn't block feed creation
    }
  } catch (error) {
    console.error(`Error calling worker API to schedule feed ${feedId}:`, error);
    // Don't throw - scheduling failure shouldn't block feed creation
  }
}

export async function unscheduleFeed(feedId: string): Promise<void> {
  try {
    const response = await fetch(`${WORKER_API_URL}/api/schedule/${feedId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${WORKER_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to unschedule feed ${feedId}:`, error);
      // Don't throw - unscheduling failure shouldn't block feed deletion
    }
  } catch (error) {
    console.error(`Error calling worker API to unschedule feed ${feedId}:`, error);
    // Don't throw - unscheduling failure shouldn't block feed deletion
  }
}

/**
 * Trigger immediate feed fetch (used when a new feed is created or imported)
 * This does not affect the scheduled repeat job
 */
export async function fetchFeedImmediately(feedId: string): Promise<void> {
  try {
    const response = await fetch(`${WORKER_API_URL}/api/schedule/${feedId}/fetch`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WORKER_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to trigger immediate fetch for feed ${feedId}:`, error);
      // Don't throw - fetch failure shouldn't block feed creation/import
    } else {
      console.log(`Immediate fetch triggered for feed ${feedId}`);
    }
  } catch (error) {
    console.error(`Error calling worker API to fetch feed ${feedId} immediately:`, error);
    // Don't throw - fetch failure shouldn't block feed creation/import
  }
}

