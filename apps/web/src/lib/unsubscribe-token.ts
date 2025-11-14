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

/**
 * Validate an unsubscribe token and extract the email address
 * Since we use HMAC, we need to know the email to validate.
 * This function tries to verify if a token matches a given email.
 * 
 * @param token - The token to validate
 * @param email - The email address to check against
 * @returns true if the token is valid for the given email
 */
export function validateUnsubscribeToken(token: string, email: string): boolean {
  const expectedToken = generateUnsubscribeToken(email);
  return token === expectedToken;
}

/**
 * Verify unsubscribe token and return email if valid
 * This requires checking against all subscribers since HMAC can't be reversed
 * 
 * @param token - The token to verify
 * @returns The email address if valid, null otherwise
 */
export async function verifyUnsubscribeToken(token: string): Promise<string | null> {
  // Import prisma here to avoid circular dependencies
  const { prisma } = await import("./prisma");
  
  try {
    // Get all subscribers
    const subscribers = await prisma.subscriber.findMany({
      select: { email: true },
    });
    
    // Check token against each subscriber
    for (const subscriber of subscribers) {
      if (validateUnsubscribeToken(token, subscriber.email)) {
        return subscriber.email;
      }
    }
    
    return null;
  } catch (error) {
    console.error("[Unsubscribe Token] Error verifying token:", error);
    return null;
  }
}

