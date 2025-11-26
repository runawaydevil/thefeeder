/**
 * Error handling utilities
 * Provides consistent error messages for users
 */

export interface ApiError {
  error: string;
  code?: string;
  details?: any;
}

/**
 * Parse API error response
 */
export async function parseApiError(response: Response): Promise<ApiError> {
  try {
    const data = await response.json();
    return {
      error: data.error || `Error: ${response.status} ${response.statusText}`,
      code: data.code,
      details: data.details,
    };
  } catch {
    return {
      error: `Error: ${response.status} ${response.statusText}`,
      code: `HTTP_${response.status}`,
    };
  }
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyError(error: Error | ApiError | string): string {
  if (typeof error === "string") {
    return error;
  }

  if ("error" in error) {
    return error.error;
  }

  // Handle common error types
  const message = error.message || "An unexpected error occurred";

  // Network errors
  if (message.includes("fetch") || message.includes("network")) {
    return "Network error. Please check your connection and try again.";
  }

  // Timeout errors
  if (message.includes("timeout")) {
    return "Request timed out. Please try again.";
  }

  // Rate limiting
  if (message.includes("rate limit") || message.includes("too many")) {
    return "Too many requests. Please wait a moment and try again.";
  }

  // Generic fallback
  return message;
}

/**
 * Handle API error with user-friendly message
 */
export async function handleApiError(
  response: Response,
  defaultMessage: string = "An error occurred",
): Promise<string> {
  if (response.ok) {
    return "";
  }

  const apiError = await parseApiError(response);
  return getUserFriendlyError(apiError);
}

