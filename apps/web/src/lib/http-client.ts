/**
 * Custom HTTP client for fetching feeds that bypass common blocking mechanisms
 * Uses minimal headers and mimics curl behavior
 */

interface FetchOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
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
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[HTTP Client] → Attempt ${attempt}/${retries}: ${url}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          // Minimal headers like curl
          "User-Agent": "curl/7.68.0",
          "Accept": "*/*",
        },
        // Don't follow redirects automatically (like curl -L)
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
  
  // Strategy 1: Direct fetch with curl headers
  try {
    console.log(`[HTTP Client] → Strategy 1: Direct fetch with curl headers`);
    const result = await fetchWithRetry(url, { retries: 2 });
    console.log(`[HTTP Client] ✓ Strategy 1 succeeded`);
    return result;
  } catch (error) {
    console.warn(
      `[HTTP Client] ✗ Strategy 1 failed:`,
      error instanceof Error ? error.message : error
    );
  }

  // Strategy 2: Try with different User-Agent
  try {
    console.log(`[HTTP Client] → Strategy 2: Browser User-Agent`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
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
      
      console.log(`[HTTP Client] ✓ Strategy 2 succeeded (${text.length} bytes)`);
      return text;
    }
  } catch (error) {
    console.warn(
      `[HTTP Client] ✗ Strategy 2 failed:`,
      error instanceof Error ? error.message : error
    );
  }

  // Strategy 3: Minimal request (like wget)
  try {
    console.log(`[HTTP Client] → Strategy 3: Minimal wget-like request`);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Wget/1.20.3 (linux-gnu)",
      },
    });

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
