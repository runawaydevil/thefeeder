"""
Subscription management endpoints for multi-user Pablo Feeds.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from app.core.auth_jwt import get_current_user
from app.core.models import User
from app.core.storage import storage
from app.core.scheduler import scheduler

router = APIRouter(prefix="/api/me/subscriptions", tags=["subscriptions"])


class SubscriptionResponse:
    id: int
    feed_id: int
    is_public: bool
    priority: int


@router.get("")
async def get_my_subscriptions(user: User = Depends(get_current_user)):
    """Get all subscriptions for current user."""
    subscriptions = storage.get_user_subscriptions(user.id)
    
    # Enrich with feed info
    enriched = []
    for sub in subscriptions:
        feed = storage.get_feed(sub['feed_id'])
        if feed:
            enriched.append({
                **sub,
                'feed': {
                    'id': feed.id,
                    'name': feed.name,
                    'url': feed.url
                }
            })
        else:
            enriched.append(sub)
    
    return enriched


@router.post("")
async def subscribe_to_feed(
    feed_id: Optional[int] = Query(None),
    url: Optional[str] = Query(None),
    user: User = Depends(get_current_user)
):
    """Subscribe to a feed. Can provide feed_id or url."""
    if not feed_id and not url:
        raise HTTPException(400, "Either feed_id or url must be provided")
    
    # If URL provided, create feed global if doesn't exist
    if url and not feed_id:
        feed = storage.get_feed_by_url(url)
        if not feed:
            # Create new feed
            feed = storage.add_feed(
                name=url,  # Will be updated after first fetch
                url=url,
                interval_seconds=600
            )
            # Schedule fetch job
            if scheduler:
                scheduler.schedule_feed_job(feed)
        
        feed_id = feed.id
    
    # Create subscription
    subscription = storage.create_subscription(user.id, feed_id)
    
    return {"message": "Subscribed", "subscription": subscription}


@router.patch("/{subscription_id}")
async def update_subscription(
    subscription_id: int,
    is_public: Optional[bool] = Query(None),
    priority: Optional[int] = Query(None),
    user: User = Depends(get_current_user)
):
    """Update subscription settings."""
    data = {}
    if is_public is not None:
        data['is_public'] = is_public
    if priority is not None:
        data['priority'] = priority
    
    storage.update_subscription(subscription_id, user.id, data)
    return {"message": "Subscription updated"}


@router.delete("/{subscription_id}")
async def unsubscribe(subscription_id: int, user: User = Depends(get_current_user)):
    """Unsubscribe from a feed."""
    storage.delete_subscription(subscription_id, user.id)
    return {"message": "Unsubscribed"}

