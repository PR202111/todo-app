from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Set
from sqlalchemy.orm import Session

from models import CodingGoal, CodingProfile, PracticeActivity


def get_user_practice_dates(db: Session, user_id: int) -> Dict[date, Dict[str, Any]]:
    """
    Returns unique practice dates mapped to total problems and platform breakdown.
    Avoids double-counting multiple platforms on the same date.
    """
    activities = (
        db.query(PracticeActivity)
        .filter(PracticeActivity.user_id == user_id)
        .order_by(PracticeActivity.activity_date.asc())
        .all()
    )

    date_map: Dict[date, Dict[str, Any]] = {}
    for act in activities:
        d = act.activity_date
        if d not in date_map:
            date_map[d] = {
                "date": d.isoformat(),
                "total_problems": 0,
                "contests": 0,
                "platforms": set(),
            }
        date_map[d]["total_problems"] += act.problems_solved
        date_map[d]["contests"] += act.contests_attended
        date_map[d]["platforms"].add(act.platform)

    return date_map


def calculate_streaks(active_dates: Set[date], today: Optional[date] = None) -> tuple[int, int]:
    """
    Computes (current_streak, longest_streak) from a set of dates where practice occurred.
    Current streak continues if active today or yesterday.
    """
    if not active_dates:
        return 0, 0

    if today is None:
        today = date.today()

    sorted_dates = sorted(active_dates)

    # 1. Longest streak
    longest = 0
    current_run = 0
    prev_date: Optional[date] = None

    for d in sorted_dates:
        if prev_date is None:
            current_run = 1
        elif d == prev_date + timedelta(days=1):
            current_run += 1
        elif d == prev_date:
            pass  # duplicate date guard
        else:
            current_run = 1
        if current_run > longest:
            longest = current_run
        prev_date = d

    # 2. Current streak
    # Check if active today or yesterday
    curr_streak = 0
    check_date = today

    if check_date not in active_dates:
        # Check yesterday
        check_date = today - timedelta(days=1)

    while check_date in active_dates:
        curr_streak += 1
        check_date -= timedelta(days=1)

    return curr_streak, max(longest, curr_streak)


def calculate_weekly_consistency(active_dates: Set[date], today: Optional[date] = None, days_window: int = 28) -> float:
    """
    Computes practice consistency over the last `days_window` days (default 4 weeks = 28 days).
    Returns percentage 0.0 - 100.0 rounded to 1 decimal place.
    """
    if today is None:
        today = date.today()

    start_date = today - timedelta(days=days_window - 1)
    active_in_window = sum(1 for d in active_dates if start_date <= d <= today)
    return round((active_in_window / days_window) * 100.0, 1)


def generate_heatmap_data(date_map: Dict[date, Dict[str, Any]], days_back: int = 120, today: Optional[date] = None) -> List[Dict[str, Any]]:
    """
    Generates chronological list of days for calendar heatmap.
    """
    if today is None:
        today = date.today()

    start_date = today - timedelta(days=days_back)
    heatmap: List[Dict[str, Any]] = []

    curr = start_date
    while curr <= today:
        d_info = date_map.get(curr)
        if d_info:
            heatmap.append({
                "date": curr.isoformat(),
                "count": d_info["total_problems"],
                "contests": d_info["contests"],
                "platforms": list(d_info["platforms"]),
            })
        else:
            heatmap.append({
                "date": curr.isoformat(),
                "count": 0,
                "contests": 0,
                "platforms": [],
            })
        curr += timedelta(days=1)

    return heatmap


def update_goal_progress(db: Session, user_id: int):
    """
    Evaluates and updates progress for all active CodingGoals for the user.
    """
    goals = db.query(CodingGoal).filter(CodingGoal.user_id == user_id, CodingGoal.is_active == True).all()
    if not goals:
        return

    today = date.today()
    week_start = today - timedelta(days=today.weekday())  # Monday

    # Get recent practice activities
    recent_activities = (
        db.query(PracticeActivity)
        .filter(PracticeActivity.user_id == user_id, PracticeActivity.activity_date >= week_start)
        .all()
    )

    today_problems = sum(a.problems_solved for a in recent_activities if a.activity_date == today)
    week_problems = sum(a.problems_solved for a in recent_activities)
    week_days = len(set(a.activity_date for a in recent_activities if a.problems_solved > 0 or a.contests_attended > 0))

    # Get profiles for rating
    profiles = db.query(CodingProfile).filter(CodingProfile.user_id == user_id).all()
    profile_ratings = {p.platform.value if hasattr(p.platform, "value") else str(p.platform): p.rating for p in profiles}

    for goal in goals:
        gtype = goal.goal_type.value if hasattr(goal.goal_type, "value") else str(goal.goal_type)

        if gtype == "daily_problems":
            goal.current_value = float(today_problems)
        elif gtype == "weekly_problems":
            goal.current_value = float(week_problems)
        elif gtype == "weekly_days":
            goal.current_value = float(week_days)
        elif gtype == "target_rating":
            plat = goal.platform or "codeforces"
            current_r = profile_ratings.get(plat) or 0
            goal.current_value = float(current_r)

        if goal.current_value >= goal.target_value:
            goal.is_completed = True

        goal.updated_at = datetime.utcnow()

    db.commit()
