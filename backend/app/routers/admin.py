from datetime import datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

# FIXED: Removed the main.py router imports loop and added the correct dependencies
from app.auth import require_admin
from app.database import get_db
from app.models import Prompt, User


router = APIRouter(
    prefix="/api/admin",
    tags=["Administration"],
    dependencies=[Depends(require_admin)],
)


@router.get("/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
):
    total_users = db.query(func.count(User.id)).scalar() or 0

    active_users = (
        db.query(func.count(User.id))
        .filter(User.is_active.is_(True))
        .scalar()
        or 0
    )

    disabled_users = total_users - active_users

    total_prompts = (
        db.query(func.count(Prompt.id)).scalar() or 0
    )

    now = datetime.utcnow()
    today_start = datetime.combine(now.date(), time.min)
    tomorrow_start = today_start + timedelta(days=1)

    month_start = now.replace(
        day=1,
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )

    prompts_today = (
        db.query(func.count(Prompt.id))
        .filter(
            Prompt.created_at >= today_start,
            Prompt.created_at < tomorrow_start,
        )
        .scalar()
        or 0
    )

    prompts_this_month = (
        db.query(func.count(Prompt.id))
        .filter(Prompt.created_at >= month_start)
        .scalar()
        or 0
    )

    return {
        "total_users": total_users,
        "active_users": active_users,
        "disabled_users": disabled_users,
        "total_prompts": total_prompts,
        "prompts_today": prompts_today,
        "prompts_this_month": prompts_this_month,
    }


@router.get("/users")
def get_admin_users(
    search: str = Query(default="", max_length=200),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(User)

    if search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.name.ilike(term),
                User.email.ilike(term),
            )
        )

    total = query.count()

    users = (
        query.order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    user_items = []

    for user in users:
        prompt_count = (
            db.query(func.count(Prompt.id))
            .filter(Prompt.user_id == user.id)
            .scalar()
            or 0
        )

        user_items.append(
            {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "is_active": user.is_active,
                "created_at": user.created_at,
                "prompt_count": prompt_count,
            }
        )

    return {
        "items": user_items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    is_active: bool,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    if user.id == current_admin.id and not is_active:
        raise HTTPException(
            status_code=400,
            detail="You cannot disable your own account",
        )

    if user.role == "admin" and not is_active:
        raise HTTPException(
            status_code=400,
            detail="Administrator accounts cannot be disabled here",
        )

    user.is_active = is_active
    db.commit()
    db.refresh(user)

    return {
        "message": (
            "User activated"
            if user.is_active
            else "User deactivated"
        ),
        "user_id": user.id,
        "is_active": user.is_active,
    }
