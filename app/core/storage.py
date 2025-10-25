"""
SQLModel + SQLite storage with tables for feeds, items, and fetch logs.
Includes deduplication, pagination, and statistics.
"""

from sqlmodel import SQLModel, Field, create_engine, Session, select, text
from typing import List, Optional, Dict, Any
from datetime import datetime
from zoneinfo import ZoneInfo
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


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
    created_at: datetime = Field(default_factory=lambda: datetime.now(ZoneInfo('UTC')))
    
    # Concurrency and adaptive backoff
    is_fetching: bool = Field(default=False)
    consecutive_errors: int = Field(default=0)
    backoff_multiplier: float = Field(default=1.0)
    
    # TTL and degradation
    last_published_time: Optional[datetime] = Field(default=None)
    degraded: bool = Field(default=False)


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
    created_at: datetime = Field(default_factory=lambda: datetime.now(ZoneInfo('UTC')))
    is_new: bool = Field(default=True)  # Mark as new (< 1 hour)


class FetchLog(SQLModel, table=True):
    """Log of fetch operations for monitoring."""
    
    id: Optional[int] = Field(default=None, primary_key=True)
    feed_id: int = Field(foreign_key="feed.id", index=True)
    status_code: int
    items_found: int = Field(default=0)
    items_new: int = Field(default=0)
    error_message: str = Field(default="")
    fetch_time: datetime = Field(default_factory=lambda: datetime.now(ZoneInfo('UTC')))
    duration_ms: int = Field(default=0)


class Storage:
    """Database operations for feeds and items."""
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or settings.DB_PATH
        self.engine = create_engine(f"sqlite:///{self.db_path}")
        self._configure_sqlite()
        self._create_tables()
    
    def _configure_sqlite(self):
        """Configure SQLite pragmas for optimal performance."""
        with self.engine.connect() as conn:
            # Enable WAL mode for better concurrency
            conn.execute(text("PRAGMA journal_mode=WAL"))
            # Normal synchronous mode (balance between safety and performance)
            conn.execute(text("PRAGMA synchronous=NORMAL"))
            # Enable foreign keys
            conn.execute(text("PRAGMA foreign_keys=ON"))
            # Store temporary tables in memory
            conn.execute(text("PRAGMA temp_store=MEMORY"))
            conn.commit()
            logger.info("SQLite pragmas configured: WAL, synchronous=NORMAL, foreign_keys=ON, temp_store=MEMORY")
    
    def _create_tables(self):
        """Create database tables."""
        SQLModel.metadata.create_all(self.engine)
        self._create_fts5_index()
    
    def _create_fts5_index(self):
        """Create FTS5 virtual table for full-text search."""
        with self.engine.connect() as conn:
            # Check if FTS5 table already exists
            result = conn.execute(text("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='item_fts'
            """))
            
            if result.fetchone() is None:
                # Create FTS5 virtual table
                conn.execute(text("""
                    CREATE VIRTUAL TABLE item_fts USING fts5(
                        title, summary, author, 
                        content='item', 
                        content_rowid='id'
                    )
                """))
                
                # Populate with existing data
                conn.execute(text("""
                    INSERT INTO item_fts(rowid, title, summary, author)
                    SELECT id, title, summary, author FROM item
                """))
                
                # Create triggers for automatic synchronization
                conn.execute(text("""
                    CREATE TRIGGER item_ai AFTER INSERT ON item BEGIN
                        INSERT INTO item_fts(rowid, title, summary, author)
                        VALUES(new.id, new.title, new.summary, new.author);
                    END
                """))
                
                conn.execute(text("""
                    CREATE TRIGGER item_ad AFTER DELETE ON item BEGIN
                        INSERT INTO item_fts(item_fts, rowid, title, summary, author)
                        VALUES('delete', old.id, old.title, old.summary, old.author);
                    END
                """))
                
                conn.execute(text("""
                    CREATE TRIGGER item_au AFTER UPDATE ON item BEGIN
                        INSERT INTO item_fts(item_fts, rowid, title, summary, author)
                        VALUES('delete', old.id, old.title, old.summary, old.author);
                        INSERT INTO item_fts(rowid, title, summary, author)
                        VALUES(new.id, new.title, new.summary, new.author);
                    END
                """))
                
                conn.commit()
                logger.info("FTS5 index created successfully")
    
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
                query = query.where(Feed.enabled)
            return session.exec(query).all()
    
    def get_feed_status_dict(self) -> Dict[int, Dict[str, Any]]:
        """Get feed status dictionary for quick lookup."""
        with self.get_session() as session:
            feeds = session.exec(select(Feed)).all()
            status_dict = {}
            for feed in feeds:
                status_dict[feed.id] = {
                    'name': feed.name,
                    'status': feed.last_fetch_status,
                    'last_fetch': feed.last_fetch_time,
                    'enabled': feed.enabled
                }
            return status_dict
    
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
                feed.last_fetch_time = datetime.now(ZoneInfo('UTC'))
                if etag:
                    feed.last_etag = etag
                if last_modified:
                    feed.last_modified = last_modified
                session.commit()
    
    def acquire_feed_lock(self, feed_id: int) -> bool:
        """Acquire lock for feed. Returns True if lock acquired."""
        with self.get_session() as session:
            feed = session.get(Feed, feed_id)
            if feed and not feed.is_fetching:
                feed.is_fetching = True
                session.commit()
                return True
            return False
    
    def release_feed_lock(self, feed_id: int):
        """Release lock for feed."""
        with self.get_session() as session:
            feed = session.get(Feed, feed_id)
            if feed:
                feed.is_fetching = False
                session.commit()
    
    def update_adaptive_backoff(self, feed_id: int, success: bool):
        """Update adaptive backoff based on fetch result."""
        with self.get_session() as session:
            feed = session.get(Feed, feed_id)
            if feed:
                if success:
                    # Reset on success
                    feed.consecutive_errors = 0
                    feed.backoff_multiplier = 1.0
                else:
                    # Increase on error
                    feed.consecutive_errors += 1
                    # Cap at 4x multiplier
                    feed.backoff_multiplier = min(4.0, 1.0 + (feed.consecutive_errors * 0.5))
                session.commit()
    
    def update_feed_published_time(self, feed_id: int, published_time: Optional[datetime]):
        """Update last published time for TTL tracking."""
        with self.get_session() as session:
            feed = session.get(Feed, feed_id)
            if feed and published_time:
                feed.last_published_time = published_time
                # Reset degraded if feed publishes again
                if feed.degraded:
                    feed.degraded = False
                session.commit()
    
    def check_and_degrade_feeds(self, ttl_hours: int = 24):
        """Check feeds that haven't published in TTL and degrade them."""
        from datetime import timedelta
        cutoff_time = datetime.now(ZoneInfo('UTC')) - timedelta(hours=ttl_hours)
        
        with self.get_session() as session:
            feeds = session.exec(select(Feed)).all()
            degraded_count = 0
            
            for feed in feeds:
                if feed.last_published_time and feed.last_published_time < cutoff_time:
                    if not feed.degraded:
                        feed.degraded = True
                        degraded_count += 1
            
            session.commit()
            return degraded_count
    
    def mark_old_items_as_read(self, age_hours: int = 1):
        """Mark items older than age_hours as not new."""
        from datetime import timedelta
        cutoff_time = datetime.now(ZoneInfo('UTC')) - timedelta(hours=age_hours)
        
        with self.get_session() as session:
            updated = session.exec(
                text("UPDATE item SET is_new = 0 WHERE created_at < :cutoff AND is_new = 1"),
                {"cutoff": cutoff_time.isoformat()}
            )
            session.commit()
            return updated.rowcount if hasattr(updated, 'rowcount') else 0
    
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
            
            # Automatic cleanup: remove oldest items if exceeding MAX_ITEMS
            total_count = len(session.exec(select(Item)).all())
            if total_count > settings.MAX_ITEMS:
                excess = total_count - settings.MAX_ITEMS
                # Get oldest items by publication date
                oldest_items = session.exec(
                    select(Item)
                    .order_by(Item.published.asc())
                    .limit(excess)
                ).all()
                
                # Delete oldest items
                for item in oldest_items:
                    session.delete(item)
                session.commit()
        
        return new_count
    
    def get_items(self, page: int = 1, limit: int = 20, 
                 feed_id: Optional[int] = None,
                 search_query: Optional[str] = None,
                 sort_by: str = "recent") -> List[Dict[str, Any]]:
        """Get paginated items with feed info."""
        offset = (page - 1) * limit
        
        with self.get_session() as session:
            query = select(Item, Feed.name).join(Feed)
            
            if feed_id:
                query = query.where(Item.feed_id == feed_id)
            
            # Full-text search using FTS5
            if search_query and search_query.strip():
                search_term = search_query.strip()
                # Use FTS5 if available, fallback to LIKE
                try:
                    # Query FTS5 virtual table
                    fts_query = text("""
                        SELECT rowid FROM item_fts 
                        WHERE item_fts MATCH :search_term
                    """)
                    fts_results = session.exec(fts_query, {"search_term": search_term})
                    item_ids = [row[0] for row in fts_results]
                    
                    if item_ids:
                        query = query.where(Item.id.in_(item_ids))
                    else:
                        # No matches found, return empty query
                        query = query.where(Item.id == -1)
                except Exception as e:
                    # Fallback to LIKE if FTS5 not available
                    logger.warning(f"FTS5 search failed, using LIKE fallback: {e}")
                    search_term = f"%{search_term}%"
                    query = query.where(
                        (Item.title.like(search_term)) |
                        (Item.summary.like(search_term)) |
                        (Item.author.like(search_term))
                    )
            
            # Apply sorting
            if sort_by == "oldest":
                query = query.order_by(Item.published.asc())
            elif sort_by == "title":
                query = query.order_by(Item.title.asc())
            elif sort_by == "feed":
                query = query.order_by(Feed.name.asc(), Item.published.desc())
            else:  # recent (default)
                query = query.order_by(Item.published.desc())
            
            query = query.offset(offset).limit(limit)
            
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
                    'feed_id': item.feed_id,
                    'is_new': item.is_new
                })
            
            return items
    
    def get_items_count(self, feed_id: Optional[int] = None, search_query: Optional[str] = None) -> int:
        """Get total count of items."""
        with self.get_session() as session:
            query = select(Item)
            if feed_id:
                query = query.where(Item.feed_id == feed_id)
            
            # Full-text search using FTS5
            if search_query and search_query.strip():
                search_term = search_query.strip()
                # Use FTS5 if available, fallback to LIKE
                try:
                    # Query FTS5 virtual table
                    fts_query = text("""
                        SELECT rowid FROM item_fts 
                        WHERE item_fts MATCH :search_term
                    """)
                    fts_results = session.exec(fts_query, {"search_term": search_term})
                    item_ids = [row[0] for row in fts_results]
                    
                    if item_ids:
                        query = query.where(Item.id.in_(item_ids))
                    else:
                        # No matches found
                        return 0
                except Exception as e:
                    # Fallback to LIKE if FTS5 not available
                    logger.warning(f"FTS5 search failed, using LIKE fallback: {e}")
                    search_term = f"%{search_term}%"
                    query = query.where(
                        (Item.title.like(search_term)) |
                        (Item.summary.like(search_term)) |
                        (Item.author.like(search_term))
                    )
            
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
