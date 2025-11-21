/**
 * Feed Status State Machine
 * Manages feed status transitions based on health metrics
 */

import { PrismaClient } from '@prisma/client';
import { feedDiscoveryService } from './feed-discovery.js';

const prisma = new PrismaClient();

export type FeedStatus = 'active' | 'degraded' | 'blocked' | 'unreachable' | 'paused';
export type ErrorType = 'timeout' | 'blocked' | 'server_error' | 'other';

export class StatusMachine {
  /**
   * Update feed status based on recent activity
   */
  async updateFeedStatus(feedId: string, params: {
    success: boolean;
    errorType?: ErrorType;
    statusCode?: number;
  }): Promise<FeedStatus> {
    const { success, errorType, statusCode } = params;

    const feed = await prisma.feed.findUnique({
      where: { id: feedId },
      include: {
        healthLogs: {
          orderBy: { attemptedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!feed) {
      throw new Error(`Feed ${feedId} not found`);
    }

    let newStatus: FeedStatus = feed.status as FeedStatus;

    // If feed is paused, don't change status (requires manual resume)
    if (feed.status === 'paused') {
      return 'paused';
    }

    // Success: potentially improve status
    if (success) {
      if (feed.consecutiveFailures === 0) {
        // 5 consecutive successes: move to active
        const recentSuccesses = feed.healthLogs.filter(log => log.success).length;
        if (recentSuccesses >= 5 && feed.status === 'degraded') {
          newStatus = 'active';
          console.log(`[Status Machine] ${feed.title}: degraded → active (5 consecutive successes)`);
        }
      }
    } else {
      // Failure: potentially degrade status
      
      // 3+ consecutive 403/522 errors: blocked
      if ((statusCode === 403 || statusCode === 522 || errorType === 'blocked') && feed.consecutiveFailures >= 3) {
        newStatus = 'blocked';
        console.log(`[Status Machine] ${feed.title}: ${feed.status} → blocked (3+ consecutive 403/522)`);
      }
      // 3+ consecutive timeouts: unreachable
      else if (errorType === 'timeout' && feed.consecutiveFailures >= 3) {
        newStatus = 'unreachable';
        console.log(`[Status Machine] ${feed.title}: ${feed.status} → unreachable (3+ consecutive timeouts)`);
      }
      // 1-2 failures in last 10 attempts: degraded
      else if (feed.healthLogs.length >= 10) {
        const recentFailures = feed.healthLogs.filter(log => !log.success).length;
        if (recentFailures >= 1 && recentFailures <= 2 && feed.status === 'active') {
          newStatus = 'degraded';
          console.log(`[Status Machine] ${feed.title}: active → degraded (${recentFailures} failures in last 10)`);
        }
      }
    }

    // Update status if changed
    if (newStatus !== feed.status) {
      await prisma.feed.update({
        where: { id: feedId },
        data: { status: newStatus },
      });
      
      // Trigger alternative discovery for blocked/unreachable feeds
      if (newStatus === 'blocked' || newStatus === 'unreachable') {
        console.log(`[Status Machine] Triggering alternative discovery for ${feed.title}`);
        this.discoverAlternatives(feedId, feed.url).catch(error => {
          console.error(`[Status Machine] Error discovering alternatives: ${error.message}`);
        });
      }
    }

    return newStatus;
  }

  /**
   * Get status color for UI
   */
  getStatusColor(status: FeedStatus): string {
    switch (status) {
      case 'active':
        return 'green';
      case 'degraded':
        return 'yellow';
      case 'blocked':
        return 'red';
      case 'unreachable':
        return 'orange';
      case 'paused':
        return 'gray';
      default:
        return 'gray';
    }
  }

  /**
   * Get status description
   */
  getStatusDescription(status: FeedStatus): string {
    switch (status) {
      case 'active':
        return 'Functioning normally';
      case 'degraded':
        return 'Occasional failures but still working';
      case 'blocked':
        return 'Consistently blocked (403/522)';
      case 'unreachable':
        return 'Consistently timing out';
      case 'paused':
        return 'Manually or automatically paused';
      default:
        return 'Unknown status';
    }
  }
  
  /**
   * Discover and store alternative feed URLs
   */
  private async discoverAlternatives(feedId: string, currentUrl: string): Promise<void> {
    try {
      const alternatives = await feedDiscoveryService.discoverAlternatives(currentUrl);
      
      if (alternatives.length > 0) {
        // Store alternatives in feed metadata
        await prisma.feed.update({
          where: { id: feedId },
          data: {
            metadata: {
              alternatives: alternatives,
              alternativesDiscoveredAt: new Date().toISOString(),
            },
          },
        });
        
        console.log(`[Status Machine] Stored ${alternatives.length} alternatives for feed ${feedId}`);
      } else {
        console.log(`[Status Machine] No alternatives found for feed ${feedId}`);
      }
    } catch (error: any) {
      console.error(`[Status Machine] Error in discoverAlternatives: ${error.message}`);
    }
  }
}

// Export singleton instance
export const statusMachine = new StatusMachine();
