"""
WebSub (PubSubHubbub) implementation for real-time feed updates.
"""

import logging

import httpx

logger = logging.getLogger(__name__)


async def subscribe_to_hub(feed_url: str, hub_url: str, callback_url: str) -> bool:
    """
    Subscribe to a WebSub hub for a feed.
    
    Args:
        feed_url: URL of the feed
        hub_url: URL of the WebSub hub
        callback_url: Our callback URL
    
    Returns:
        True if subscription successful
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                hub_url,
                data={
                    'hub.mode': 'subscribe',
                    'hub.topic': feed_url,
                    'hub.callback': callback_url,
                    'hub.verify': 'sync',
                    'hub.lease_seconds': '86400'  # 24 hours
                }
            )

            if response.status_code in [202, 204]:
                logger.info(f"Successfully subscribed to WebSub hub for {feed_url}")
                return True
            else:
                logger.warning(f"WebSub subscription failed: {response.status_code}")
                return False

    except Exception as e:
        logger.error(f"Error subscribing to WebSub hub: {e}")
        return False


def detect_websub_hub(feed_content: bytes) -> str | None:
    """
    Detect WebSub hub URL from feed content.
    
    Args:
        feed_content: Feed XML content
    
    Returns:
        Hub URL if found, None otherwise
    """
    try:
        content_str = feed_content.decode('utf-8', errors='ignore')

        # Look for <link rel="hub">
        import re
        pattern = r'<link[^>]*rel=["\']hub["\'][^>]*href=["\']([^"\']+)["\']'
        match = re.search(pattern, content_str, re.IGNORECASE)

        if match:
            return match.group(1)

        return None

    except Exception as e:
        logger.error(f"Error detecting WebSub hub: {e}")
        return None


async def verify_websub_challenge(mode: str, topic: str, challenge: str, lease_seconds: int | None = None) -> dict[str, any]:
    """
    Verify WebSub subscription challenge.
    
    Args:
        mode: 'subscribe' or 'unsubscribe'
        topic: Feed URL
        challenge: Random challenge string
        lease_seconds: Optional lease duration
    
    Returns:
        Verification response
    """
    return {
        'mode': mode,
        'topic': topic,
        'challenge': challenge,
        'lease_seconds': lease_seconds or 86400
    }

