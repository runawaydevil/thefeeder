"""
RSS/Atom parser with feedparser, data normalization,
and deduplication by guid/link/hash.
"""

import hashlib
import re
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

import chardet
import feedparser


def detect_encoding(content: bytes) -> str:
    """Detect encoding from content."""
    detected = chardet.detect(content)
    encoding = detected.get('encoding', 'utf-8')

    # Fallback to common encodings if detection fails
    if not encoding or encoding.lower() == 'ascii':
        encoding = 'utf-8'

    return encoding


class ParsedItem:
    """Normalized feed item."""

    def __init__(self, feed_id: int, title: str, link: str,
                 published: datetime | None = None, author: str = "",
                 summary: str = "", guid: str = "", thumbnail: str = ""):
        self.feed_id = feed_id
        self.title = title.strip()
        self.link = link.strip()
        self.published = published
        self.author = author.strip()
        self.summary = summary.strip()
        self.guid = guid.strip()
        self.thumbnail = thumbnail.strip()

        # Generate hash for deduplication if no guid
        if not self.guid:
            self.guid = self._generate_hash()

    def _generate_hash(self) -> str:
        """Generate MD5 hash for deduplication."""
        content = f"{self.feed_id}:{self.title}:{self.link}"
        return hashlib.md5(content.encode('utf-8')).hexdigest()

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for storage."""
        return {
            'feed_id': self.feed_id,
            'title': self.title,
            'link': self.link,
            'published': self.published,
            'author': self.author,
            'summary': self.summary,
            'guid': self.guid,
            'thumbnail': self.thumbnail
        }


def parse_feed_content(feed_id: int, content: bytes) -> list[ParsedItem]:
    """
    Parse RSS/Atom feed content into normalized items.
    
    Args:
        feed_id: ID of the feed
        content: Raw feed content bytes
    
    Returns:
        List of ParsedItem objects
    """
    if not content:
        return []

    try:
        # Parse with feedparser (it handles encoding internally)
        feed = feedparser.parse(content)

        if feed.bozo and not feed.entries:
            print(f"Warning: Feed {feed_id} has parsing errors: {feed.bozo_exception}")
            return []

        items = []
        for entry in feed.entries[:100]:  # Limit to 100 items per feed
            try:
                # Extract basic fields
                title = getattr(entry, 'title', 'No title')
                link = getattr(entry, 'link', '')

                # Clean Reddit metadata from title
                if 'reddit.com' in link.lower():
                    title = re.sub(r'\s*\[link\]\s*\[comments\]', '', title, flags=re.IGNORECASE)
                    title = title.strip()

                # Extract GUID
                guid = getattr(entry, 'id', '') or getattr(entry, 'guid', '')

                # Extract author
                author = getattr(entry, 'author', '') or getattr(entry, 'author_detail', {}).get('name', '')

                # Extract summary/description
                summary = getattr(entry, 'summary', '') or getattr(entry, 'description', '')
                summary = clean_html(summary)

                # Filter out Reddit metadata text
                if summary:
                    # Remove Reddit's "submitted by" metadata (flexible pattern)
                    summary = re.sub(r'submitted by.*?\[.*?\]\s*\[.*?\]', '', summary, flags=re.IGNORECASE | re.DOTALL)
                    summary = summary.strip()

                # Extract published date
                published = None
                if hasattr(entry, 'published_parsed') and entry.published_parsed:
                    try:
                        # RSS feeds typically publish in UTC, mark as timezone-aware
                        published = datetime(*entry.published_parsed[:6], tzinfo=ZoneInfo('UTC'))
                    except (ValueError, TypeError):
                        pass

                # Extract thumbnail
                thumbnail = extract_thumbnail(entry)

                # Create normalized item
                item = ParsedItem(
                    feed_id=feed_id,
                    title=title,
                    link=link,
                    published=published,
                    author=author,
                    summary=summary,
                    guid=guid,
                    thumbnail=thumbnail
                )

                items.append(item)

            except Exception as e:
                print(f"Error parsing entry in feed {feed_id}: {e}")
                continue

        return items

    except Exception as e:
        print(f"Error parsing feed {feed_id}: {e}")
        return []


def clean_html(html: str) -> str:
    """Remove HTML tags and clean text."""
    if not html:
        return ""

    # Remove HTML tags
    clean = re.sub(r'<[^>]+>', '', html)

    # Decode HTML entities
    import html
    clean = html.unescape(clean)

    # Clean whitespace
    clean = re.sub(r'\s+', ' ', clean).strip()

    return clean


def extract_thumbnail(entry) -> str:
    """Extract thumbnail URL from feed entry."""
    # Try different thumbnail fields
    thumbnail_fields = [
        'media_thumbnail',
        'media_content',
        'enclosures',
        'image',
        'thumbnail'
    ]

    for field in thumbnail_fields:
        if hasattr(entry, field):
            value = getattr(entry, field)
            if isinstance(value, list) and value:
                value = value[0]

            if isinstance(value, dict):
                url = value.get('url') or value.get('href')
                if url:
                    return url
            elif isinstance(value, str):
                return value

    # Try to extract from content
    content = getattr(entry, 'content', [])
    if content and isinstance(content, list):
        content_text = content[0].get('value', '')
        img_match = re.search(r'<img[^>]+src="([^"]+)"', content_text)
        if img_match:
            return img_match.group(1)

    return ""


def validate_feed_url(url: str) -> bool:
    """Basic validation of feed URL."""
    if not url:
        return False

    # Check if it's a valid HTTP/HTTPS URL
    return url.startswith(('http://', 'https://'))


