/**
 * Notification Service
 * Creates and manages feed notifications
 */

import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

const prisma = new PrismaClient();

export type NotificationType = 'warning' | 'error' | 'success' | 'info';
export type NotificationPriority = 'low' | 'normal' | 'high';

export interface CreateNotificationParams {
  feedId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
}

export class NotificationService {
  /**
   * Create a notification
   */
  async createNotification(params: CreateNotificationParams): Promise<any> {
    const { feedId, type, priority, title, message } = params;

    try {
      const notification = await prisma.feedNotification.create({
        data: {
          feedId,
          type,
          priority,
          title,
          message,
        },
      });

      logger.info(`Created ${priority} ${type} notification for feed ${feedId}: ${title}`);
      return notification;
    } catch (error) {
      logger.error('Error creating notification', error as Error);
      // Don't throw - notification failure should not break the system
      return null;
    }
  }

  /**
   * Get unread notifications
   */
  async getUnreadNotifications(): Promise<any[]> {
    return await prisma.feedNotification.findMany({
      where: { isRead: false },
      include: {
        feed: {
          select: {
            id: true,
            title: true,
            url: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await prisma.feedNotification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });

      logger.debug(`Marked notification ${notificationId} as read`);
    } catch (error) {
      logger.error('Error marking notification as read', error as Error);
      throw error;
    }
  }

  /**
   * Dismiss all notifications for a feed
   */
  async dismissFeedNotifications(feedId: string): Promise<void> {
    try {
      await prisma.feedNotification.updateMany({
        where: { feedId },
        data: { isRead: true },
      });

      logger.debug(`Dismissed all notifications for feed ${feedId}`);
    } catch (error) {
      logger.error('Error dismissing feed notifications', error as Error);
      throw error;
    }
  }

  /**
   * Create warning notification after 3 consecutive failures
   */
  async createWarningNotification(feed: any): Promise<void> {
    if (feed.consecutiveFailures === 3) {
      await this.createNotification({
        feedId: feed.id,
        type: 'warning',
        priority: 'normal',
        title: `Feed "${feed.title}" has 3 consecutive failures`,
        message: `The feed has failed 3 times in a row. Last error: ${feed.lastError || 'Unknown'}. Consider checking the feed URL or pausing it.`,
      });
    }
  }

  /**
   * Create error notification when feed is auto-paused
   */
  async createAutoPauseNotification(feed: any): Promise<void> {
    await this.createNotification({
      feedId: feed.id,
      type: 'error',
      priority: 'high',
      title: `Feed "${feed.title}" has been auto-paused`,
      message: `The feed has been automatically paused after ${feed.consecutiveFailures} consecutive failures. Last error: ${feed.lastError || 'Unknown'}. Please review and resume manually if needed.`,
    });
  }

  /**
   * Create success notification when feed recovers
   */
  async createRecoveryNotification(feed: any): Promise<void> {
    // Only create recovery notification if feed was previously in a problematic state
    if (feed.status === 'active' && feed.consecutiveFailures === 0 && feed.failureCount > 0) {
      await this.createNotification({
        feedId: feed.id,
        type: 'success',
        priority: 'low',
        title: `Feed "${feed.title}" has recovered`,
        message: `The feed is now working normally after previous failures.`,
      });
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
