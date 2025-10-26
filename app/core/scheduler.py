"""
APScheduler for feed fetching with custom intervals per feed,
jitter to avoid synchronization, and health monitoring.
"""

import logging
import random
import time
from typing import Any

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.core.config import settings
from app.core.fetcher import fetch_feed
from app.core.maintenance import run_maintenance
from app.core.metrics import record_fetch_metrics
from app.core.parser import parse_feed_content
from app.core.storage import storage

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FeedScheduler:
    """Scheduler for feed fetching with health monitoring."""

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.feed_jobs: dict[int, str] = {}  # feed_id -> job_id
        self.start_time = time.time()

    def start(self):
        """Start the scheduler."""
        logger.info("Starting feed scheduler...")

        # Initialize feeds from config
        self._initialize_feeds()

        # Schedule maintenance job (daily)
        self.scheduler.add_job(
            func=self._maintenance_job,
            trigger=IntervalTrigger(hours=24),
            id="maintenance",
            name="Database Maintenance",
            replace_existing=True
        )

        # Schedule TTL degradation check (hourly)
        self.scheduler.add_job(
            func=self._degradation_check_job,
            trigger=IntervalTrigger(hours=1),
            id="degradation_check",
            name="Feed Degradation Check",
            replace_existing=True
        )

        # Start scheduler
        self.scheduler.start()
        logger.info(f"Scheduler started with {len(self.feed_jobs)} feed jobs")

    def stop(self):
        """Stop the scheduler."""
        logger.info("Stopping feed scheduler...")
        self.scheduler.shutdown()

    def _initialize_feeds(self):
        """Initialize feeds from configuration."""
        feeds_config = settings.feeds

        for feed_config in feeds_config:
            try:
                # Add feed to database
                feed = storage.add_feed(
                    name=feed_config['name'],
                    url=feed_config['url'],
                    interval_seconds=feed_config.get('interval_seconds',
                                                   settings.DEFAULT_FETCH_INTERVAL_SECONDS)
                )

                # Schedule fetch job
                self._schedule_feed_job(feed)

                logger.info(f"Initialized feed: {feed.name} (ID: {feed.id})")

            except Exception as e:
                logger.error(f"Error initializing feed {feed_config.get('name', 'unknown')}: {e}")

    def _schedule_feed_job(self, feed):
        """Schedule a job for a specific feed."""
        if feed.id in self.feed_jobs:
            # Remove existing job
            self.scheduler.remove_job(self.feed_jobs[feed.id])

        # Add jitter to avoid synchronization (±10%)
        jitter = random.uniform(0.9, 1.1)
        interval_seconds = int(feed.interval_seconds * jitter)

        # Create job
        job_id = f"feed_{feed.id}"
        self.scheduler.add_job(
            func=self._fetch_feed_job,
            trigger=IntervalTrigger(seconds=interval_seconds),
            args=[feed.id],
            id=job_id,
            name=f"Fetch {feed.name}",
            max_instances=1,  # Prevent overlapping jobs
            replace_existing=True
        )

        self.feed_jobs[feed.id] = job_id

        # Schedule immediate fetch for new feeds
        self.scheduler.add_job(
            func=self._fetch_feed_job,
            trigger='date',
            args=[feed.id],
            id=f"immediate_{feed.id}",
            replace_existing=True
        )

    async def _fetch_feed_job(self, feed_id: int):
        """Job function to fetch a specific feed."""
        start_time = time.time()

        # Try to acquire lock
        if not storage.acquire_feed_lock(feed_id):
            logger.warning(f"Feed {feed_id} is already being fetched, skipping")
            return

        try:
            feed = storage.get_feed(feed_id)
            if not feed or not feed.enabled:
                logger.warning(f"Feed {feed_id} not found or disabled")
                return

            logger.info(f"Fetching feed: {feed.name}")

            # Apply adaptive backoff to interval
            effective_interval = int(feed.interval_seconds * feed.backoff_multiplier)
            if effective_interval != feed.interval_seconds:
                logger.info(f"Feed {feed.name}: Using adaptive backoff multiplier {feed.backoff_multiplier}x")

            # Fetch feed content
            result = await fetch_feed(
                feed.url,
                feed.last_etag,
                feed.last_modified
            )

            duration_ms = int((time.time() - start_time) * 1000)

            # Extract host for metrics
            try:
                parsed_url = httpx.URL(feed.url)
                host = parsed_url.host or "unknown"
            except Exception:
                host = "unknown"

            if result.is_not_modified:
                # No new content
                storage.update_feed_status(feed_id, "not_modified")
                storage.log_fetch(feed_id, 304, duration_ms=duration_ms)
                record_fetch_metrics(feed_id, host, 304, duration_ms, 0, 0)
                storage.update_adaptive_backoff(feed_id, success=True)
                logger.info(f"Feed {feed.name}: No new content (304)")

            elif result.is_success:
                # Parse content
                items = parse_feed_content(feed_id, result.content)

                if items:
                    # Save items to database
                    items_data = [item.to_dict() for item in items]
                    new_count = storage.add_items(items_data)

                    # Track latest published time for TTL
                    latest_published = max([item.published for item in items if item.published])
                    if latest_published:
                        storage.update_feed_published_time(feed_id, latest_published)

                    # Update feed status
                    storage.update_feed_status(
                        feed_id,
                        "success",
                        result.etag,
                        result.last_modified
                    )

                    # Log fetch
                    storage.log_fetch(
                        feed_id,
                        result.status,
                        len(items),
                        new_count,
                        duration_ms=duration_ms
                    )

                    # Record metrics
                    record_fetch_metrics(feed_id, host, result.status, duration_ms, len(items), new_count)
                    storage.update_adaptive_backoff(feed_id, success=True)

                    logger.info(f"Feed {feed.name}: {len(items)} items, {new_count} new")
                else:
                    storage.update_feed_status(feed_id, "no_items")
                    storage.log_fetch(feed_id, result.status, duration_ms=duration_ms)
                    record_fetch_metrics(feed_id, host, result.status, duration_ms, 0, 0)
                    storage.update_adaptive_backoff(feed_id, success=True)
                    logger.warning(f"Feed {feed.name}: No items found")

            else:
                # Error occurred
                storage.update_feed_status(feed_id, "error")
                storage.log_fetch(
                    feed_id,
                    result.status,
                    error_message=result.error,
                    duration_ms=duration_ms
                )
                record_fetch_metrics(feed_id, host, result.status, duration_ms, 0, 0)
                storage.update_adaptive_backoff(feed_id, success=False)
                logger.error(f"Feed {feed.name}: Error {result.status} - {result.error}")

        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            storage.update_feed_status(feed_id, "error")
            storage.log_fetch(feed_id, 0, error_message=str(e), duration_ms=duration_ms)
            storage.update_adaptive_backoff(feed_id, success=False)

            # Record error metric
            try:
                feed = storage.get_feed(feed_id)
                if feed:
                    parsed_url = httpx.URL(feed.url)
                    host = parsed_url.host or "unknown"
                else:
                    host = "unknown"
            except Exception:
                host = "unknown"
            record_fetch_metrics(feed_id, host, 0, duration_ms, 0, 0)

            logger.error(f"Error fetching feed {feed_id}: {e}")

        finally:
            # Always release lock
            storage.release_feed_lock(feed_id)

    def refresh_feed(self, feed_id: int):
        """Manually trigger a feed refresh."""
        if feed_id in self.feed_jobs:
            self.scheduler.add_job(
                func=self._fetch_feed_job,
                trigger='date',
                args=[feed_id],
                id=f"manual_{feed_id}_{int(time.time())}",
                replace_existing=True
            )
            logger.info(f"Manual refresh triggered for feed {feed_id}")

    def _maintenance_job(self):
        """Periodic maintenance job."""
        logger.info("Running periodic maintenance...")
        try:
            run_maintenance()
            # Mark old items as not new
            storage.mark_old_items_as_read(age_hours=1)
            logger.info("Maintenance completed successfully")
        except Exception as e:
            logger.error(f"Error during maintenance: {e}")

    def _degradation_check_job(self):
        """Check and degrade feeds that haven't published recently."""
        logger.info("Checking feed degradation...")
        try:
            degraded_count = storage.check_and_degrade_feeds(ttl_hours=24)
            if degraded_count > 0:
                logger.info(f"Degraded {degraded_count} feeds")
        except Exception as e:
            logger.error(f"Error during degradation check: {e}")

    def get_scheduler_status(self) -> dict[str, Any]:
        """Get scheduler status and statistics."""
        jobs = self.scheduler.get_jobs()

        return {
            'running': self.scheduler.running,
            'job_count': len(jobs),
            'uptime_seconds': time.time() - self.start_time,
            'jobs': [
                {
                    'id': job.id,
                    'name': job.name,
                    'next_run': job.next_run_time.isoformat() if job.next_run_time else None
                }
                for job in jobs
            ]
        }


# Global scheduler instance
scheduler = FeedScheduler()
