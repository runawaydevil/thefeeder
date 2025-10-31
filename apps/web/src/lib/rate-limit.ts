type RateRecord = {
  count: number;
  resetAt: number;
};

const keyToRecord: Map<string, RateRecord> = new Map();

export function rateLimit(key: string, maxRequests: number, windowMs: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = keyToRecord.get(key);

  if (!record || record.resetAt <= now) {
    const newRecord: RateRecord = { count: 1, resetAt: now + windowMs };
    keyToRecord.set(key, newRecord);
    return { allowed: true, remaining: Math.max(0, maxRequests - 1), resetAt: newRecord.resetAt };
  }

  if (record.count < maxRequests) {
    record.count += 1;
    return { allowed: true, remaining: Math.max(0, maxRequests - record.count), resetAt: record.resetAt };
  }

  return { allowed: false, remaining: 0, resetAt: record.resetAt };
}


