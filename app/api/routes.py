"""
REST API endpoints for the React frontend.
Returns JSON responses for feeds, items, and pagination.
"""

from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional, List, Dict, Any
from datetime import datetime
import logging
from zoneinfo import ZoneInfo

from app.core.storage import storage
from app.core.config import settings
from app.core.maintenance import clean_reddit_summaries

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/config")
async def get_config():
    """Get application configuration."""
    from app.core.config import settings
    return JSONResponse({
        "app_name": settings.APP_NAME,
        "app_base_url": settings.APP_BASE_URL,
    })


def serialize_item(item: Dict[str, Any]) -> Dict[str, Any]:
    """Serialize item dict to API response format."""
    published = item.get("published")
    if published:
        if isinstance(published, datetime):
            # Convert from UTC to configured timezone
            if published.tzinfo is None:
                # Handle naive datetime (shouldn't happen with new code)
                published = published.replace(tzinfo=ZoneInfo('UTC'))
            published = published.astimezone(settings.tz).isoformat()
        elif isinstance(published, str):
            published = published
    else:
        published = None
    
    return {
        "id": item.get("id"),
        "feed_id": item.get("feed_id"),
        "title": item.get("title"),
        "link": item.get("link"),
        "published": published,
        "author": item.get("author"),
        "summary": item.get("summary"),
        "thumbnail": item.get("thumbnail"),
        "guid": item.get("guid"),
        "is_new": item.get("is_new", False),
        "feed_name": item.get("feed_name"),
        "feed_url": item.get("feed_url"),
    }


def serialize_feed(feed) -> Dict[str, Any]:
    """Serialize feed object to API response format."""
    # Convert datetime fields to configured timezone
    last_fetch_time = None
    if feed.last_fetch_time:
        if feed.last_fetch_time.tzinfo is None:
            last_fetch_time = feed.last_fetch_time.replace(tzinfo=ZoneInfo('UTC'))
        else:
            last_fetch_time = feed.last_fetch_time
        last_fetch_time = last_fetch_time.astimezone(settings.tz).isoformat()
    
    created_at = None
    if feed.created_at:
        if feed.created_at.tzinfo is None:
            created_at = feed.created_at.replace(tzinfo=ZoneInfo('UTC'))
        else:
            created_at = feed.created_at
        created_at = created_at.astimezone(settings.tz).isoformat()
    
    return {
        "id": feed.id,
        "name": feed.name,
        "url": feed.url,
        "enabled": feed.enabled,
        "interval_seconds": feed.interval_seconds,
        "last_fetch_status": feed.last_fetch_status,
        "last_fetch_time": last_fetch_time,
        "consecutive_errors": feed.consecutive_errors,
        "degraded": feed.degraded,
        "created_at": created_at,
    }


@router.get("/items")
async def get_items(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    feed_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    sort: Optional[str] = Query("recent"),
):
    """
    Get paginated items with optional filtering and search.
    
    Query params:
    - page: Page number (default: 1)
    - limit: Items per page (default: 20, max: 100)
    - feed_id: Filter by feed ID
    - search: Search query (full-text search)
    - sort: Sort order (recent, oldest, title, feed)
    """
    try:
        # Validate sort parameter
        valid_sorts = ["recent", "oldest", "title", "feed"]
        sort_param = sort if sort in valid_sorts else "recent"
        
        # Sanitize search query
        search_sanitized = None
        if search and search.strip():
            search_sanitized = search.strip()[:200]
        
        # Get items and total count
        items = storage.get_items(
            page=page,
            limit=limit,
            feed_id=feed_id,
            search_query=search_sanitized,
            sort_by=sort_param
        )
        total_items = storage.get_items_count(feed_id, search_query=search_sanitized)
        total_pages = (total_items + limit - 1) // limit
        
        # Serialize items
        serialized_items = [serialize_item(item) for item in items]
        
        return JSONResponse({
            "items": serialized_items,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1,
            },
            "meta": {
                "total": total_items,
            }
        })
    
    except Exception as e:
        logger.error(f"Error fetching items: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/items/{item_id}")
async def get_item(item_id: int):
    """Get a single item by ID."""
    try:
        items = storage.get_items(page=1, limit=1, feed_id=None, search_query=None, sort_by="recent")
        
        # Find item by ID
        item = next((i for i in items if i.get("id") == item_id), None)
        
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        
        return JSONResponse(serialize_item(item))
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching item {item_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/feeds")
async def get_feeds(
    search: Optional[str] = Query(None),
    enabled_only: bool = Query(True),
):
    """
    Get all feeds with optional search.
    
    Query params:
    - search: Search by feed name or URL
    - enabled_only: Only return enabled feeds (default: True)
    """
    try:
        feeds = storage.get_feeds(enabled_only=enabled_only)
        
        # Filter by search if provided
        if search and search.strip():
            search_lower = search.strip().lower()
            feeds = [
                f for f in feeds
                if search_lower in f.name.lower() or search_lower in f.url.lower()
            ]
        
        # Serialize feeds
        serialized_feeds = [serialize_feed(feed) for feed in feeds]
        
        return JSONResponse({
            "feeds": serialized_feeds,
            "pagination": {
                "page": 1,
                "limit": len(serialized_feeds),
                "total_pages": 1,
                "has_next": False,
                "has_prev": False,
            }
        })
    
    except Exception as e:
        logger.error(f"Error fetching feeds: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/feeds/{feed_id}")
async def get_feed(feed_id: int):
    """Get a single feed by ID with statistics."""
    try:
        feeds = storage.get_feeds(enabled_only=False)
        feed = next((f for f in feeds if f.id == feed_id), None)
        
        if not feed:
            raise HTTPException(status_code=404, detail="Feed not found")
        
        # Get feed statistics
        items = storage.get_items(page=1, limit=1, feed_id=feed_id)
        total_items = storage.get_items_count(feed_id)
        
        feed_data = serialize_feed(feed)
        # Convert last item time to configured timezone
        last_item_time = None
        if items and items[0].get("published"):
            published = items[0].get("published")
            if isinstance(published, datetime):
                if published.tzinfo is None:
                    published = published.replace(tzinfo=ZoneInfo('UTC'))
                last_item_time = published.astimezone(settings.tz).isoformat()
            elif isinstance(published, str):
                last_item_time = published
        
        feed_data["stats"] = {
            "total_items": total_items,
            "last_item_time": last_item_time,
        }
        
        return JSONResponse(feed_data)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching feed {feed_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/feeds/{feed_id}/items")
async def get_feed_items(
    feed_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    sort: Optional[str] = Query("recent"),
):
    """
    Get items for a specific feed.
    
    Query params:
    - page: Page number (default: 1)
    - limit: Items per page (default: 20, max: 100)
    - search: Search query
    - sort: Sort order (recent, oldest, title)
    """
    try:
        # Validate sort parameter
        valid_sorts = ["recent", "oldest", "title"]
        sort_param = sort if sort in valid_sorts else "recent"
        
        # Sanitize search query
        search_sanitized = None
        if search and search.strip():
            search_sanitized = search.strip()[:200]
        
        # Get items
        items = storage.get_items(
            page=page,
            limit=limit,
            feed_id=feed_id,
            search_query=search_sanitized,
            sort_by=sort_param
        )
        total_items = storage.get_items_count(feed_id, search_query=search_sanitized)
        total_pages = (total_items + limit - 1) // limit
        
        # Serialize items
        serialized_items = [serialize_item(item) for item in items]
        
        return JSONResponse({
            "items": serialized_items,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1,
            },
            "meta": {
                "total": total_items,
            }
        })
    
    except Exception as e:
        logger.error(f"Error fetching feed items: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin/clean-reddit")
async def clean_reddit_metadata():
    """Clean Reddit metadata from existing summaries."""
    try:
        clean_reddit_summaries()
        return JSONResponse({"message": "Reddit summaries cleaned successfully"})
    except Exception as e:
        logger.error(f"Error cleaning Reddit summaries: {e}")
        raise HTTPException(status_code=500, detail=str(e))

