import { Request, Response } from 'express';
import { healthTrackingService } from '../lib/health-tracking.js';
import { logger } from '../lib/logger.js';

/**
 * GET /api/browser-automation/stats
 * Get browser automation statistics
 */
export async function getBrowserAutomationStats(req: Request, res: Response) {
  try {
    const stats = await healthTrackingService.getBrowserAutomationStats();
    return res.json(stats);
  } catch (error: any) {
    logger.error('Error getting browser automation stats', error);
    return res.status(500).json({ 
      error: 'Failed to get browser automation stats',
      message: error.message 
    });
  }
}
