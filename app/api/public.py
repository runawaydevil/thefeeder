"""
Public profile endpoints for Pablo Feeds.
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response, HTMLResponse
from app.core.storage import storage
from app.core.theming import get_user_theme_css
import json

router = APIRouter(tags=["public"])


@router.get("/public/@{handle}")
async def public_profile(handle: str):
    """Get public profile page for a user."""
    user = storage.get_user_by_handle(handle)
    if not user:
        raise HTTPException(404, "User not found")
    
    # Get public subscriptions
    subscriptions = storage.get_public_subscriptions(user.id)
    
    # Get recent items from public feeds
    items = storage.get_public_user_items(user.id, limit=20)
    
    # Get collections
    collections = storage.get_public_collections(user.id)
    
    return {
        "user": {
            "handle": user.handle,
            "display_name": user.display_name,
            "bio": user.bio,
            "avatar_url": user.avatar_url
        },
        "subscriptions": subscriptions,
        "recent_items": items,
        "collections": collections
    }


@router.get("/public/@{handle}/theme.css")
async def public_theme_css(handle: str):
    """Get user's custom theme CSS."""
    user = storage.get_user_by_handle(handle)
    if not user:
        raise HTTPException(404, "User not found")
    
    css = get_user_theme_css(user.id)
    return Response(content=css, media_type="text/css")


@router.get("/public/@{handle}/rss")
async def public_user_rss(handle: str):
    """Generate RSS feed for user's public subscriptions."""
    user = storage.get_user_by_handle(handle)
    if not user:
        raise HTTPException(404, "User not found")
    
    items = storage.get_public_user_items(user.id, limit=50)
    
    # Generate RSS XML (simplified)
    rss_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>{user.display_name}'s Feed</title>
  <link>https://feeder.1208.pro/public/@{handle}</link>
  <description>{user.bio or 'Pablo Feeds user feed'}</description>
  <language>pt-BR</language>
"""
    
    for item in items:
        pub_date = item['published'].strftime('%a, %d %b %Y %H:%M:%S +0000') if item.get('published') else ''
        rss_xml += f"""  <item>
    <title>{item['title']}</title>
    <link>{item['link']}</link>
    <guid>{item['id']}</guid>
    <pubDate>{pub_date}</pubDate>
  </item>
"""
    
    rss_xml += "</channel>\n</rss>"
    
    return Response(content=rss_xml, media_type="application/rss+xml")


@router.get("/public/@{handle}/c/{slug}")
async def public_collection(handle: str, slug: str):
    """Get public collection page."""
    user = storage.get_user_by_handle(handle)
    if not user:
        raise HTTPException(404, "User not found")
    
    collection = storage.get_public_collection(user.id, slug)
    if not collection:
        raise HTTPException(404, "Collection not found")
    
    items = storage.get_collection_items(collection.id)
    
    return {
        "collection": {
            "title": collection.title,
            "description": collection.description,
            "slug": collection.slug
        },
        "items": items
    }

