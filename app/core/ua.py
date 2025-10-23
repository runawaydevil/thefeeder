"""
User-Agent policy following best practices.
Reddit-compliant: clear, descriptive, with contact info.
"""

from app.core.config import settings


def build_ua() -> str:
    """
    Build descriptive User-Agent string.
    
    Following Reddit's requirements:
    - Clear and descriptive
    - Include version and contact
    - No random rotation
    """
    return settings.USER_AGENT_BASE


def get_headers() -> dict:
    """Get standard headers with proper User-Agent."""
    return {
        "User-Agent": build_ua(),
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
    }
