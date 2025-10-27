"""
Diagnostic endpoints for troubleshooting feed issues.
"""

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from app.core.storage import storage

router = APIRouter(tags=["diagnostics"])


@router.get("/admin/feeds-status")
async def get_all_feeds_status():
    """Get detailed status of all feeds."""
    feeds = storage.get_feeds(enabled_only=False)
    
    from datetime import datetime
    from zoneinfo import ZoneInfo
    
    now = datetime.now(ZoneInfo('UTC'))
    
    status_list = []
    for feed in feeds:
        hours_since_fetch = None
        if feed.last_fetch_time:
            hours_since_fetch = (now - feed.last_fetch_time).total_seconds() / 3600
        
        # Get latest items
        items = storage.get_items(page=1, limit=1, feed_id=feed.id)
        
        status_list.append({
            "id": feed.id,
            "name": feed.name,
            "url": feed.url,
            "enabled": feed.enabled,
            "status": feed.last_fetch_status,
            "degraded": feed.degraded,
            "hours_since_fetch": round(hours_since_fetch, 2) if hours_since_fetch else None,
            "last_fetch_time": feed.last_fetch_time.isoformat() if feed.last_fetch_time else None,
            "consecutive_errors": feed.consecutive_errors,
            "backoff_multiplier": feed.backoff_multiplier,
            "last_published_time": feed.last_published_time.isoformat() if feed.last_published_time else None,
            "has_items": len(items) > 0,
        })
    
    # Sort by hours_since_fetch (oldest first)
    status_list.sort(key=lambda x: x["hours_since_fetch"] if x["hours_since_fetch"] is not None else float('inf'))
    
    return JSONResponse({
        "feeds": status_list,
        "total": len(status_list),
        "enabled": len([f for f in status_list if f["enabled"]]),
        "degraded": len([f for f in status_list if f["degraded"]]),
        "with_errors": len([f for f in status_list if f["consecutive_errors"] > 0]),
    })

