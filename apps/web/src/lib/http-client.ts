/**
 * Custom HTTP client for fetching feeds that bypass common blocking mechanisms
 * Uses realistic browser headers and mimics human behavior with delays
 */

import { generateRealisticHeaders, getRandomUserAgent } from "./user-agents";

interface FetchOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  minDelay?: number;
  maxDelay?: number;
}

/**
 * Random delay to mimic human behavior (2-5 seconds)
 */
async function randomDelay(min: number = 2000, max: number = 5000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  console.log(`[HTTP Client] → Human-like delay: ${delay}ms`);
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Fetch with curl-like behavior and retry logic
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<string> {
  const {
    timeout = 15000,
    retries = 3,
    retryDelay = 2000,
    minDelay = 2000,
    maxDelay = 5000,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Add random delay before each attempt (except first)
      if (attempt > 1) {
        await randomDelay(minDelay, maxDelay);
      }
      
      console.log(`[HTTP Client] → Attempt ${attempt}/${retries}: ${url}`);

      // Generate realistic headers
      const headers = generateRealisticHeaders();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers,
        redirect: "follow",
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      let text = await response.text();
      
      // Remove BOM (Byte Order Mark) if present
      if (text.charCodeAt(0) === 0xFEFF) {
        console.log(`[HTTP Client] → Removing BOM`);
        text = text.substring(1);
      }
      
      // Trim whitespace
      const originalLength = text.length;
      text = text.trim();
      if (text.length < originalLength) {
        console.log(`[HTTP Client] → Trimmed ${originalLength - text.length} whitespace chars`);
      }
      
      console.log(`[HTTP Client] ✓ Success (${text.length} bytes)`);
      return text;
    } catch (error: any) {
      lastError = error;
      console.warn(
        `[HTTP Client] ✗ Attempt ${attempt} failed:`,
        error.message
      );

      // Don't retry on certain errors
      if (
        error.message?.includes("404") ||
        error.message?.includes("410")
      ) {
        throw error;
      }

      // Wait before retry (exponential backoff)
      if (attempt < retries) {
        const delay = retryDelay * Math.pow(2, attempt - 1);
        console.log(`[HTTP Client] → Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Failed to fetch after retries");
}

/**
 * Fetch feed with multiple strategies
 */
export async function fetchFeed(url: string): Promise<string> {
  console.log(`[HTTP Client] ===== STARTING FETCH FEED FOR: ${url} =====`);
  
  // Strategy 1: Realistic browser with full headers
  try {
    console.log(`[HTTP Client] → Strategy 1: Realistic browser headers (Chrome/Firefox/Safari)`);
    const result = await fetchWithRetry(url, { 
      retries: 2,
      minDelay: 2000,
      maxDelay: 4000,
    });
    console.log(`[HTTP Client] ✓ Strategy 1 succeeded`);
    return result;
  } catch (error) {
    console.warn(
      `[HTTP Client] ✗ Strategy 1 failed:`,
      error instanceof Error ? error.message : error
    );
  }

  // Add delay between strategies
  await randomDelay(3000, 5000);

  // Strategy 2: Try with different realistic headers
  try {
    console.log(`[HTTP Client] → Strategy 2: Alternative browser profile`);
    const headers = generateRealisticHeaders();
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      let text = await response.text();
      
      // Remove BOM if present
      if (text.charCodeAt(0) === 0xFEFF) {
        console.log(`[HTTP Client] → Removing BOM`);
        text = text.substring(1);
      }
      
      // Trim whitespace
      text = text.trim();
      
      console.log(`[HTTP Client] ✓ Strategy 2 succeeded (${text.length} bytes)`);
      return text;
    }
  } catch (error) {
    console.warn(
      `[HTTP Client] ✗ Strategy 2 failed:`,
      error instanceof Error ? error.message : error
    );
  }

  // Add delay between strategies
  await randomDelay(3000, 5000);

  // Strategy 3: Feed reader User-Agent
  try {
    console.log(`[HTTP Client] → Strategy 3: Feed reader User-Agent`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Feedly/1.0 (+http://www.feedly.com/fetcher.html; like FeedFetcher-Google)",
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
      },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      let text = await response.text();
      
      // Remove BOM if present
      if (text.charCodeAt(0) === 0xFEFF) {
        console.log(`[HTTP Client] → Removing BOM`);
        text = text.substring(1);
      }
      
      // Trim whitespace
      text = text.trim();
      
      console.log(`[HTTP Client] ✓ Strategy 3 succeeded (${text.length} bytes)`);
      return text;
    }
  } catch (error) {
    console.warn(
      `[HTTP Client] ✗ Strategy 3 failed:`,
      error instanceof Error ? error.message : error
    );
  }

  console.error(`[HTTP Client] ✗ All strategies failed`);
  throw new Error(
    "All fetch strategies failed - feed may be blocked or inaccessible"
  );
}
