import Redis from "ioredis";

let redisClient: Redis | null = null;

/**
 * Initialize Redis connection
 * Should be called at application startup
 */
export async function initializeRedis(): Promise<boolean> {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.warn("[Cache] REDIS_URL not configured, cache will be disabled");
    return false;
  }

  if (!redisClient) {
    try {
      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            return null;
          }
          return Math.min(times * 50, 2000);
        },
        lazyConnect: false,
        connectTimeout: 10000,
        enableReadyCheck: true,
      });

      redisClient.on("error", (error) => {
        console.error("[Cache] Redis error:", error.message);
      });

      redisClient.on("connect", () => {
        console.log("[Cache] Redis connected");
      });

      redisClient.on("ready", () => {
        console.log("[Cache] Redis ready");
      });

      await redisClient.connect();
      return true;
    } catch (error) {
      console.error("[Cache] Failed to initialize Redis:", error);
      return false;
    }
  }

  return true;
}

/**
 * Get Redis client instance (singleton)
 * Returns null if Redis is not configured or unavailable
 */
function getRedisClient(): Redis | null {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    return null;
  }

  return redisClient;
}

/**
 * Normalize URL for cache key consistency
 */
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove trailing slashes, normalize protocol
    return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname.replace(/\/$/, "")}${urlObj.search}`;
  } catch {
    return url;
  }
}

/**
 * Generate cache key with prefix
 */
export function cacheKey(prefix: string, ...parts: (string | number)[]): string {
  const normalizedParts = parts.map((part) => {
    if (typeof part === "string") {
      return normalizeUrl(part);
    }
    return String(part);
  });
  return `${prefix}:${normalizedParts.join(":")}`;
}

/**
 * Get value from cache
 * Returns null if not found or Redis unavailable
 */
export async function get<T = any>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) {
    return null;
  }

  try {
    const value = await client.get(key);
    if (!value) {
      return null;
    }
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`[Cache] Error getting key ${key}:`, error);
    return null;
  }
}

/**
 * Set value in cache with TTL
 * Returns true if successful, false otherwise
 */
export async function set(
  key: string,
  value: any,
  ttlSeconds: number,
): Promise<boolean> {
  const client = getRedisClient();
  if (!client) {
    return false;
  }

  try {
    const serialized = JSON.stringify(value);
    await client.setex(key, ttlSeconds, serialized);
    return true;
  } catch (error) {
    console.error(`[Cache] Error setting key ${key}:`, error);
    return false;
  }
}

/**
 * Delete key from cache
 */
export async function del(key: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) {
    return false;
  }

  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error(`[Cache] Error deleting key ${key}:`, error);
    return false;
  }
}

/**
 * Delete all keys matching pattern
 * Use with caution - scans all keys
 */
export async function delPattern(pattern: string): Promise<number> {
  const client = getRedisClient();
  if (!client) {
    return 0;
  }

  try {
    const keys: string[] = [];
    let cursor = "0";

    do {
      const [nextCursor, result] = await client.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100,
      );
      cursor = nextCursor;
      keys.push(...result);
    } while (cursor !== "0");

    if (keys.length === 0) {
      return 0;
    }

    const deleted = await client.del(...keys);
    return deleted;
  } catch (error) {
    console.error(`[Cache] Error deleting pattern ${pattern}:`, error);
    return 0;
  }
}

/**
 * Check if Redis is available
 */
export async function isAvailable(): Promise<boolean> {
  const client = getRedisClient();
  if (!client) {
    return false;
  }

  try {
    const result = await client.ping();
    return result === "PONG";
  } catch {
    return false;
  }
}

/**
 * Get Redis health status
 */
export async function getHealthStatus(): Promise<{
  available: boolean;
  connected: boolean;
  error?: string;
}> {
  const client = getRedisClient();
  
  if (!client) {
    return {
      available: false,
      connected: false,
      error: "Redis client not initialized",
    };
  }

  try {
    const pingResult = await client.ping();
    const status = client.status;
    
    return {
      available: true,
      connected: status === "ready" && pingResult === "PONG",
      error: status !== "ready" ? `Status: ${status}` : undefined,
    };
  } catch (error: any) {
    return {
      available: false,
      connected: false,
      error: error.message || "Unknown error",
    };
  }
}

/**
 * Cache wrapper function - executes function and caches result
 * Returns cached value if available, otherwise executes function and caches result
 */
export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds: number,
): Promise<T> {
  // Try to get from cache first
  const cached = await get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Execute function
  const result = await fn();

  // Store in cache (don't await - fire and forget)
  set(key, result, ttlSeconds).catch((error) => {
    console.error(`[Cache] Error caching result for ${key}:`, error);
  });

  return result;
}

