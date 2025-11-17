import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

const VOTER_ID_COOKIE = 'voter_id';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 365 days in seconds

/**
 * Validates if a string is a valid UUID v4
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Get or create a voter ID from cookies
 * Returns a UUID that uniquely identifies this anonymous voter
 * 
 * @returns Promise<string> - The voter ID (UUID v4)
 */
export async function getVoterId(): Promise<string> {
  const cookieStore = await cookies();
  let voterId = cookieStore.get(VOTER_ID_COOKIE)?.value;
  
  // If no cookie exists or cookie is invalid, generate new voter ID
  if (!voterId || !isValidUUID(voterId)) {
    if (voterId) {
      console.warn('[VoterID] Invalid voter ID detected, generating new one');
    }
    voterId = randomUUID();
    await setVoterId(voterId);
  }
  
  return voterId;
}

/**
 * Set voter ID cookie with secure attributes
 * 
 * @param voterId - The UUID to set as voter ID
 */
export async function setVoterId(voterId: string): Promise<void> {
  const cookieStore = await cookies();
  
  cookieStore.set(VOTER_ID_COOKIE, voterId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

/**
 * Get voter ID from cookies without creating a new one
 * Returns null if no voter ID exists
 * 
 * @returns Promise<string | null> - The voter ID or null
 */
export async function getExistingVoterId(): Promise<string | null> {
  const cookieStore = await cookies();
  const voterId = cookieStore.get(VOTER_ID_COOKIE)?.value;
  
  if (!voterId || !isValidUUID(voterId)) {
    return null;
  }
  
  return voterId;
}
