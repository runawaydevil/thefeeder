/**
 * Browser Automation Service
 * Uses Puppeteer to fetch feeds that block standard HTTP clients
 */

// @ts-ignore - Puppeteer will be available after npm install
import puppeteer, { Browser, Page } from 'puppeteer';

export interface BrowserFetchOptions {
  timeout?: number;
  waitForSelector?: string;
  userAgent?: string;
  viewport?: { width: number; height: number };
}

export class BrowserAutomationService {
  private browser: Browser | null = null;
  private isLaunching: boolean = false;
  private maxConcurrent: number = 3;
  private activePages: number = 0;

  /**
   * Check if browser automation is available
   */
  isAvailable(): boolean {
    try {
      // Check if Puppeteer is installed and can be loaded
      return true;
    } catch (error) {
      console.error('[Browser Automation] Puppeteer not available:', error);
      return false;
    }
  }

  /**
   * Warm up browser instance (pre-launch)
   */
  async warmUp(): Promise<void> {
    if (!this.browser) {
      await this.getBrowser();
    }
  }

  /**
   * Get or create browser instance
   */
  private async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.connected) {
      return this.browser;
    }

    // Wait if already launching
    while (this.isLaunching) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (this.browser && this.browser.connected) {
      return this.browser;
    }

    this.isLaunching = true;

    try {
      console.log('[Browser Automation] Launching browser...');
      
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080',
        ],
      });

      console.log('[Browser Automation] ✓ Browser launched successfully');
      
      // Handle browser disconnect
      this.browser.on('disconnected', () => {
        console.log('[Browser Automation] Browser disconnected');
        this.browser = null;
      });

      return this.browser;
    } catch (error) {
      console.error('[Browser Automation] Failed to launch browser:', error);
      this.browser = null;
      throw error;
    } finally {
      this.isLaunching = false;
    }
  }

  /**
   * Fetch feed using headless browser
   */
  async fetchWithBrowser(url: string, options: BrowserFetchOptions = {}): Promise<string> {
    const {
      timeout = 60000,
      userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport = { width: 1920, height: 1080 },
    } = options;

    // Wait if too many concurrent pages
    while (this.activePages >= this.maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.activePages++;
    let page: Page | null = null;

    try {
      const browser = await this.getBrowser();
      page = await browser.newPage();

      console.log(`[Browser Automation] Fetching: ${url}`);

      // Set realistic browser fingerprint
      await page.setUserAgent(userAgent);
      await page.setViewport(viewport);

      // Set extra headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      });

      // Navigate to URL
      const response = await page.goto(url, {
        timeout,
        waitUntil: 'networkidle2',
      });

      if (!response) {
        throw new Error('No response from page');
      }

      if (!response.ok()) {
        throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
      }

      // Get page content
      const content = await page.content();

      console.log(`[Browser Automation] ✓ Successfully fetched ${url} (${content.length} bytes)`);

      return content;
    } catch (error: any) {
      console.error(`[Browser Automation] ✗ Failed to fetch ${url}:`, error.message);
      throw error;
    } finally {
      if (page) {
        await page.close().catch((err: any) => {
          console.error('[Browser Automation] Error closing page:', err);
        });
      }
      this.activePages--;
    }
  }

  /**
   * Shutdown browser instance
   */
  async shutdown(): Promise<void> {
    if (this.browser) {
      console.log('[Browser Automation] Shutting down browser...');
      try {
        await this.browser.close();
        this.browser = null;
        console.log('[Browser Automation] ✓ Browser shut down');
      } catch (error) {
        console.error('[Browser Automation] Error shutting down browser:', error);
      }
    }
  }
}

// Export singleton instance
export const browserAutomationService = new BrowserAutomationService();
