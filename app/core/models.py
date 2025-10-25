"""
Multi-user models for Pablo Feeds.
Extends existing Feed/Item/FetchLog models.
"""

from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime
from zoneinfo import ZoneInfo


class User(SQLModel, table=True):
    """User account."""
    
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    password_hash: str
    display_name: str
    handle: str = Field(index=True, unique=True)  # @pablo
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    role: str = "user"  # user, moderator, admin
    created_at: datetime = Field(default_factory=lambda: datetime.now(ZoneInfo('UTC')))
    is_active: bool = True
    
    # User settings
    timezone: str = "UTC"
    default_sort: str = "recent"
    default_limit: int = 20


class Theme(SQLModel, table=True):
    """User custom theme."""
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    name: str = "custom"
    css_vars: str = "{}"  # JSON: {"bg": "#fff", "fg": "#000", "accent": "#0066cc"}
    is_public_default: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(ZoneInfo('UTC')))


class Subscription(SQLModel, table=True):
    """User subscription to a feed."""
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    feed_id: int = Field(foreign_key="feed.id", index=True)
    is_public: bool = True  # Shows on public profile
    priority: int = 0  # Manual ordering
    mute_keywords: str = "[]"  # JSON array
    mute_domains: str = "[]"    # JSON array
    created_at: datetime = Field(default_factory=lambda: datetime.now(ZoneInfo('UTC')))
    # Unique constraint enforced at application level


class ReadState(SQLModel, table=True):
    """User read/star state for items."""
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    item_id: int = Field(foreign_key="item.id", index=True)
    is_read: bool = True
    starred: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(ZoneInfo('UTC')))
    # Unique constraint enforced at application level


class Collection(SQLModel, table=True):
    """User curated collection of items."""
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    slug: str = Field(index=True)
    title: str
    description: Optional[str] = None
    is_public: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(ZoneInfo('UTC')))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(ZoneInfo('UTC')))
    # Unique constraint enforced at application level


class CollectionItem(SQLModel, table=True):
    """Item in a collection."""
    
    collection_id: int = Field(foreign_key="collection.id", primary_key=True)
    item_id: int = Field(foreign_key="item.id", primary_key=True)
    position: int = 0
    added_at: datetime = Field(default_factory=lambda: datetime.now(ZoneInfo('UTC')))



