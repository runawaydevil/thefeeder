/**
 * Payload validation utilities
 * Prevents oversized payloads and validates structure
 */

const MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB
const MAX_STRING_LENGTH = 10000; // 10KB per string field
const MAX_ARRAY_LENGTH = 1000; // Max 1000 items in arrays

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate request payload size
 */
export function validatePayloadSize(
  body: string | object,
  maxSize: number = MAX_PAYLOAD_SIZE,
): ValidationResult {
  let size: number;

  if (typeof body === "string") {
    size = Buffer.byteLength(body, "utf8");
  } else {
    size = Buffer.byteLength(JSON.stringify(body), "utf8");
  }

  if (size > maxSize) {
    return {
      valid: false,
      error: `Payload too large: ${size} bytes (max: ${maxSize} bytes)`,
    };
  }

  return { valid: true };
}

/**
 * Validate string length
 */
export function validateStringLength(
  value: string,
  maxLength: number = MAX_STRING_LENGTH,
  fieldName: string = "field",
): ValidationResult {
  if (value.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} too long: ${value.length} characters (max: ${maxLength})`,
    };
  }

  return { valid: true };
}

/**
 * Validate array length
 */
export function validateArrayLength(
  array: any[],
  maxLength: number = MAX_ARRAY_LENGTH,
  fieldName: string = "array",
): ValidationResult {
  if (array.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} too large: ${array.length} items (max: ${maxLength})`,
    };
  }

  return { valid: true };
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): ValidationResult {
  try {
    const urlObj = new URL(url);
    
    // Check protocol
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return {
        valid: false,
        error: "URL must use http:// or https://",
      };
    }

    // Check hostname
    if (!urlObj.hostname || urlObj.hostname.length === 0) {
      return {
        valid: false,
        error: "Invalid URL hostname",
      };
    }

    // Check total length
    if (url.length > 2048) {
      return {
        valid: false,
        error: "URL too long (max: 2048 characters)",
      };
    }

    return { valid: true };
  } catch {
    return {
      valid: false,
      error: "Invalid URL format",
    };
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return {
      valid: false,
      error: "Invalid email format",
    };
  }

  if (email.length > 254) {
    return {
      valid: false,
      error: "Email too long (max: 254 characters)",
    };
  }

  return { valid: true };
}

/**
 * Sanitize string input (remove dangerous characters)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
    .trim()
    .substring(0, MAX_STRING_LENGTH);
}

/**
 * Validate and sanitize request body
 */
export function validateRequestBody(body: any): ValidationResult {
  // Check payload size
  const sizeCheck = validatePayloadSize(body);
  if (!sizeCheck.valid) {
    return sizeCheck;
  }

  // Validate common fields if present
  if (body.url && typeof body.url === "string") {
    const urlCheck = validateUrl(body.url);
    if (!urlCheck.valid) {
      return urlCheck;
    }
  }

  if (body.email && typeof body.email === "string") {
    const emailCheck = validateEmail(body.email);
    if (!emailCheck.valid) {
      return emailCheck;
    }
  }

  if (body.title && typeof body.title === "string") {
    const titleCheck = validateStringLength(body.title, 500, "Title");
    if (!titleCheck.valid) {
      return titleCheck;
    }
  }

  return { valid: true };
}

