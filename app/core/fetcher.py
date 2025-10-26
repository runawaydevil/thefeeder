"""
HTTP fetcher with httpx, HTTP/2 support, ETag/Last-Modified caching,
exponential backoff with jitter, and per-host rate limiting.
"""

import asyncio
import random
import re

import httpx
from backoff import expo, on_exception

from app.core.config import settings
from app.core.rate_limit import (
    apply_retry_after,
    get_retry_after_delay,
    release_rate_limit,
    respect_rate_limit,
)
from app.core.ua import get_headers


class FetchResult:
    """Result of a fetch operation."""

    def __init__(self, status: int, content: bytes = b"", etag: str = "",
                 last_modified: str = "", error: str = ""):
        self.status = status
        self.content = content
        self.etag = etag
        self.last_modified = last_modified
        self.error = error
        self.is_not_modified = status == 304
        self.is_success = 200 <= status < 300


async def try_head_request(url: str, etag: str = "", last_modified: str = "") -> FetchResult:
    """Try HEAD request first for cache check."""
    try:
        headers = get_headers()
        if etag:
            headers["If-None-Match"] = etag
        if last_modified:
            headers["If-Modified-Since"] = last_modified

        async with httpx.AsyncClient(
            http2=True,
            timeout=settings.FETCH_TIMEOUT_SECONDS,
            headers=headers,
            follow_redirects=True
        ) as client:
            response = await client.head(url)

            # Handle 429 with Retry-After
            if response.status_code == 429:
                delay = get_retry_after_delay(response)
                if delay:
                    apply_retry_after(url, delay)
                    raise httpx.HTTPStatusError("429 retry", request=response.request, response=response)

            return FetchResult(
                status=response.status_code,
                content=b"",
                etag=response.headers.get("ETag", ""),
                last_modified=response.headers.get("Last-Modified", "")
            )
    except Exception:
        # HEAD not supported or failed, return None to try GET
        return None


async def fetch_with_backoff(url: str, etag: str = "", last_modified: str = "") -> FetchResult:
    """
    Fetch URL with exponential backoff and jitter.
    
    Args:
        url: URL to fetch
        etag: If-None-Match header value
        last_modified: If-Modified-Since header value
    
    Returns:
        FetchResult with status, content, and headers
    """

    @on_exception(
        expo,
        (httpx.HTTPError, httpx.TimeoutException),
        max_tries=settings.RETRY_MAX_ATTEMPTS,
        base=settings.RETRY_BASE_MS / 1000,
        max_value=settings.RETRY_MAX_MS / 1000,
        jitter=random.uniform(0.1, 0.3)  # Add jitter
    )
    async def _fetch():
        # Respect rate limits
        if not await respect_rate_limit(url):
            await asyncio.sleep(1)  # Wait if rate limited

        try:
            headers = get_headers()
            if etag:
                headers["If-None-Match"] = etag
            if last_modified:
                headers["If-Modified-Since"] = last_modified

            async with httpx.AsyncClient(
                http2=True,
                timeout=settings.FETCH_TIMEOUT_SECONDS,
                headers=headers,
                follow_redirects=True
            ) as client:
                response = await client.get(url)

                # Handle 429 with Retry-After
                if response.status_code == 429:
                    delay = get_retry_after_delay(response)
                    if delay:
                        await asyncio.sleep(delay)
                        raise httpx.HTTPStatusError("429 retry", request=response.request, response=response)

                return FetchResult(
                    status=response.status_code,
                    content=response.content,
                    etag=response.headers.get("ETag", ""),
                    last_modified=response.headers.get("Last-Modified", "")
                )

        finally:
            release_rate_limit()

    try:
        return await _fetch()
    except httpx.HTTPStatusError as e:
        return FetchResult(
            status=e.response.status_code,
            error=f"HTTP {e.response.status_code}: {e.response.text[:200]}"
        )
    except httpx.TimeoutException:
        return FetchResult(status=408, error="Request timeout")
    except httpx.RequestError as e:
        return FetchResult(status=0, error=f"Request error: {str(e)}")
    except Exception as e:
        return FetchResult(status=0, error=f"Unexpected error: {str(e)}")


async def fetch_feed(url: str, etag: str = "", last_modified: str = "") -> FetchResult:
    """
    Fetch RSS/Atom feed with caching headers.
    
    Args:
        url: Feed URL
        etag: Previous ETag for conditional request
        last_modified: Previous Last-Modified for conditional request
    
    Returns:
        FetchResult with feed content or 304 if not modified
    """
    return await fetch_with_backoff(url, etag, last_modified)


def is_valid_feed_content(content: bytes) -> bool:
    """Check if content looks like a valid RSS/Atom/JSON feed."""
    if not content:
        return False

    try:
        content_str = content.decode('utf-8', errors='ignore').lower()

        # Check for XML-based feeds (RSS, Atom, RDF)
        xml_tags = ['<rss', '<feed', '<channel', '<?xml', '<rdf:']
        if any(tag in content_str for tag in xml_tags):
            return True

        # Check for JSON Feed (https://jsonfeed.org/)
        if content_str.strip().startswith('{'):
            try:
                import json
                parsed = json.loads(content)
                # Check for JSON Feed structure
                if isinstance(parsed, dict) and ('version' in parsed or 'items' in parsed):
                    return True
            except (json.JSONDecodeError, ValueError):
                pass

        return False
    except Exception:
        return False


def validate_content_type(content_type: str) -> bool:
    """Validate Content-Type header for feeds."""
    if not content_type:
        return True  # Allow if missing

    # Normalize content type
    content_type = content_type.lower().split(';')[0].strip()

    # Valid feed content types
    valid_types = [
        'application/rss+xml',
        'application/atom+xml',
        'application/xml',
        'text/xml',
        'application/json',
        'application/feed+json',
        'application/json+feed'
    ]

    return content_type in valid_types


def detect_feed_in_html(html_content: bytes) -> str | None:
    """Try to discover RSS feed link in HTML content."""
    try:
        html_str = html_content.decode('utf-8', errors='ignore')

        # Look for <link rel="alternate" type="application/rss+xml">
        pattern = r'<link[^>]*rel=["\']alternate["\'][^>]*type=["\']application/rss\+xml["\'][^>]*href=["\']([^"\']+)["\']'
        match = re.search(pattern, html_str, re.IGNORECASE)
        if match:
            return match.group(1)

        # Look for <link rel="alternate" href="..." type="application/rss+xml">
        pattern = r'<link[^>]*href=["\']([^"\']+)["\'][^>]*type=["\']application/rss\+xml["\']'
        match = re.search(pattern, html_str, re.IGNORECASE)
        if match:
            return match.group(1)

        return None
    except Exception:
        return None
