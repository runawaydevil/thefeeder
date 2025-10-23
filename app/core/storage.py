"""
SQLModel + SQLite storage with tables for feeds, items, and fetch logs.
Includes deduplication, pagination, and statistics.
"""

from sqlmodel import SQLModel, Field, create_engine, Session, select
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
from app.core.config import settings


class Feed(SQLModel, table=True):
    """Feed configuration and metadata."""
    
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    url: str = Field(index=True)
    interval_seconds: int = Field(default=600)
    enabled: bool = Field(default=True)
    last_etag: str = Field(default="")
    last_modified: str = Field(default="")
    last_fetch_status: str = Field(default="pending")
    last_fetch_time: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Item(SQLModel, table=True):
    """Feed item/article."""
    
    id: Optional[int] = Field(default=None, primary_key=True)
    feed_id: int = Field(foreign_key="feed.id", index=True)
    title: str = Field(index=True)
    link: str = Field(index=True)
    published: Optional[datetime] = Field(default=None, index=True)
    author: str = Field(default="")
    summary: str = Field(default="")
    guid: str = Field(index=True)  # For deduplication
    thumbnail: str = Field(default="")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class FetchLog(SQLModel, table=True):
    """Log of fetch operations for monitoring."""
    
    id: Optional[int] = Field(default=None, primary_key=True)
    feed_id: int = Field(foreign_key="feed.id", index=True)
    status_code: int
    items_found: int = Field(default=0)
    items_new: int = Field(default=0)
    error_message: str = Field(default="")
    fetch_time: datetime = Field(default_factory=datetime.utcnow)
    duration_ms: int = Field(default=0)


class Storage:
    """Database operations for feeds and items."""
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or settings.DB_PATH
        self.engine = create_engine(f"sqlite:///{self.db_path}")
        self._create_tables()
    
    def _create_tables(self):
        """Create database tables."""
        SQLModel.metadata.create_all(self.engine)
    
    def get_session(self) -> Session:
        """Get database session."""
        return Session(self.engine)
    
    # Feed operations
    def add_feed(self, name: str, url: str, interval_seconds: int = 600) -> Feed:
        """Add a new feed or return existing one."""
        with self.get_session() as session:
            # Check if feed already exists by URL
            existing = session.exec(
                select(Feed).where(Feed.url == url)
            ).first()
            
            if existing:
                # Feed exists, update interval if changed
                if existing.interval_seconds != interval_seconds:
                    existing.interval_seconds = interval_seconds
                    session.commit()
                return existing
            
            # Create new feed
            feed = Feed(
                name=name,
                url=url,
                interval_seconds=interval_seconds
            )
            session.add(feed)
            session.commit()
            session.refresh(feed)
            return feed
    
    def get_feeds(self, enabled_only: bool = True) -> List[Feed]:
        """Get all feeds."""
        with self.get_session() as session:
            query = select(Feed)
            if enabled_only:
                query = query.where(Feed.enabled == True)
            return session.exec(query).all()
    
    def get_feed(self, feed_id: int) -> Optional[Feed]:
        """Get feed by ID."""
        with self.get_session() as session:
            return session.get(Feed, feed_id)
    
    def update_feed_status(self, feed_id: int, status: str, etag: str = "", 
                          last_modified: str = ""):
        """Update feed fetch status and cache headers."""
        with self.get_session() as session:
            feed = session.get(Feed, feed_id)
            if feed:
                feed.last_fetch_status = status
                feed.last_fetch_time = datetime.utcnow()
                if etag:
                    feed.last_etag = etag
                if last_modified:
                    feed.last_modified = last_modified
                session.commit()
    
    # Item operations
    def add_items(self, items: List[Dict[str, Any]]) -> int:
        """Add items with deduplication. Returns count of new items."""
        new_count = 0
        
        with self.get_session() as session:
            for item_data in items:
                # Check for existing item by guid
                existing = session.exec(
                    select(Item).where(Item.guid == item_data['guid'])
                ).first()
                
                if not existing:
                    item = Item(**item_data)
                    session.add(item)
                    new_count += 1
            
            session.commit()
            return new_count
    
    def get_items(self, page: int = 1, limit: int = 20, 
                 feed_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get paginated items with feed info."""
        offset = (page - 1) * limit
        
        with self.get_session() as session:
            query = select(Item, Feed.name).join(Feed)
            
            if feed_id:
                query = query.where(Item.feed_id == feed_id)
            
            query = query.order_by(Item.published.desc()).offset(offset).limit(limit)
            
            results = session.exec(query).all()
            
            items = []
            for item, feed_name in results:
                items.append({
                    'id': item.id,
                    'title': item.title,
                    'link': item.link,
                    'published': item.published,
                    'author': item.author,
                    'summary': item.summary,
                    'thumbnail': item.thumbnail,
                    'feed_name': feed_name,
                    'feed_id': item.feed_id
                })
            
            return items
    
    def get_items_count(self, feed_id: Optional[int] = None) -> int:
        """Get total count of items."""
        with self.get_session() as session:
            query = select(Item)
            if feed_id:
                query = query.where(Item.feed_id == feed_id)
            return len(session.exec(query).all())
    
    # Statistics
    def get_feed_stats(self) -> List[Dict[str, Any]]:
        """Get statistics for all feeds."""
        with self.get_session() as session:
            feeds = session.exec(select(Feed)).all()
            stats = []
            
            for feed in feeds:
                item_count = len(session.exec(
                    select(Item).where(Item.feed_id == feed.id)
                ).all())
                
                last_log = session.exec(
                    select(FetchLog)
                    .where(FetchLog.feed_id == feed.id)
                    .order_by(FetchLog.fetch_time.desc())
                    .limit(1)
                ).first()
                
                stats.append({
                    'feed_id': feed.id,
                    'name': feed.name,
                    'url': feed.url,
                    'enabled': feed.enabled,
                    'item_count': item_count,
                    'last_fetch': feed.last_fetch_time.isoformat() if feed.last_fetch_time else None,
                    'last_status': feed.last_fetch_status,
                    'last_log': {
                        'status_code': last_log.status_code,
                        'items_found': last_log.items_found,
                        'items_new': last_log.items_new,
                        'error_message': last_log.error_message,
                        'fetch_time': last_log.fetch_time.isoformat() if last_log.fetch_time else None,
                        'duration_ms': last_log.duration_ms
                    } if last_log else None
                })
            
            return stats
    
    # Logging
    def log_fetch(self, feed_id: int, status_code: int, items_found: int = 0,
                 items_new: int = 0, error_message: str = "", duration_ms: int = 0):
        """Log a fetch operation."""
        with self.get_session() as session:
            log = FetchLog(
                feed_id=feed_id,
                status_code=status_code,
                items_found=items_found,
                items_new=items_new,
                error_message=error_message,
                duration_ms=duration_ms
            )
            session.add(log)
            session.commit()


# Global storage instance
storage = Storage()
