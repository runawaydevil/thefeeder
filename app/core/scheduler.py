"""
APScheduler for feed fetching with custom intervals per feed,
jitter to avoid synchronization, and health monitoring.
"""

import asyncio
import random
import time
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from typing import Dict, Any
import logging

from app.core.config import settings
from app.core.storage import storage
from app.core.fetcher import fetch_feed
from app.core.parser import parse_feed_content


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FeedScheduler:
    """Scheduler for feed fetching with health monitoring."""
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.feed_jobs: Dict[int, str] = {}  # feed_id -> job_id
        self.start_time = time.time()
    
    def start(self):
        """Start the scheduler."""
        logger.info("Starting feed scheduler...")
        
        # Initialize feeds from config
        self._initialize_feeds()
        
        # Start scheduler
        self.scheduler.start()
        logger.info(f"Scheduler started with {len(self.feed_jobs)} jobs")
    
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
        
        try:
            feed = storage.get_feed(feed_id)
            if not feed or not feed.enabled:
                logger.warning(f"Feed {feed_id} not found or disabled")
                return
            
            logger.info(f"Fetching feed: {feed.name}")
            
            # Fetch feed content
            result = await fetch_feed(
                feed.url,
                feed.last_etag,
                feed.last_modified
            )
            
            duration_ms = int((time.time() - start_time) * 1000)
            
            if result.is_not_modified:
                # No new content
                storage.update_feed_status(feed_id, "not_modified")
                storage.log_fetch(feed_id, 304, duration_ms=duration_ms)
                logger.info(f"Feed {feed.name}: No new content (304)")
                
            elif result.is_success:
                # Parse content
                items = parse_feed_content(feed_id, result.content)
                
                if items:
                    # Save items to database
                    items_data = [item.to_dict() for item in items]
                    new_count = storage.add_items(items_data)
                    
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
                    
                    logger.info(f"Feed {feed.name}: {len(items)} items, {new_count} new")
                else:
                    storage.update_feed_status(feed_id, "no_items")
                    storage.log_fetch(feed_id, result.status, duration_ms=duration_ms)
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
                logger.error(f"Feed {feed.name}: Error {result.status} - {result.error}")
        
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            storage.update_feed_status(feed_id, "error")
            storage.log_fetch(feed_id, 0, error_message=str(e), duration_ms=duration_ms)
            logger.error(f"Error fetching feed {feed_id}: {e}")
    
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
    
    def get_scheduler_status(self) -> Dict[str, Any]:
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
