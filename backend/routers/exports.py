import csv
import io
import json
from datetime import datetime
from typing import Any, Dict

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from dependencies import get_current_user, get_db
from models import (
    Achievement,
    CodingGoal,
    CodingProfile,
    InAppNotification,
    PracticeActivity,
    Problem,
    ProgressReport,
    User,
    UserContestPreference,
)

router = APIRouter(prefix="/coding/export", tags=["export"])


@router.get("/json")
def export_user_data_json(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Exports full personal dataset in JSON format.
    Strictly excludes passwords, tokens, cookies, and other users' records.
    """
    # 1. Profiles
    profiles = [
        {
            "platform": p.platform.value if hasattr(p.platform, "value") else str(p.platform),
            "username": p.username,
            "rating": p.rating,
            "max_rating": p.max_rating,
            "problems_solved": p.problems_solved,
            "easy_solved": p.easy_solved,
            "medium_solved": p.medium_solved,
            "hard_solved": p.hard_solved,
            "last_refreshed_at": p.last_refreshed_at.isoformat() if p.last_refreshed_at else None,
        }
        for p in db.query(CodingProfile).filter(CodingProfile.user_id == current_user.id).all()
    ]

    # 2. Problems
    problems = [
        {
            "id": p.id,
            "title": p.title,
            "url": p.url,
            "platform": p.platform,
            "external_id": p.external_id,
            "topic": p.topic,
            "difficulty": p.difficulty,
            "solve_status": p.solve_status,
            "attempt_count": p.attempt_count,
            "solved_at": p.solved_at.isoformat() if p.solved_at else None,
            "notes": p.notes,
            "revision_notes": p.revision_notes,
            "is_bookmarked": p.is_bookmarked,
            "next_review_at": p.next_review_at.isoformat() if p.next_review_at else None,
            "review_count": p.review_count,
            "created_at": p.created_at.isoformat(),
        }
        for p in db.query(Problem).filter(Problem.user_id == current_user.id).all()
    ]

    # 3. Practice Activity
    activities = [
        {
            "platform": a.platform,
            "activity_date": a.activity_date.isoformat(),
            "problems_solved": a.problems_solved,
            "contests_attended": a.contests_attended,
            "points": a.points,
            "source": a.source,
        }
        for a in db.query(PracticeActivity).filter(PracticeActivity.user_id == current_user.id).all()
    ]

    # 4. Goals
    goals = [
        {
            "title": g.title,
            "goal_type": g.goal_type.value if hasattr(g.goal_type, "value") else str(g.goal_type),
            "target_value": g.target_value,
            "current_value": g.current_value,
            "is_active": g.is_active,
            "is_completed": g.is_completed,
            "deadline": g.deadline.isoformat() if g.deadline else None,
        }
        for g in db.query(CodingGoal).filter(CodingGoal.user_id == current_user.id).all()
    ]

    # 5. Achievements
    achievements = [
        {
            "badge_key": a.badge_key,
            "title": a.title,
            "description": a.description,
            "unlocked_at": a.unlocked_at.isoformat(),
            "is_verified": a.is_verified,
        }
        for a in db.query(Achievement).filter(Achievement.user_id == current_user.id).all()
    ]

    # 6. Reports
    reports = [
        {
            "report_type": r.report_type.value if hasattr(r.report_type, "value") else str(r.report_type),
            "period_start": r.period_start.isoformat(),
            "period_end": r.period_end.isoformat(),
            "summary_json": r.summary_json,
            "created_at": r.created_at.isoformat(),
        }
        for r in db.query(ProgressReport).filter(ProgressReport.user_id == current_user.id).all()
    ]

    export_payload = {
        "version": "2.0.0",
        "exported_at": datetime.utcnow().isoformat(),
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
        },
        "profiles": profiles,
        "problems": problems,
        "activities": activities,
        "goals": goals,
        "achievements": achievements,
        "reports": reports,
    }

    return export_payload


@router.get("/problems/csv")
def export_problems_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Exports user's problem library as a downloadable CSV file.
    """
    problems = (
        db.query(Problem)
        .filter(Problem.user_id == current_user.id)
        .order_by(Problem.created_at.desc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id",
        "title",
        "platform",
        "external_id",
        "url",
        "topic",
        "difficulty",
        "solve_status",
        "attempt_count",
        "is_bookmarked",
        "next_review_at",
        "solved_at",
        "notes",
    ])

    for p in problems:
        writer.writerow([
            p.id,
            p.title,
            p.platform,
            p.external_id,
            p.url or "",
            p.topic or "",
            p.difficulty,
            p.solve_status,
            p.attempt_count,
            p.is_bookmarked,
            p.next_review_at.isoformat() if p.next_review_at else "",
            p.solved_at.isoformat() if p.solved_at else "",
            p.notes or "",
        ])

    csv_data = output.getvalue()
    filename = f"todoflow_problems_{current_user.username}_{datetime.utcnow().strftime('%Y%m%d')}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
