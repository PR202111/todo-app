import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from models import (
    Achievement,
    CodingGoal,
    CodingProfile,
    Contest,
    InAppNotification,
    NotificationType,
    PracticeActivity,
    Problem,
    ProblemReview,
    UserContestPreference,
)

logger = logging.getLogger(__name__)


# ─── 1. DETERMINISTIC SPACED REPETITION (SM-2) ──────────────────────────────

def calculate_sm2_interval(
    current_count: int,
    current_interval: int,
    current_ease: float,
    rating: int,  # 1: Again, 2: Hard, 3: Good, 4: Easy
) -> Tuple[int, int, float, datetime]:
    """
    Deterministic SM-2 spaced repetition calculation.
    Returns (new_review_count, new_interval_days, new_ease_factor, next_review_at).
    """
    ease = max(1.3, current_ease)

    if rating == 1:
        # Failure / "Again" - reset cycle
        new_count = 0
        new_interval = 1
        ease = max(1.3, ease - 0.2)
    else:
        # Success (Hard, Good, Easy)
        if current_count == 0:
            new_interval = 1
        elif current_count == 1:
            new_interval = 3 if rating == 2 else 6
        else:
            base_calc = current_interval * ease
            if rating == 2:  # Hard
                new_interval = max(1, int(round(base_calc * 0.8)))
            elif rating == 4:  # Easy
                new_interval = max(1, int(round(base_calc * 1.3)))
            else:  # Good
                new_interval = max(1, int(round(base_calc)))

        new_count = current_count + 1
        # Adjust ease factor
        ease = max(1.3, ease + (0.1 - (4 - rating) * (0.08 + (4 - rating) * 0.02)))

    next_review = datetime.utcnow() + timedelta(days=new_interval)
    return new_count, new_interval, round(ease, 2), next_review


# ─── 2. DETERMINISTIC ACHIEVEMENTS SYSTEM ───────────────────────────────────

ACHIEVEMENT_DEFINITIONS = [
    {
        "key": "first_problem",
        "title": "First Step",
        "description": "Added your first problem to the personal library.",
        "icon": "🌱",
    },
    {
        "key": "problems_10",
        "title": "Problem Solver",
        "description": "Solved 10 competitive programming problems.",
        "icon": "⚡",
    },
    {
        "key": "problems_50",
        "title": "Century Half",
        "description": "Reached 50 solved problems in your library.",
        "icon": "🔥",
    },
    {
        "key": "problems_100",
        "title": "Centurion",
        "description": "Conquered 100 competitive programming problems.",
        "icon": "🏆",
    },
    {
        "key": "streak_3",
        "title": "Consistency Spark",
        "description": "Maintained a 3-day practice streak.",
        "icon": "🕯️",
    },
    {
        "key": "streak_7",
        "title": "Week Warrior",
        "description": "Achieved an unbroken 7-day practice streak.",
        "icon": "⚔️",
    },
    {
        "key": "streak_30",
        "title": "Habit of Champions",
        "description": "Maintained an incredible 30-day coding streak.",
        "icon": "👑",
    },
    {
        "key": "rating_1400",
        "title": "Specialist / Knight",
        "description": "Reached a contest rating of 1400+.",
        "icon": "🛡️",
    },
    {
        "key": "rating_1600",
        "title": "Expert Competitor",
        "description": "Reached a contest rating of 1600+.",
        "icon": "🌟",
    },
    {
        "key": "rating_1900",
        "title": "Candidate Master / Guardian",
        "description": "Reached an elite rating of 1900+.",
        "icon": "💎",
    },
    {
        "key": "spaced_rep_master",
        "title": "Memory Master",
        "description": "Completed 10 spaced repetition problem reviews.",
        "icon": "🧠",
    },
    {
        "key": "contest_prep_master",
        "title": "Ready for Battle",
        "description": "Completed a 100% preparation checklist for an upcoming contest.",
        "icon": "🎯",
    },
]


def check_and_unlock_achievements(db: Session, user_id: int) -> List[Achievement]:
    """
    Evaluates verified user activity and unlocks any newly earned achievements.
    Idempotent and strictly deterministic.
    """
    existing = {
        a.badge_key: a
        for a in db.query(Achievement).filter(Achievement.user_id == user_id).all()
    }

    # Query metrics
    problem_count = db.query(Problem).filter(Problem.user_id == user_id).count()
    solved_count = (
        db.query(Problem)
        .filter(Problem.user_id == user_id, Problem.solve_status == "solved")
        .count()
    )
    reviews_count = db.query(ProblemReview).filter(ProblemReview.user_id == user_id).count()

    profiles = db.query(CodingProfile).filter(CodingProfile.user_id == user_id).all()
    max_rating = max([p.max_rating or p.rating or 0 for p in profiles] or [0])
    total_platform_solved = sum([p.problems_solved for p in profiles])
    effective_solved = max(solved_count, total_platform_solved)

    # Calculate streak from practice activities
    activities = (
        db.query(PracticeActivity)
        .filter(PracticeActivity.user_id == user_id)
        .all()
    )
    active_dates = {a.activity_date for a in activities if a.problems_solved > 0 or a.contests_attended > 0}
    from services.analytics import calculate_streaks
    curr_streak, longest_streak = calculate_streaks(active_dates)

    new_unlocked: List[Achievement] = []

    def award(key: str, is_verified: bool = False):
        if key in existing:
            return
        defn = next((d for d in ACHIEVEMENT_DEFINITIONS if d["key"] == key), None)
        if not defn:
            return
        ach = Achievement(
            user_id=user_id,
            badge_key=key,
            title=defn["title"],
            description=defn["description"],
            icon=defn["icon"],
            unlocked_at=datetime.utcnow(),
            is_verified=is_verified,
        )
        db.add(ach)
        new_unlocked.append(ach)

        # Create in-app celebration notification
        notif = InAppNotification(
            user_id=user_id,
            title=f"Achievement Unlocked: {defn['title']}! {defn['icon']}",
            message=defn["description"],
            notification_type=NotificationType.goal_completed,
            metadata_json=json.dumps({"badge_key": key}),
        )
        db.add(notif)

    # Check criteria
    if problem_count >= 1:
        award("first_problem")
    if effective_solved >= 10:
        award("problems_10", is_verified=total_platform_solved >= 10)
    if effective_solved >= 50:
        award("problems_50", is_verified=total_platform_solved >= 50)
    if effective_solved >= 100:
        award("problems_100", is_verified=total_platform_solved >= 100)

    if curr_streak >= 3 or longest_streak >= 3:
        award("streak_3")
    if curr_streak >= 7 or longest_streak >= 7:
        award("streak_7")
    if curr_streak >= 30 or longest_streak >= 30:
        award("streak_30")

    if max_rating >= 1400:
        award("rating_1400", is_verified=True)
    if max_rating >= 1600:
        award("rating_1600", is_verified=True)
    if max_rating >= 1900:
        award("rating_1900", is_verified=True)

    if reviews_count >= 10:
        award("spaced_rep_master")

    if new_unlocked:
        db.commit()

    return new_unlocked


# ─── 3. DETERMINISTIC PRACTICE PLANNER ──────────────────────────────────────

def generate_deterministic_practice_plan(db: Session, user_id: int) -> Dict[str, Any]:
    """
    Generates an actionable, rules-based practice plan without any AI.
    Rules applied:
    1. Spaced Repetition Priority: problems due for revision.
    2. Weak Topic Detection: topics with highest failure/attempt rates.
    3. Contest Approaching: checklist and preparation tasks for contests <= 3 days away.
    4. Goal Deficit Pace: calculation of problems needed to hit weekly goal.
    """
    now = datetime.utcnow()
    rules_applied: List[str] = []

    # 1. Due for Revision (Spaced Repetition)
    due_problems = (
        db.query(Problem)
        .filter(
            Problem.user_id == user_id,
            Problem.next_review_at != None,
            Problem.next_review_at <= now,
        )
        .order_by(Problem.next_review_at.asc())
        .limit(10)
        .all()
    )
    if due_problems:
        rules_applied.append(
            f"Spaced Repetition: {len(due_problems)} problem(s) are due for review based on the SM-2 schedule."
        )

    # 2. Weak Topic Analysis
    all_user_problems = db.query(Problem).filter(Problem.user_id == user_id).all()
    topic_stats: Dict[str, Dict[str, int]] = {}
    for p in all_user_problems:
        t = p.topic or "General"
        if t not in topic_stats:
            topic_stats[t] = {"total": 0, "solved": 0, "attempted": 0, "unsolved": 0}
        topic_stats[t]["total"] += 1
        if p.solve_status == "solved":
            topic_stats[t]["solved"] += 1
        elif p.solve_status == "attempted":
            topic_stats[t]["attempted"] += 1
        else:
            topic_stats[t]["unsolved"] += 1

    weak_topics: List[Dict[str, Any]] = []
    for t, s in topic_stats.items():
        if s["total"] >= 2:
            solve_rate = round((s["solved"] / s["total"]) * 100, 1)
            if solve_rate < 70.0 or s["attempted"] + s["unsolved"] >= 2:
                weak_topics.append({
                    "topic": t,
                    "total": s["total"],
                    "solved": s["solved"],
                    "solve_rate": solve_rate,
                    "reason": f"Only {solve_rate}% solved ({s['total'] - s['solved']} pending/unsolved)",
                })

    weak_topics.sort(key=lambda x: x["solve_rate"])
    if weak_topics:
        rules_applied.append(
            f"Topic Mastery Rule: '{weak_topics[0]['topic']}' identified as focus area ({weak_topics[0]['solve_rate']}% solve rate)."
        )

    # 3. Upcoming Interested Contests
    upcoming_limit = now + timedelta(days=3)
    interested_prefs = (
        db.query(UserContestPreference)
        .filter(UserContestPreference.user_id == user_id, UserContestPreference.is_interested == True)
        .all()
    )
    upcoming_contest_plans = []
    for pref in interested_prefs:
        contest = db.query(Contest).filter(Contest.id == pref.contest_id).first()
        if contest and now <= contest.start_time <= upcoming_limit:
            hours_left = int((contest.start_time - now).total_seconds() // 3600)
            upcoming_contest_plans.append({
                "contest_id": contest.id,
                "contest_name": contest.name,
                "platform": contest.platform.value if hasattr(contest.platform, "value") else str(contest.platform),
                "start_time": contest.start_time.isoformat(),
                "hours_until_start": hours_left,
                "recommended_action": f"Review standard template, practice speed on Div. 2 A/B or LC Mediums {hours_left}h before start.",
            })

    if upcoming_contest_plans:
        rules_applied.append(
            f"Contest Readiness Rule: {len(upcoming_contest_plans)} starred contest(s) starting within 72 hours."
        )

    # 4. Recommended Problems (due reviews first, then weak topic problems, then bookmarked)
    recommended_map = {}
    for p in due_problems:
        recommended_map[p.id] = p

    # Add bookmarked problems
    bookmarked = (
        db.query(Problem)
        .filter(Problem.user_id == user_id, Problem.is_bookmarked == True)
        .limit(5)
        .all()
    )
    for p in bookmarked:
        if p.id not in recommended_map:
            recommended_map[p.id] = p

    # Add unsolved problems from weak topics
    if weak_topics:
        top_weak = weak_topics[0]["topic"]
        weak_probs = (
            db.query(Problem)
            .filter(
                Problem.user_id == user_id,
                Problem.topic == top_weak,
                Problem.solve_status != "solved",
            )
            .limit(3)
            .all()
        )
        for p in weak_probs:
            if p.id not in recommended_map:
                recommended_map[p.id] = p

    return {
        "weak_topics": weak_topics,
        "recommended_problems": list(recommended_map.values()),
        "upcoming_contest_plans": upcoming_contest_plans,
        "due_reviews_count": len(due_problems),
        "rules_applied": rules_applied,
    }
