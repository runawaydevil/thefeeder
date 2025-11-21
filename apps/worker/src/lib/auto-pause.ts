/**
 * Auto-Pause Manager
 * Automatically pauses consistently failing feeds
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AutoPauseManager {
  private readonly FAILURE_THRESHOLD = 5; // Auto-pause after 5 consecutive failures

  /**
   * Check if feed should be auto-paused
   * Returns true if feed was paused
   */
  async checkAutoPause(feed: any): Promise<boolean> {
    if (feed.consecutiveFailures >= this.FAILURE_THRESHOLD) {
      console.log(`[Auto-Pause] Feed ${feed.title} has ${feed.consecutiveFailures} consecutive failures - auto-pausing`);
      
      const reason = `Auto-paused after ${feed.consecutiveFailures} consecutive failures. Last error: ${feed.lastError || 'Unknown'}`;
      await this.pauseFeed(feed.id, reason);
      
      return true;
    }

    return false;
  }

  /**
   * Pause a feed
   */
  async pauseFeed(feedId: string, reason: string): Promise<void> {
    try {
      await prisma.feed.update({
        where: { id: feedId },
        data: {
          status: 'paused',
          lastError: reason,
          isActive: false, // Also mark as inactive to stop job scheduling
        },
      });

      console.log(`[Auto-Pause] ✓ Feed ${feedId} paused: ${reason}`);
    } catch (error) {
      console.error(`[Auto-Pause] Error pausing feed ${feedId}:`, error);
      throw error;
    }
  }

  /**
   * Resume a feed
   */
  async resumeFeed(feedId: string): Promise<void> {
    try {
      await prisma.feed.update({
        where: { id: feedId },
        data: {
          status: 'active',
          consecutiveFailures: 0,
          failureCount: 0,
          lastError: null,
          isActive: true,
        },
      });

      console.log(`[Auto-Pause] ✓ Feed ${feedId} resumed`);
    } catch (error) {
      console.error(`[Auto-Pause] Error resuming feed ${feedId}:`, error);
      throw error;
    }
  }

  /**
   * Reset failure counter
   */
  async resetFailureCount(feedId: string): Promise<void> {
    try {
      await prisma.feed.update({
        where: { id: feedId },
        data: {
          consecutiveFailures: 0,
          failureCount: 0,
        },
      });

      console.log(`[Auto-Pause] ✓ Reset failure counter for feed ${feedId}`);
    } catch (error) {
      console.error(`[Auto-Pause] Error resetting failure count for ${feedId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const autoPauseManager = new AutoPauseManager();
