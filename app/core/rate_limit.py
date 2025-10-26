"""
Rate limiting implementation with token bucket per host.
Respects Retry-After headers and implements global concurrency limits.
"""

import asyncio
import time
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
        self.buckets: dict[str, TokenBucket] = defaultdict(
            lambda: TokenBucket(settings.PER_HOST_RPS)
        )
        self.semaphore = asyncio.Semaphore(settings.GLOBAL_CONCURRENCY)
        # Store Retry-After delays per host
        self.retry_after_delays: dict[str, float] = {}
        # Track error rates per host for backpressure
        self.error_counts: dict[str, int] = defaultdict(int)
        self.request_counts: dict[str, int] = defaultdict(int)

    async def acquire(self, host: str) -> bool:
        """Acquire permission to make request to host."""
        # Check if host has Retry-After delay
        if host in self.retry_after_delays:
            delay = self.retry_after_delays[host]
            if delay > 0:
                await asyncio.sleep(delay)
                del self.retry_after_delays[host]

        # Global concurrency limit
        await self.semaphore.acquire()

        # Per-host rate limit
        bucket = self.buckets[host]
        if await bucket.acquire():
            return True
        else:
            self.semaphore.release()
            return False

    def set_retry_after(self, host: str, delay: float):
        """Set Retry-After delay for a host."""
        self.retry_after_delays[host] = delay

    def record_request(self, host: str, success: bool):
        """Record request result for backpressure."""
        self.request_counts[host] += 1
        if not success:
            self.error_counts[host] += 1

    def get_error_rate(self, host: str) -> float:
        """Get error rate for a host."""
        total = self.request_counts[host]
        if total == 0:
            return 0.0
        return self.error_counts[host] / total

    def should_backpressure(self, host: str, threshold: float = 0.5) -> bool:
        """Check if backpressure should be applied to host."""
        return self.get_error_rate(host) > threshold

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


def get_retry_after_delay(response: httpx.Response) -> float | None:
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


def apply_retry_after(url: str, delay: float):
    """Apply Retry-After delay to a host."""
    try:
        parsed_url = httpx.URL(url)
        host = parsed_url.host
        if host:
            rate_limiter.set_retry_after(host, delay)
    except Exception:
        pass
