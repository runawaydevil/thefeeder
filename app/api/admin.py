"""
Admin endpoints with RBAC for multi-user Pablo Feeds.
"""

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from zoneinfo import ZoneInfo

from app.core.auth_jwt import require_role
from app.core.models import User
from app.core.storage import storage

router = APIRouter(tags=["admin"])


@router.get("/admin/users")
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    user: User = Depends(require_role("admin"))
):
    """List all users (admin only)."""
    users = storage.get_users(page, limit)
    return {
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "display_name": u.display_name,
                "handle": u.handle,
                "role": u.role,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat() if u.created_at else None
            }
            for u in users
        ],
        "pagination": {"page": page, "limit": limit}
    }


@router.patch("/admin/users/{user_id}")
async def update_user_role(
    user_id: int,
    role: str = Query(...),
    user: User = Depends(require_role("admin"))
):
    """Update user role (admin only)."""
    storage.update_user(user_id, {"role": role})
    return {"message": "User role updated"}


@router.delete("/admin/users/{user_id}")
async def delete_user(
    user_id: int,
    user: User = Depends(require_role("admin"))
):
    """Delete a user (admin only)."""
    storage.update_user(user_id, {"is_active": False})
    return {"message": "User deactivated"}


@router.get("/admin/feeds/{feed_id}/diagnostics")
async def get_feed_diagnostics(
    feed_id: int,
    user: User = Depends(require_role("admin"))
):
    """Get detailed diagnostics for a specific feed."""
    feed = storage.get_feed(feed_id)
    
    if not feed:
        return JSONResponse({"error": "Feed not found"}, status_code=404)
    
    # Get latest items for this feed
    items = storage.get_items(page=1, limit=5, feed_id=feed_id)
    
    # Get latest fetch log
    from app.core.storage import FetchLog
    with storage.get_session() as session:
        from sqlmodel import select
        latest_log = session.exec(
            select(FetchLog)
            .where(FetchLog.feed_id == feed_id)
            .order_by(FetchLog.fetch_time.desc())
            .limit(1)
        ).first()
    
    # Calculate time since last fetch
    hours_since_fetch = None
    if feed.last_fetch_time:
        hours_since_fetch = (datetime.now(ZoneInfo('UTC')) - feed.last_fetch_time).total_seconds() / 3600
    
    return JSONResponse({
        "feed": {
            "id": feed.id,
            "name": feed.name,
            "url": feed.url,
            "enabled": feed.enabled,
            "interval_seconds": feed.interval_seconds,
            "last_fetch_time": feed.last_fetch_time.isoformat() if feed.last_fetch_time else None,
            "last_fetch_status": feed.last_fetch_status,
            "degraded": feed.degraded,
            "hours_since_fetch": round(hours_since_fetch, 2) if hours_since_fetch else None,
            "consecutive_errors": feed.consecutive_errors,
            "backoff_multiplier": feed.backoff_multiplier,
            "last_published_time": feed.last_published_time.isoformat() if feed.last_published_time else None,
        },
        "latest_items": [
            {
                "id": item["id"],
                "title": item["title"],
                "published": item["published"],
                "is_new": item["is_new"]
            }
            for item in items
        ] if items else [],
        "latest_fetch": {
            "status_code": latest_log.status_code,
            "items_found": latest_log.items_found,
            "items_new": latest_log.items_new,
            "error_message": latest_log.error_message,
            "fetch_time": latest_log.fetch_time.isoformat() if latest_log.fetch_time else None,
            "duration_ms": latest_log.duration_ms
        } if latest_log else None
    })


@router.post("/admin/feeds/{feed_id}/force-refresh")
async def force_refresh_feed(
    feed_id: int,
    bypass_cache: bool = Query(True),
    user: User = Depends(require_role("admin"))
):
    """Force refresh a feed, optionally bypassing cache."""
    feed = storage.get_feed(feed_id)
    
    if not feed:
        return JSONResponse({"error": "Feed not found"}, status_code=404)
    
    if bypass_cache:
        # Clear cache headers
        storage.update_feed_status(feed_id, "pending", etag="", last_modified="")
    
    # Trigger refresh
    from app.core.scheduler import scheduler
    scheduler.refresh_feed(feed_id)
    
    return JSONResponse({
        "message": "Feed refresh triggered",
        "feed_name": feed.name,
        "bypass_cache": bypass_cache
    })

