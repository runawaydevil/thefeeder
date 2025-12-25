/**
 * Monitoring Alerts Service
 * Monitors system health and sends alerts for critical issues
 */

import { PrismaClient } from '@prisma/client';
import { healthTrackingService } from './health-tracking.js';
import { logger } from './logger.js';

const prisma = new PrismaClient();

export interface AlertThresholds {
  highFailureRate: number; // Percentage
  maxBrowserInstances: number;
  queueBacklogSize: number;
}

const DEFAULT_THRESHOLDS: AlertThresholds = {
  highFailureRate: 50, // Alert if >50% of feeds failing
  maxBrowserInstances: 10, // Alert if >10 feeds require browser
  queueBacklogSize: 100, // Alert if >100 jobs in queue
};

export class MonitoringAlertsService {
  private thresholds: AlertThresholds;

  constructor(thresholds: AlertThresholds = DEFAULT_THRESHOLDS) {
    this.thresholds = thresholds;
  }

  /**
   * Check system health and generate alerts
   */
  async checkSystemHealth(): Promise<{
    healthy: boolean;
    alerts: string[];
  }> {
    const alerts: string[] = [];

    // Check overall failure rate
    const failureRateAlert = await this.checkFailureRate();
    if (failureRateAlert) {
      alerts.push(failureRateAlert);
    }

    // Check browser automation usage
    const browserAlert = await this.checkBrowserAutomation();
    if (browserAlert) {
      alerts.push(browserAlert);
    }

    // Check for paused feeds
    const pausedAlert = await this.checkPausedFeeds();
    if (pausedAlert) {
      alerts.push(pausedAlert);
    }

    // Check for blocked feeds
    const blockedAlert = await this.checkBlockedFeeds();
    if (blockedAlert) {
      alerts.push(blockedAlert);
    }

    return {
      healthy: alerts.length === 0,
      alerts,
    };
  }

  /**
   * Check if overall failure rate is too high
   */
  private async checkFailureRate(): Promise<string | null> {
    try {
      const feeds = await prisma.feed.findMany({
        where: { isActive: true },
        select: {
          id: true,
          title: true,
          totalAttempts: true,
          totalFailures: true,
        },
      });

      if (feeds.length === 0) {
        return null;
      }

      const totalAttempts = feeds.reduce((sum, f) => sum + f.totalAttempts, 0);
      const totalFailures = feeds.reduce((sum, f) => sum + f.totalFailures, 0);

      if (totalAttempts === 0) {
        return null;
      }

      const failureRate = Math.round((totalFailures / totalAttempts) * 100);

      if (failureRate > this.thresholds.highFailureRate) {
        return `⚠️ HIGH FAILURE RATE: ${failureRate}% of all feed fetches are failing (threshold: ${this.thresholds.highFailureRate}%)`;
      }

      return null;
    } catch (error) {
      logger.error('Error checking failure rate', error as Error);
      return null;
    }
  }

  /**
   * Check browser automation usage
   */
  private async checkBrowserAutomation(): Promise<string | null> {
    try {
      const stats = await healthTrackingService.getBrowserAutomationStats();

      if (stats.feedsUsingBrowser > this.thresholds.maxBrowserInstances) {
        return `⚠️ HIGH BROWSER USAGE: ${stats.feedsUsingBrowser} feeds require browser automation (threshold: ${this.thresholds.maxBrowserInstances})`;
      }

      // Alert if browser automation success rate is low
      if (stats.totalAttempts > 10 && stats.successRate < 50) {
        return `⚠️ BROWSER AUTOMATION ISSUES: Success rate is ${stats.successRate}% (${stats.failedAttempts} failures)`;
      }

      return null;
    } catch (error) {
      logger.error('Error checking browser automation', error as Error);
      return null;
    }
  }

  /**
   * Check for paused feeds
   */
  private async checkPausedFeeds(): Promise<string | null> {
    try {
      const pausedCount = await prisma.feed.count({
        where: {
          status: 'paused',
          isActive: true,
        },
      });

      if (pausedCount > 0) {
        return `ℹ️ PAUSED FEEDS: ${pausedCount} feed${pausedCount > 1 ? 's are' : ' is'} paused and need attention`;
      }

      return null;
    } catch (error) {
      logger.error('Error checking paused feeds', error as Error);
      return null;
    }
  }

  /**
   * Check for blocked feeds
   */
  private async checkBlockedFeeds(): Promise<string | null> {
    try {
      const blockedCount = await prisma.feed.count({
        where: {
          status: 'blocked',
          isActive: true,
        },
      });

      if (blockedCount > 5) {
        return `⚠️ MANY BLOCKED FEEDS: ${blockedCount} feeds are blocked (403/522 errors)`;
      }

      return null;
    } catch (error) {
      logger.error('Error checking blocked feeds', error as Error);
      return null;
    }
  }

  /**
   * Get system health summary
   */
  async getHealthSummary(): Promise<{
    totalFeeds: number;
    activeFeeds: number;
    healthyFeeds: number;
    degradedFeeds: number;
    blockedFeeds: number;
    unreachableFeeds: number;
    pausedFeeds: number;
    overallHealth: 'good' | 'warning' | 'critical';
  }> {
    try {
      const feeds = await prisma.feed.findMany({
        where: { isActive: true },
        select: { status: true },
      });

      const totalFeeds = feeds.length;
      const activeFeeds = feeds.filter(f => f.status === 'active').length;
      const healthyFeeds = activeFeeds;
      const degradedFeeds = feeds.filter(f => f.status === 'degraded').length;
      const blockedFeeds = feeds.filter(f => f.status === 'blocked').length;
      const unreachableFeeds = feeds.filter(f => f.status === 'unreachable').length;
      const pausedFeeds = feeds.filter(f => f.status === 'paused').length;

      const problematicFeeds = degradedFeeds + blockedFeeds + unreachableFeeds + pausedFeeds;
      const healthPercentage = totalFeeds > 0 ? (healthyFeeds / totalFeeds) * 100 : 100;

      let overallHealth: 'good' | 'warning' | 'critical';
      if (healthPercentage >= 80) {
        overallHealth = 'good';
      } else if (healthPercentage >= 50) {
        overallHealth = 'warning';
      } else {
        overallHealth = 'critical';
      }

      return {
        totalFeeds,
        activeFeeds,
        healthyFeeds,
        degradedFeeds,
        blockedFeeds,
        unreachableFeeds,
        pausedFeeds,
        overallHealth,
      };
    } catch (error) {
      logger.error('Error getting health summary', error as Error);
      return {
        totalFeeds: 0,
        activeFeeds: 0,
        healthyFeeds: 0,
        degradedFeeds: 0,
        blockedFeeds: 0,
        unreachableFeeds: 0,
        pausedFeeds: 0,
        overallHealth: 'critical',
      };
    }
  }

  /**
   * Log alerts to console (can be extended to send emails, Slack, etc.)
   */
  async logAlerts(): Promise<void> {
    const { healthy, alerts } = await this.checkSystemHealth();

    if (!healthy) {
      logger.warn('SYSTEM HEALTH ALERTS');
      alerts.forEach(alert => logger.warn(alert));
    } else {
      logger.info('System health check: All systems operational');
    }

    const summary = await this.getHealthSummary();
    logger.info(`Health Summary: ${summary.healthyFeeds}/${summary.totalFeeds} feeds healthy (${summary.overallHealth})`);
  }
}

// Export singleton instance
export const monitoringAlertsService = new MonitoringAlertsService();
