"""
Admin endpoints with RBAC for multi-user Pablo Feeds.
"""

from fastapi import APIRouter, Depends, Query

from app.core.auth_jwt import require_role
from app.core.models import User
from app.core.storage import storage

router = APIRouter(tags=["admin"])


@router.get("/admin/users")
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    user: User = Depends(require_role("admin"))
):
    """List all users (admin only)."""
    users = storage.get_users(page, limit)
    return {
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "display_name": u.display_name,
                "handle": u.handle,
                "role": u.role,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat() if u.created_at else None
            }
            for u in users
        ],
        "pagination": {"page": page, "limit": limit}
    }


@router.patch("/admin/users/{user_id}")
async def update_user_role(
    user_id: int,
    role: str = Query(...),
    user: User = Depends(require_role("admin"))
):
    """Update user role (admin only)."""
    storage.update_user(user_id, {"role": role})
    return {"message": "User role updated"}


@router.delete("/admin/users/{user_id}")
async def delete_user(
    user_id: int,
    user: User = Depends(require_role("admin"))
):
    """Delete a user (admin only)."""
    storage.update_user(user_id, {"is_active": False})
    return {"message": "User deactivated"}

