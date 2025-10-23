"""
Rate limiting implementation with token bucket per host.
Respects Retry-After headers and implements global concurrency limits.
"""

import asyncio
import time
from typing import Dict, Optional
from collections import defaultdict
import httpx
from app.core.config import settings


class TokenBucket:
    """Token bucket rate limiter."""
    
    def __init__(self, rate: float, capacity: int = 10):
        self.rate = rate  # tokens per second
        self.capacity = capacity
        self.tokens = capacity
        self.last_update = time.monotonic()
    
    async def acquire(self) -> bool:
        """Try to acquire a token. Returns True if successful."""
        now = time.monotonic()
        elapsed = now - self.last_update
        
        # Add tokens based on elapsed time
        self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
        self.last_update = now
        
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False


class RateLimiter:
    """Per-host rate limiter with global concurrency control."""
    
    def __init__(self):
        self.buckets: Dict[str, TokenBucket] = defaultdict(
            lambda: TokenBucket(settings.PER_HOST_RPS)
        )
        self.semaphore = asyncio.Semaphore(settings.GLOBAL_CONCURRENCY)
    
    async def acquire(self, host: str) -> bool:
        """Acquire permission to make request to host."""
        # Global concurrency limit
        await self.semaphore.acquire()
        
        # Per-host rate limit
        bucket = self.buckets[host]
        if await bucket.acquire():
            return True
        else:
            self.semaphore.release()
            return False
    
    def release(self):
        """Release global semaphore."""
        self.semaphore.release()


# Global rate limiter instance
rate_limiter = RateLimiter()


async def respect_rate_limit(url: str) -> bool:
    """Respect rate limits for the given URL."""
    try:
        parsed_url = httpx.URL(url)
        host = parsed_url.host
        return await rate_limiter.acquire(host)
    except Exception:
        return False


def release_rate_limit():
    """Release rate limit semaphore."""
    rate_limiter.release()


def get_retry_after_delay(response: httpx.Response) -> Optional[float]:
    """Extract Retry-After delay from response headers."""
    retry_after = response.headers.get("Retry-After")
    if retry_after:
        try:
            # Try to parse as seconds
            return float(retry_after)
        except ValueError:
            # Try to parse as HTTP date
            try:
                from email.utils import parsedate_to_datetime
                retry_date = parsedate_to_datetime(retry_after)
                return (retry_date.timestamp() - time.time())
            except (ValueError, TypeError):
                pass
    return None
