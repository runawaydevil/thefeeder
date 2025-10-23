"""
FastAPI web server with Jinja2 templates.
Routes for listing articles, filtering by feed, and admin functions.
"""

from fastapi import FastAPI, Request, Query, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from typing import Optional, List
import os

from app.core.config import settings
from app.core.storage import storage
from app.core.scheduler import scheduler


# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="Minimalist RSS feed aggregator",
    version="2025.1.0"
)

# Setup templates and static files
templates = Jinja2Templates(directory="app/web/templates")
app.mount("/static", StaticFiles(directory="app/web/static"), name="static")


@app.on_event("startup")
async def startup_event():
    """Initialize scheduler on startup."""
    scheduler.start()


@app.on_event("shutdown")
async def shutdown_event():
    """Stop scheduler on shutdown."""
    scheduler.stop()


@app.get("/", response_class=HTMLResponse)
async def index(request: Request, page: int = Query(1, ge=1), 
                feed_id: Optional[str] = Query(None)):
    """Main page with paginated articles."""
    
    # Convert feed_id to int if provided
    feed_id_int = None
    if feed_id and feed_id.strip():
        try:
            feed_id_int = int(feed_id)
        except ValueError:
            feed_id_int = None
    
    # Get articles
    articles = storage.get_items(page=page, limit=20, feed_id=feed_id_int)
    total_items = storage.get_items_count(feed_id_int)
    total_pages = (total_items + 19) // 20  # Ceiling division
    
    # Get feeds for filter dropdown
    feeds = storage.get_feeds()
    
    # Calculate pagination
    prev_page = page - 1 if page > 1 else None
    next_page = page + 1 if page < total_pages else None
    
    # Calculate page numbers for numeric pagination
    page_numbers = []
    if total_pages > 0:
        # Show up to 5 page numbers around current page
        start_page = max(1, page - 2)
        end_page = min(total_pages, page + 2)
        
        # Adjust if we're near the beginning or end
        if end_page - start_page < 4:
            if start_page == 1:
                end_page = min(total_pages, start_page + 4)
            else:
                start_page = max(1, end_page - 4)
        
        page_numbers = list(range(start_page, end_page + 1))
    
    return templates.TemplateResponse("index.html", {
        "request": request,
        "app_name": settings.APP_NAME,
        "articles": articles,
        "feeds": feeds,
        "current_feed_id": feed_id_int,
        "current_page": page,
        "total_pages": total_pages,
        "prev_page": prev_page,
        "next_page": next_page,
        "total_items": total_items,
        "page_numbers": page_numbers
    })


@app.get("/admin/refresh")
async def refresh_feed(feed_id: Optional[int] = Query(None)):
    """Manually refresh a feed."""
    if feed_id:
        scheduler.refresh_feed(feed_id)
        return JSONResponse({"message": f"Refresh triggered for feed {feed_id}"})
    else:
        # Refresh all feeds
        feeds = storage.get_feeds()
        for feed in feeds:
            scheduler.refresh_feed(feed.id)
        return JSONResponse({"message": "Refresh triggered for all feeds"})


@app.get("/admin/health", response_class=HTMLResponse)
async def health_status(request: Request):
    """Get health status of feeds and scheduler."""
    feeds = storage.get_feeds(enabled_only=False)
    active_feeds = len([f for f in feeds if f.enabled])
    
    return templates.TemplateResponse("health.html", {
        "request": request,
        "app_name": settings.APP_NAME,
        "feeds": feeds,
        "active_feeds": active_feeds
    })


@app.get("/health")
async def health_check():
    """Simple health check endpoint."""
    return JSONResponse({
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": "2025.1.0"
    })


@app.get("/admin/feeds")
async def list_feeds():
    """List all configured feeds."""
    feeds = storage.get_feeds(enabled_only=False)
    return JSONResponse([{
        "id": feed.id,
        "name": feed.name,
        "url": feed.url,
        "enabled": feed.enabled,
        "interval_seconds": feed.interval_seconds,
        "last_fetch": feed.last_fetch_time.isoformat() if feed.last_fetch_time else None,
        "last_status": feed.last_fetch_status
    } for feed in feeds])


# Error handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    """Custom 404 page."""
    return templates.TemplateResponse("404.html", {
        "request": request,
        "app_name": settings.APP_NAME
    }, status_code=404)


@app.exception_handler(500)
async def internal_error_handler(request: Request, exc: HTTPException):
    """Custom 500 page."""
    return templates.TemplateResponse("500.html", {
        "request": request,
        "app_name": settings.APP_NAME
    }, status_code=500)
