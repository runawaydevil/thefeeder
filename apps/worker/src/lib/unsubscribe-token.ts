import { createHmac } from "crypto";

/**
 * Get the secret key for unsubscribe tokens
 * Uses UNSUBSCRIBE_SECRET if set, otherwise falls back to NEXTAUTH_SECRET
 */
function getUnsubscribeSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      "UNSUBSCRIBE_SECRET or NEXTAUTH_SECRET must be set in environment variables",
    );
  }
  return secret;
}

/**
 * Generate a secure unsubscribe token from an email address
 * Uses HMAC-SHA256 to create a token that can be validated without storing it in the database
 * 
 * @param email - The email address to generate a token for
 * @returns A hex-encoded HMAC token
 */
export function generateUnsubscribeToken(email: string): string {
  const secret = getUnsubscribeSecret();
  const hmac = createHmac("sha256", secret);
  hmac.update(email.toLowerCase().trim());
  return hmac.digest("hex");
}

