import { get, set } from "./cache";

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Rate limiting using Redis for distributed systems
 * More granular than in-memory rate limiting
 */
export async function rateLimitRedis(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const { maxRequests, windowMs, keyPrefix = "rate_limit" } = config;
  const now = Date.now();
  const cacheKey = `${keyPrefix}:${key}`;

  try {
    // Try to get current rate limit data from Redis
    const record = await get<{ count: number; resetAt: number }>(cacheKey);

    if (!record || record.resetAt <= now) {
      // Create new rate limit window
      const newRecord = {
        count: 1,
        resetAt: now + windowMs,
      };
      await set(cacheKey, newRecord, Math.ceil(windowMs / 1000));
      return {
        allowed: true,
        remaining: Math.max(0, maxRequests - 1),
        resetAt: newRecord.resetAt,
      };
    }

    if (record.count < maxRequests) {
      // Increment count
      const updatedRecord = {
        count: record.count + 1,
        resetAt: record.resetAt,
      };
      const ttl = Math.ceil((record.resetAt - now) / 1000);
      await set(cacheKey, updatedRecord, ttl);
      return {
        allowed: true,
        remaining: Math.max(0, maxRequests - updatedRecord.count),
        resetAt: record.resetAt,
      };
    }

    // Rate limit exceeded
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
      retryAfter,
    };
  } catch (error) {
    // If Redis fails, fall back to allowing the request
    // This prevents Redis issues from breaking the app
    console.error("[Rate Limit] Redis error, allowing request:", error);
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: now + windowMs,
    };
  }
}

/**
 * Rate limit by IP address
 */
export async function rateLimitByIP(
  ip: string,
  maxRequests: number,
  windowMs: number,
  keyPrefix: string = "ip",
): Promise<RateLimitResult> {
  return rateLimitRedis(`ip:${ip}`, {
    maxRequests,
    windowMs,
    keyPrefix,
  });
}

/**
 * Rate limit by user ID
 */
export async function rateLimitByUser(
  userId: string,
  maxRequests: number,
  windowMs: number,
  keyPrefix: string = "user",
): Promise<RateLimitResult> {
  return rateLimitRedis(`user:${userId}`, {
    maxRequests,
    windowMs,
    keyPrefix,
  });
}

/**
 * Rate limit by endpoint
 */
export async function rateLimitByEndpoint(
  endpoint: string,
  ip: string,
  maxRequests: number,
  windowMs: number,
): Promise<RateLimitResult> {
  return rateLimitRedis(`${endpoint}:${ip}`, {
    maxRequests,
    windowMs,
    keyPrefix: "endpoint",
  });
}

