"""
Database maintenance routines.
"""

import logging
from datetime import datetime, timedelta
from sqlmodel import text
from app.core.storage import storage

logger = logging.getLogger(__name__)


def run_maintenance():
    """Run periodic database maintenance tasks."""
    logger.info("Starting database maintenance...")
    
    try:
        with storage.get_session() as session:
            # VACUUM to reclaim space
            logger.info("Running VACUUM...")
            session.execute(text("VACUUM"))
            session.commit()
            
            # ANALYZE to update statistics
            logger.info("Running ANALYZE...")
            session.execute(text("ANALYZE"))
            session.commit()
            
            # Clean old fetch logs (older than 30 days)
            logger.info("Cleaning old fetch logs...")
            cutoff_date = datetime.utcnow() - timedelta(days=30)
            session.execute(
                text("DELETE FROM fetchlog WHERE fetch_time < :cutoff"),
                {"cutoff": cutoff_date.isoformat()}
            )
            session.commit()
            
            logger.info("Database maintenance completed successfully")
            
    except Exception as e:
        logger.error(f"Error during maintenance: {e}")


def get_db_stats() -> dict:
    """Get database statistics."""
    stats = {}
    
    try:
        with storage.get_session() as session:
            # Database size
            size_result = session.execute(text("""
                SELECT page_count * page_size as size
                FROM pragma_page_count(), pragma_page_size()
            """))
            stats['db_size_bytes'] = size_result.fetchone()[0]
            
            # Table counts
            feeds_result = session.execute(text("SELECT COUNT(*) FROM feed"))
            stats['total_feeds'] = feeds_result.fetchone()[0]
            
            items_result = session.execute(text("SELECT COUNT(*) FROM item"))
            stats['total_items'] = items_result.fetchone()[0]
            
            logs_result = session.execute(text("SELECT COUNT(*) FROM fetchlog"))
            stats['total_logs'] = logs_result.fetchone()[0]
            
    except Exception as e:
        logger.error(f"Error getting DB stats: {e}")
    
    return stats


def clean_reddit_summaries():
    """Clean Reddit metadata from existing summaries and titles."""
    import re
    
    logger.info("Cleaning Reddit summaries and titles...")
    
    try:
        with storage.get_session() as session:
            # Get Reddit feed IDs
            reddit_feeds = session.execute(text("""
                SELECT id FROM feed 
                WHERE url LIKE '%reddit.com%'
            """))
            reddit_feed_ids = [row[0] for row in reddit_feeds]
            
            if not reddit_feed_ids:
                logger.info("No Reddit feeds found")
                return
            
            # Get items from Reddit feeds with metadata
            items_result = session.execute(text("""
                SELECT id, title, summary FROM item 
                WHERE feed_id IN :feed_ids 
                AND (summary LIKE '%submitted by%' OR title LIKE '%[link]%')
            """), {"feed_ids": tuple(reddit_feed_ids)})
            
            items = items_result.fetchall()
            logger.info(f"Found {len(items)} Reddit items to clean")
            
            updated_count = 0
            for item_id, title, summary in items:
                # Clean the title
                cleaned_title = re.sub(r'\s*\[link\]\s*\[comments\]', '', title, flags=re.IGNORECASE)
                cleaned_title = cleaned_title.strip()
                
                # Clean the summary (flexible pattern)
                cleaned_summary = re.sub(r'submitted by.*?\[.*?\]\s*\[.*?\]', '', summary, flags=re.IGNORECASE | re.DOTALL)
                cleaned_summary = cleaned_summary.strip()
                
                # Update if changed
                if cleaned_title != title or cleaned_summary != summary:
                    session.execute(text("""
                        UPDATE item 
                        SET title = :title, summary = :summary 
                        WHERE id = :id
                    """), {"title": cleaned_title, "summary": cleaned_summary, "id": item_id})
                    updated_count += 1
            
            session.commit()
            logger.info(f"Cleaned {updated_count} Reddit items")
            
    except Exception as e:
        logger.error(f"Error cleaning Reddit summaries: {e}")