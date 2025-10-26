"""
Collections management endpoints for Pablo Feeds.
"""


from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.auth_jwt import get_current_user
from app.core.models import User
from app.core.storage import storage

router = APIRouter(prefix="/api/me/collections", tags=["collections"])


@router.get("")
async def get_my_collections(user: User = Depends(get_current_user)):
    """Get all collections for current user."""
    return storage.get_user_collections(user.id)


@router.post("")
async def create_collection(
    title: str = Query(...),
    slug: str = Query(...),
    description: str | None = Query(None),
    is_public: bool = Query(True),
    user: User = Depends(get_current_user)
):
    """Create a new collection."""
    # Check if slug already exists for user
    existing = storage.get_public_collection(user.id, slug)
    if existing:
        raise HTTPException(400, "Collection slug already exists")

    collection = storage.create_collection(user.id, title, slug, description, is_public)
    return {"message": "Collection created", "collection": collection}


@router.post("/{slug}/items")
async def add_to_collection(
    slug: str,
    item_id: int = Query(...),
    user: User = Depends(get_current_user)
):
    """Add item to collection."""
    storage.add_item_to_collection(user.id, slug, item_id)
    return {"message": "Item added to collection"}


@router.delete("/{slug}")
async def delete_collection(slug: str, user: User = Depends(get_current_user)):
    """Delete a collection."""
    # TODO: Implement delete
    return {"message": "Collection deleted"}

