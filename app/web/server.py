"""
FastAPI web server with Jinja2 templates.
Routes for listing articles, filtering by feed, and admin functions.
"""

import logging
from datetime import datetime
from zoneinfo import ZoneInfo

import httpx
from fastapi import Request
from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

from app import __version__
from app.api import admin as admin_routes
from app.api import auth as auth_routes
from app.api import collections as collections_routes
from app.api import public as public_routes
from app.api import routes as api_routes
from app.api import subscriptions as subscriptions_routes
from app.core.auth import verify_admin
from app.core.config import settings
from app.core.fetcher import detect_feed_in_html, fetch_with_backoff
from app.core.maintenance import get_db_stats, run_maintenance
from app.core.metrics import metrics
from app.core.opml import generate_opml, parse_opml
from app.core.scheduler import scheduler
from app.core.storage import storage
from app.core.websub import verify_websub_challenge


# Middleware for security headers
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        # Content Security Policy
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self'; "
            "frame-ancestors 'none';"
        )
        response.headers["Content-Security-Policy"] = csp

        # Cross-Origin policies
        response.headers["Cross-Origin-Embedder-Policy"] = "require-corp"
        response.headers["Cross-Origin-Resource-Policy"] = "cross-origin"

        # Static files caching
        if request.url.path.startswith("/static/"):
            response.headers["Cache-Control"] = "public, max-age=3600"

        return response


# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="Minimalist RSS feed aggregator",
    version=__version__
)

# Add CORS middleware (before security headers)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative dev port
        settings.APP_BASE_URL,  # Production frontend (from env)
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Add security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# Setup templates and static files
templates = Jinja2Templates(directory="app/web/templates")
app.mount("/static", StaticFiles(directory="app/web/static"), name="static")

# Register API routes
app.include_router(api_routes.router, prefix="/api", tags=["api"])
app.include_router(auth_routes.router, tags=["auth"])
app.include_router(subscriptions_routes.router, tags=["subscriptions"])
app.include_router(collections_routes.router, tags=["collections"])
app.include_router(public_routes.router, tags=["public"])
app.include_router(admin_routes.router)


@app.on_event("startup")
async def startup_event():
    """Initialize scheduler on startup."""
    scheduler.start()


@app.on_event("shutdown")
async def shutdown_event():
    """Stop scheduler on shutdown."""
    scheduler.stop()


@app.get("/", response_class=HTMLResponse)
async def index():
    """Redirect to admin or return simple API info."""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/admin/health")


@app.get("/admin/refresh")
async def refresh_feed(feed_id: int | None = Query(None), admin: str = Depends(verify_admin)):
    """Manually refresh a feed."""
    # Validate feed_id to prevent injection
    if feed_id:
        # Ensure feed_id is positive integer
        if feed_id < 1:
            raise HTTPException(status_code=400, detail="Invalid feed ID")
        # Check if feed exists
        feed = storage.get_feed(feed_id)
        if not feed:
            raise HTTPException(status_code=404, detail="Feed not found")
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

    # Get detailed statistics
    db_stats = get_db_stats()
    scheduler_status = scheduler.get_scheduler_status()

    # Calculate feed health metrics
    healthy_feeds = len([f for f in feeds if f.last_fetch_status == "success"])
    error_feeds = len([f for f in feeds if f.last_fetch_status == "error"])
    degraded_feeds = len([f for f in feeds if f.degraded])

    return templates.TemplateResponse("health.html", {
        "request": request,
        "app_name": settings.APP_NAME,
        "version": __version__,
        "feeds": feeds,
        "active_feeds": active_feeds,
        "healthy_feeds": healthy_feeds,
        "error_feeds": error_feeds,
        "degraded_feeds": degraded_feeds,
        "db_stats": db_stats,
        "scheduler_status": scheduler_status
    })


@app.get("/health")
async def health_check():
    """Simple health check endpoint."""
    return JSONResponse({
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": __version__
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


@app.get("/metrics")
async def prometheus_metrics():
    """Prometheus metrics endpoint."""
    # Update scheduler queue depth metric
    scheduler_status = scheduler.get_scheduler_status()
    metrics.set_gauge("feeder_scheduler_queue_depth", scheduler_status['job_count'])

    # Update uptime gauge
    metrics.set_gauge("feeder_uptime_seconds", scheduler_status['uptime_seconds'])

    # Add database stats
    db_stats = get_db_stats()
    metrics.set_gauge("feeder_db_size_bytes", db_stats.get('db_size_bytes', 0))
    metrics.set_gauge("feeder_total_feeds", db_stats.get('total_feeds', 0))
    metrics.set_gauge("feeder_total_items", db_stats.get('total_items', 0))

    # Export in Prometheus format
    return Response(
        content=metrics.get_prometheus_format(),
        media_type="text/plain; version=0.0.4"
    )


@app.post("/admin/migrate")
async def run_migration(admin: str = Depends(verify_admin)):
    """Run single-user to multi-user migration."""
    try:
        from app.core.migrations import migrate_to_multiuser
        result = migrate_to_multiuser()
        return JSONResponse(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Migration failed: {str(e)}")


@app.post("/admin/maintenance")
async def trigger_maintenance(admin: str = Depends(verify_admin)):
    """Trigger manual database maintenance."""
    try:
        run_maintenance()
        return JSONResponse({"message": "Maintenance completed successfully"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during maintenance: {str(e)}")


@app.get("/admin/stats")
async def get_stats():
    """Get database and system statistics."""
    try:
        db_stats = get_db_stats()
        scheduler_status = scheduler.get_scheduler_status()

        return JSONResponse({
            "database": db_stats,
            "scheduler": scheduler_status,
            "timestamp": datetime.now(ZoneInfo('UTC')).isoformat()
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting stats: {str(e)}")


@app.get("/websub/callback")
async def websub_callback(request: Request):
    """WebSub callback endpoint for real-time updates."""
    # Handle verification challenge
    mode = request.query_params.get('hub.mode')
    topic = request.query_params.get('hub.topic')
    challenge = request.query_params.get('hub.challenge')
    lease_seconds = request.query_params.get('hub.lease_seconds')

    if mode == 'subscribe' and challenge:
        try:
            # Verify the subscription
            verify_websub_challenge(
                mode=mode,
                topic=topic,
                challenge=challenge,
                lease_seconds=int(lease_seconds) if lease_seconds else None
            )

            # Return challenge
            return Response(content=challenge, media_type="text/plain")
        except Exception as e:
            logger.error(f"WebSub verification error: {e}")
            raise HTTPException(status_code=400, detail="Verification failed")

    # Handle unsubscription
    if mode == 'unsubscribe':
        return Response(content="OK", media_type="text/plain")

    raise HTTPException(status_code=400, detail="Invalid request")


@app.post("/websub/callback")
async def websub_notification(request: Request):
    """Handle WebSub notification (feed update)."""
    try:
        # Get topic (feed URL) from headers
        topic = request.headers.get('X-Hub-Topic')

        if not topic:
            # Try to get from request body or headers
            topic = request.headers.get('Link', '').split('>')[0].replace('<', '')

        if topic:
            # Find feed by URL and trigger refresh
            feeds = storage.get_feeds(enabled_only=False)
            for feed in feeds:
                if feed.url == topic:
                    logger.info(f"WebSub notification received for feed {feed.name}")
                    scheduler.refresh_feed(feed.id)
                    break

        return Response(content="OK", media_type="text/plain")

    except Exception as e:
        logger.error(f"WebSub notification error: {e}")
        raise HTTPException(status_code=500, detail="Notification processing failed")


@app.post("/admin/opml/import")
async def import_opml(file: UploadFile = File(...), admin: str = Depends(verify_admin)):
    """Import feeds from OPML file."""
    try:
        # Read file content
        content = await file.read()
        opml_content = content.decode('utf-8')

        # Parse OPML
        feeds = parse_opml(opml_content)

        # Add feeds to database
        imported = []
        for feed_config in feeds:
            feed = storage.add_feed(
                name=feed_config['name'],
                url=feed_config['url'],
                interval_seconds=feed_config.get('interval_seconds', settings.DEFAULT_FETCH_INTERVAL_SECONDS)
            )
            imported.append({
                'id': feed.id,
                'name': feed.name,
                'url': feed.url
            })

        return JSONResponse({
            "message": f"Imported {len(imported)} feeds",
            "feeds": imported
        })

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error importing OPML: {str(e)}")


@app.get("/admin/opml/export")
async def export_opml(admin: str = Depends(verify_admin)):
    """Export all feeds as OPML file."""
    try:
        feeds = storage.get_feeds(enabled_only=False)

        # Convert to OPML format
        feeds_data = [{
            'name': feed.name,
            'url': feed.url
        } for feed in feeds]

        opml_content = generate_opml(feeds_data)

        return Response(
            content=opml_content,
            media_type="application/xml",
            headers={
                "Content-Disposition": f"attachment; filename=pablo-feeds-{datetime.now().strftime('%Y%m%d')}.opml"
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting OPML: {str(e)}")


@app.get("/admin/discover")
async def discover_feed(url: str = Query(..., description="URL to discover feed from")):
    """Discover RSS feed from a website URL."""
    try:
        # Validate URL
        if not url.startswith(('http://', 'https://')):
            raise HTTPException(status_code=400, detail="Invalid URL")

        # Try to fetch the URL
        result = await fetch_with_backoff(url)

        if not result.is_success:
            raise HTTPException(status_code=result.status, detail=f"Failed to fetch URL: {result.error}")

        # Try to detect feed in HTML
        feed_url = detect_feed_in_html(result.content)

        if feed_url:
            # Handle relative URLs
            if feed_url.startswith('/'):
                from urllib.parse import urljoin
                feed_url = urljoin(url, feed_url)

            return JSONResponse({
                "feed_url": feed_url,
                "discovered": True
            })
        else:
            return JSONResponse({
                "feed_url": None,
                "discovered": False,
                "message": "No RSS feed found in HTML"
            })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error discovering feed: {str(e)}")


@app.get("/proxy/image")
async def proxy_image(url: str = Query(..., description="Image URL to proxy")):
    """Proxy images with timeout to prevent hanging."""
    try:
        # Validate URL
        if not url.startswith(('http://', 'https://')):
            raise HTTPException(status_code=400, detail="Invalid URL")

        # Fetch image with short timeout
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(url)

            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch image")

            # Get content type
            content_type = response.headers.get("Content-Type", "image/jpeg")

            # Return proxied image
            return Response(
                content=response.content,
                media_type=content_type,
                headers={
                    "Cache-Control": "public, max-age=86400",  # Cache for 1 day
                    "X-Content-Type-Options": "nosniff"
                }
            )

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Image fetch timeout")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch image: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error proxying image: {str(e)}")


# Error handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    """Custom 404 page."""
    return templates.TemplateResponse("404.html", {
        "request": request,
        "app_name": settings.APP_NAME,
        "version": __version__
    }, status_code=404)


@app.exception_handler(500)
async def internal_error_handler(request: Request, exc: HTTPException):
    """Custom 500 page."""
    return templates.TemplateResponse("500.html", {
        "request": request,
        "app_name": settings.APP_NAME,
        "version": __version__
    }, status_code=500)
