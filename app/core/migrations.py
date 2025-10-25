"""
Migration script from single-user to multi-user Pablo Feeds.
"""

import logging
from app.core.storage import storage
from app.core.auth_jwt import hash_password

logger = logging.getLogger(__name__)


def migrate_to_multiuser(
    founder_email: str = "admin@example.com",
    founder_password: str = "changeme",
    founder_display_name: str = "Admin",
    founder_handle: str = "admin"
):
    """
    Migrate single-user data to multi-user schema.
    Creates founder user and subscribes all existing feeds.
    """
    
    logger.info("Starting migration to multi-user...")
    
    # Create founder user
    founder = storage.create_user(
        email=founder_email,
        password_hash=hash_password(founder_password),
        display_name=founder_display_name,
        handle=founder_handle,
        role="admin",
        timezone="UTC"
    )
    
    logger.info(f"Created founder user: {founder.handle}")
    
    # Migrate all feeds to subscriptions
    feeds = storage.get_feeds(enabled_only=False)
    subscription_count = 0
    
    for feed in feeds:
        try:
            storage.create_subscription(
                user_id=founder.id,
                feed_id=feed.id,
                is_public=True,
                priority=0
            )
            subscription_count += 1
        except Exception as e:
            logger.warning(f"Could not create subscription for feed {feed.id}: {e}")
    
    logger.info(f"Created {subscription_count} subscriptions for founder user")
    
    # Summary
    logger.info(f"Migration complete!")
    logger.info(f"Founder user: {founder.handle}")
    logger.info(f"Email: {founder_email}")
    logger.info(f"Password: {founder_password}")
    logger.info("⚠️  IMPORTANT: Change the password after first login!")
    
    return {
        "founder_handle": founder.handle,
        "subscriptions_created": subscription_count,
        "message": "Migration complete. Log in as founder user to continue."
    }


if __name__ == "__main__":
    # Run migration
    migrate_to_multiuser()

