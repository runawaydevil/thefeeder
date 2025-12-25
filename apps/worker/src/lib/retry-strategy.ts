/**
 * Retry Strategy Engine
 * Determines when and how to retry failed feeds
 */

import { logger } from './logger.js';

export type ErrorType = 'timeout' | 'blocked' | 'server_error' | 'other';

export interface CalculateNextRetryParams {
  feed: any; // Feed from Prisma
  statusCode?: number;
  errorType: ErrorType;
}

export class RetryStrategyEngine {
  /**
   * Calculate next retry time based on failure type
   */
  calculateNextRetry(params: CalculateNextRetryParams): Date {
    const { feed, statusCode, errorType } = params;
    const now = new Date();

    // Blocked feeds (403/522): wait 24 hours
    if (errorType === 'blocked' || statusCode === 403 || statusCode === 522) {
      logger.debug(`Blocked feed - scheduling retry in 24 hours`);
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }

    // Server errors (5xx): exponential backoff
    if (errorType === 'server_error' || (statusCode && statusCode >= 500 && statusCode < 600)) {
      const backoffDelay = this.getExponentialBackoff(feed.consecutiveFailures || 1);
      logger.debug(`Server error - exponential backoff: ${backoffDelay}ms`);
      return new Date(now.getTime() + backoffDelay);
    }

    // Timeout: use standard interval but with increased timeout next time
    if (errorType === 'timeout') {
      const intervalMs = feed.refreshIntervalMinutes * 60 * 1000;
      logger.debug(`Timeout - retry in ${feed.refreshIntervalMinutes} minutes`);
      return new Date(now.getTime() + intervalMs);
    }

    // Other errors: use standard interval
    const intervalMs = feed.refreshIntervalMinutes * 60 * 1000;
    logger.debug(`Other error - retry in ${feed.refreshIntervalMinutes} minutes`);
    return new Date(now.getTime() + intervalMs);
  }

  /**
   * Adjust timeout for next attempt
   * Increases by 50% on timeout, max 60 seconds
   */
  adjustTimeout(currentTimeout: number, timedOut: boolean): number {
    if (!timedOut) {
      return currentTimeout;
    }

    // Increase by 50%
    const newTimeout = Math.round(currentTimeout * 1.5);
    
    // Cap at 60 seconds
    const maxTimeout = 60;
    const adjustedTimeout = Math.min(newTimeout, maxTimeout);

    logger.debug(`Adjusting timeout: ${currentTimeout}s → ${adjustedTimeout}s`);
    return adjustedTimeout;
  }

  /**
   * Get retry delay for exponential backoff
   * Sequence: 1h, 2h, 4h, 8h, 24h
   */
  getExponentialBackoff(attemptNumber: number): number {
    const baseDelay = 60 * 60 * 1000; // 1 hour in milliseconds
    const maxDelay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    // Calculate: 1h * 2^(attempt-1)
    const delay = baseDelay * Math.pow(2, attemptNumber - 1);
    
    // Cap at 24 hours
    return Math.min(delay, maxDelay);
  }

  /**
   * Check if feed should be retried now
   */
  shouldRetryNow(feed: any): boolean {
    // Paused feeds should not be retried
    if (feed.status === 'paused') {
      return false;
    }

    // Inactive feeds should not be retried
    if (!feed.isActive) {
      return false;
    }

    return true;
  }

  /**
   * Calculate progressive timeout increase
   * Increases by 10 seconds per timeout, starting from 15s, max 60s
   */
  calculateProgressiveTimeout(currentTimeout: number | null, timedOut: boolean): number {
    const defaultTimeout = 15; // Default 15 seconds
    const increment = 10; // Increase by 10 seconds
    const maxTimeout = 60; // Max 60 seconds

    if (!timedOut) {
      return currentTimeout || defaultTimeout;
    }

    const baseTimeout = currentTimeout || defaultTimeout;
    const newTimeout = baseTimeout + increment;

    return Math.min(newTimeout, maxTimeout);
  }

  /**
   * Calculate timeout reduction after consecutive successes
   * Gradually reduces timeout back to default after 10 consecutive successes
   */
  calculateTimeoutReduction(currentTimeout: number | null, consecutiveSuccesses: number): number {
    const defaultTimeout = 15;
    const reductionThreshold = 10; // Start reducing after 10 successes

    if (!currentTimeout || currentTimeout <= defaultTimeout) {
      return defaultTimeout;
    }

    if (consecutiveSuccesses < reductionThreshold) {
      return currentTimeout;
    }

    // Reduce by 10% per success after threshold
    const reductionFactor = 0.9;
    const newTimeout = Math.round(currentTimeout * reductionFactor);

    return Math.max(newTimeout, defaultTimeout);
  }
}

// Export singleton instance
export const retryStrategyEngine = new RetryStrategyEngine();
