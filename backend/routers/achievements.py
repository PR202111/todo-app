from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from dependencies import get_current_user, get_db
from models import Achievement, User
from schemas import AchievementOut
from services.planner import ACHIEVEMENT_DEFINITIONS, check_and_unlock_achievements

router = APIRouter(prefix="/coding/achievements", tags=["achievements"])


@router.get("", response_model=List[Dict[str, Any]])
def get_achievements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns full list of available achievements with current user's unlock status.
    """
    check_and_unlock_achievements(db, current_user.id)

    unlocked_map = {
        a.badge_key: a
        for a in db.query(Achievement).filter(Achievement.user_id == current_user.id).all()
    }

    results = []
    for defn in ACHIEVEMENT_DEFINITIONS:
        unlocked = unlocked_map.get(defn["key"])
        results.append({
            "key": defn["key"],
            "title": defn["title"],
            "description": defn["description"],
            "icon": defn["icon"],
            "is_unlocked": unlocked is not None,
            "unlocked_at": unlocked.unlocked_at if unlocked else None,
            "is_verified": unlocked.is_verified if unlocked else False,
        })

    return results
