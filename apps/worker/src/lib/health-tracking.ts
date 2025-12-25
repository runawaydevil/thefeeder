/**
 * Health Tracking Service
 * Records and analyzes feed fetch attempts
 */

import { PrismaClient } from '@prisma/client';
import { cached, cacheKey } from './cache.js';
import { logger } from './logger.js';

const prisma = new PrismaClient();

export interface RecordAttemptParams {
  feedId: string;
  success: boolean;
  statusCode?: number;
  errorMessage?: string;
  responseTime?: number;
  strategy?: string;
}

export interface FeedHealthMetrics {
  totalAttempts: number;
  totalSuccesses: number;
  totalFailures: number;
  successRate: number;
  avgResponseTime: number | null;
  lastSuccessAt: Date | null;
  lastAttemptAt: Date | null;
  recentLogs: any[];
}

export class HealthTrackingService {
  /**
   * Record a fetch attempt
   */
  async recordAttempt(params: RecordAttemptParams): Promise<void> {
    const { feedId, success, statusCode, errorMessage, responseTime, strategy } = params;

    try {
      // Create health log
      await prisma.feedHealthLog.create({
        data: {
          feedId,
          success,
          statusCode,
          errorMessage,
          responseTime,
          strategy,
        },
      });

      // Update feed metrics
      const feed = await prisma.feed.findUnique({
        where: { id: feedId },
        select: {
          totalAttempts: true,
          totalSuccesses: true,
          totalFailures: true,
          avgResponseTime: true,
        },
      });

      if (feed) {
        const newTotalAttempts = feed.totalAttempts + 1;
        const newTotalSuccesses = success ? feed.totalSuccesses + 1 : feed.totalSuccesses;
        const newTotalFailures = success ? feed.totalFailures : feed.totalFailures + 1;

        // Calculate new average response time
        let newAvgResponseTime = feed.avgResponseTime;
        if (responseTime !== undefined && responseTime !== null) {
          if (feed.avgResponseTime === null) {
            newAvgResponseTime = responseTime;
          } else {
            // Running average: new_avg = (old_avg * old_count + new_value) / new_count
            newAvgResponseTime = Math.round(
              (feed.avgResponseTime * feed.totalAttempts + responseTime) / newTotalAttempts
            );
          }
        }

        await prisma.feed.update({
          where: { id: feedId },
          data: {
            totalAttempts: newTotalAttempts,
            totalSuccesses: newTotalSuccesses,
            totalFailures: newTotalFailures,
            avgResponseTime: newAvgResponseTime,
            lastAttemptAt: new Date(),
          },
        });
      }

      // Cleanup old logs (keep last 100)
      await this.cleanupOldLogs(feedId);

      logger.debug(`Recorded attempt for feed ${feedId}: ${success ? 'SUCCESS' : 'FAILURE'}`);
    } catch (error) {
      logger.error('Error recording attempt', error as Error);
      // Don't throw - health tracking should not break feed fetching
    }
  }

  /**
   * Get health metrics for a feed (cached for 5 minutes)
   */
  async getHealthMetrics(feedId: string): Promise<FeedHealthMetrics> {
    const metricsKey = cacheKey('health', 'metrics', feedId);
    
    return await cached(
      metricsKey,
      async () => {
        const feed = await prisma.feed.findUnique({
          where: { id: feedId },
          select: {
            totalAttempts: true,
            totalSuccesses: true,
            totalFailures: true,
            avgResponseTime: true,
            lastSuccessAt: true,
            lastAttemptAt: true,
          },
        });

        if (!feed) {
          throw new Error(`Feed ${feedId} not found`);
        }

        const recentLogs = await this.getRecentLogs(feedId, 10);
        const successRate = await this.calculateSuccessRate(feedId);

        return {
          totalAttempts: feed.totalAttempts,
          totalSuccesses: feed.totalSuccesses,
          totalFailures: feed.totalFailures,
          successRate,
          avgResponseTime: feed.avgResponseTime,
          lastSuccessAt: feed.lastSuccessAt,
          lastAttemptAt: feed.lastAttemptAt,
          recentLogs,
        };
      },
      300 // 5 minutes TTL
    );
  }

  /**
   * Calculate success rate (cached for 5 minutes)
   * Uses last 50 attempts or 7 days, whichever is more recent
   */
  async calculateSuccessRate(feedId: string, days: number = 7): Promise<number> {
    const rateKey = cacheKey('health', 'successRate', feedId, days.toString());
    
    return await cached(
      rateKey,
      async () => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - days);

        const recentLogs = await prisma.feedHealthLog.findMany({
          where: {
            feedId,
            attemptedAt: {
              gte: sevenDaysAgo,
            },
          },
          orderBy: {
            attemptedAt: 'desc',
          },
          take: 50, // Max 50 attempts
        });

        if (recentLogs.length === 0) {
          return 0;
        }

        const successCount = recentLogs.filter(log => log.success).length;
        return Math.round((successCount / recentLogs.length) * 100);
      },
      300 // 5 minutes TTL
    );
  }

  /**
   * Get recent health logs
   */
  async getRecentLogs(feedId: string, limit: number = 100): Promise<any[]> {
    return await prisma.feedHealthLog.findMany({
      where: { feedId },
      orderBy: {
        attemptedAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Cleanup old logs (keep last 100 per feed)
   */
  async cleanupOldLogs(feedId: string): Promise<void> {
    try {
      // Get the 100th most recent log
      const logs = await prisma.feedHealthLog.findMany({
        where: { feedId },
        orderBy: {
          attemptedAt: 'desc',
        },
        skip: 100,
        take: 1,
      });

      if (logs.length > 0) {
        const cutoffDate = logs[0].attemptedAt;

        // Delete all logs older than the cutoff
        await prisma.feedHealthLog.deleteMany({
          where: {
            feedId,
            attemptedAt: {
              lt: cutoffDate,
            },
          },
        });

        logger.debug(`Cleaned up old logs for feed ${feedId}`);
      }
    } catch (error) {
      logger.error('Error cleaning up logs', error as Error);
      // Don't throw - cleanup failure should not break the system
    }
  }

  /**
   * Get browser automation statistics
   */
  async getBrowserAutomationStats(): Promise<{
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    successRate: number;
    avgResponseTime: number | null;
    feedsUsingBrowser: number;
  }> {
    try {
      // Get browser automation attempts from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const browserLogs = await prisma.feedHealthLog.findMany({
        where: {
          strategy: {
            contains: 'browser',
          },
          attemptedAt: {
            gte: sevenDaysAgo,
          },
        },
      });

      const totalAttempts = browserLogs.length;
      const successfulAttempts = browserLogs.filter(log => log.success).length;
      const failedAttempts = totalAttempts - successfulAttempts;
      const successRate = totalAttempts > 0 ? Math.round((successfulAttempts / totalAttempts) * 100) : 0;
      
      const responseTimes = browserLogs
        .filter(log => log.responseTime !== null)
        .map(log => log.responseTime!);
      const avgResponseTime = responseTimes.length > 0 
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : null;

      // Count feeds that require browser automation
      const feedsUsingBrowser = await prisma.feed.count({
        where: { requiresBrowser: true },
      });

      return {
        totalAttempts,
        successfulAttempts,
        failedAttempts,
        successRate,
        avgResponseTime,
        feedsUsingBrowser,
      };
    } catch (error) {
      logger.error('Error getting browser automation stats', error as Error);
      return {
        totalAttempts: 0,
        successfulAttempts: 0,
        failedAttempts: 0,
        successRate: 0,
        avgResponseTime: null,
        feedsUsingBrowser: 0,
      };
    }
  }
}

// Export singleton instance
export const healthTrackingService = new HealthTrackingService();
