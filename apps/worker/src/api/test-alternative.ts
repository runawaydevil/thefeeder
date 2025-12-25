import { Request, Response } from 'express';
import { feedDiscoveryService } from '../lib/feed-discovery.js';
import { logger } from '../lib/logger.js';

/**
 * POST /api/feeds/test-alternative
 * Test if an alternative feed URL is valid
 */
export async function testAlternative(req: Request, res: Response) {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    logger.debug(`Testing alternative URL: ${url}`);

    const result = await feedDiscoveryService.testAlternative(url);

    return res.json(result);
  } catch (error: any) {
    logger.error('Error testing alternative', error);
    return res.status(500).json({ 
      error: 'Failed to test alternative',
      message: error.message 
    });
  }
}
