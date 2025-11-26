/**
 * CORS configuration utilities
 */

export interface CorsConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  maxAge?: number;
  credentials?: boolean;
}

const DEFAULT_CONFIG: CorsConfig = {
  allowedOrigins: [],
  allowedMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400, // 24 hours
  credentials: false,
};

/**
 * Get CORS headers for a request
 */
export function getCorsHeaders(
  origin: string | null,
  config: Partial<CorsConfig> = {},
): Record<string, string> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const headers: Record<string, string> = {};

  // Get allowed origins from env or config
  const allowedOrigins =
    finalConfig.allowedOrigins.length > 0
      ? finalConfig.allowedOrigins
      : process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()) || ["*"];

  // Check if origin is allowed
  const isAllowed =
    allowedOrigins.includes("*") ||
    (origin && allowedOrigins.includes(origin));

  if (isAllowed && origin) {
    headers["Access-Control-Allow-Origin"] = origin;
  } else if (allowedOrigins.includes("*")) {
    headers["Access-Control-Allow-Origin"] = "*";
  }

  if (finalConfig.credentials) {
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  headers["Access-Control-Allow-Methods"] = finalConfig.allowedMethods.join(", ");
  headers["Access-Control-Allow-Headers"] = finalConfig.allowedHeaders.join(", ");

  if (finalConfig.maxAge) {
    headers["Access-Control-Max-Age"] = finalConfig.maxAge.toString();
  }

  return headers;
}

/**
 * Handle CORS preflight request
 */
export function handleCorsPreflight(
  origin: string | null,
  config: Partial<CorsConfig> = {},
): Response | null {
  const headers = getCorsHeaders(origin, config);

  // If no origin is allowed, return null (no CORS headers)
  if (!headers["Access-Control-Allow-Origin"]) {
    return null;
  }

  return new Response(null, {
    status: 204,
    headers,
  });
}

