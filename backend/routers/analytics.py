import json
import logging
from datetime import date, datetime
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from dependencies import get_current_user, get_db
from models import CodingProfile, PracticeActivity, User
from schemas import (PracticeActivityCreate, PracticeActivityOut,
                     StreakAnalyticsOut)
from services.analytics import (calculate_streaks, calculate_weekly_consistency,
                                generate_heatmap_data, get_user_practice_dates,
                                update_goal_progress)
from services.codeforces import fetch_codeforces_rating_history
from services.leetcode import fetch_leetcode_contest_history

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/coding", tags=["analytics"])


@router.get("/analytics", response_model=StreakAnalyticsOut)
async def get_coding_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Computes comprehensive streak, consistency, heatmap, and rating history analytics.
    """
    date_map = get_user_practice_dates(db, current_user.id)
    active_dates = set(date_map.keys())

    today = date.today()
    current_streak, longest_streak = calculate_streaks(active_dates, today=today)
    weekly_consistency = calculate_weekly_consistency(active_dates, today=today, days_window=28)
    heatmap = generate_heatmap_data(date_map, days_back=90, today=today)

    total_problems = sum(d["total_problems"] for d in date_map.values())
    active_days_count = len(active_dates)

    # Fetch rating history from linked profiles
    profiles = db.query(CodingProfile).filter(CodingProfile.user_id == current_user.id).all()
    rating_history: List[Dict[str, Any]] = []

    for p in profiles:
        plat = p.platform.value if hasattr(p.platform, "value") else str(p.platform)
        if plat == "codeforces":
            try:
                cf_hist = await fetch_codeforces_rating_history(p.username)
                for item in cf_hist:
                    rating_history.append({
                        "platform": "codeforces",
                        "date": item.get("date"),
                        "rating": item.get("new_rating"),
                        "contest_name": item.get("contest_name"),
                        "rank": item.get("rank"),
                    })
            except Exception as e:
                logger.warning(f"Error reading CF rating history for analytics: {e}")

        elif plat == "leetcode":
            try:
                lc_hist = await fetch_leetcode_contest_history(p.username)
                for item in lc_hist:
                    rating_history.append({
                        "platform": "leetcode",
                        "date": item.get("date"),
                        "rating": item.get("rating"),
                        "contest_name": item.get("contest_name"),
                        "rank": item.get("rank"),
                    })
            except Exception as e:
                logger.warning(f"Error reading LC contest history for analytics: {e}")

    # Sort rating history chronologically
    rating_history.sort(key=lambda x: x.get("date") or "")

    return StreakAnalyticsOut(
        current_streak=current_streak,
        longest_streak=longest_streak,
        weekly_consistency=weekly_consistency,
        active_days_count=active_days_count,
        total_problems_solved=total_problems,
        heatmap=heatmap,
        rating_history=rating_history,
    )


@router.post("/activity", response_model=PracticeActivityOut, status_code=status.HTTP_201_CREATED)
def log_practice_activity(
    data: PracticeActivityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Logs or updates a practice activity record (manual or synced).
    """
    existing = (
        db.query(PracticeActivity)
        .filter(
            PracticeActivity.user_id == current_user.id,
            PracticeActivity.platform == data.platform,
            PracticeActivity.activity_date == data.activity_date,
        )
        .first()
    )

    if existing:
        existing.problems_solved += data.problems_solved
        existing.contests_attended += data.contests_attended
        existing.points += data.points
        if data.details:
            existing.details_json = json.dumps({"note": data.details})
        target_act = existing
    else:
        target_act = PracticeActivity(
            user_id=current_user.id,
            platform=data.platform,
            activity_date=data.activity_date,
            problems_solved=data.problems_solved,
            contests_attended=data.contests_attended,
            points=data.points,
            source="manual" if data.platform == "manual" else "synced",
            details_json=json.dumps({"note": data.details}) if data.details else None,
        )
        db.add(target_act)

    db.commit()
    db.refresh(target_act)

    # Re-evaluate goal progress
    update_goal_progress(db, current_user.id)

    return target_act
