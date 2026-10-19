import json
import logging
from datetime import date, datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from dependencies import get_current_user, get_db
from models import (CodingGoal, PracticeActivity, ProgressReport, ReportType,
                    User)
from schemas import ProgressReportOut

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/coding/reports", tags=["reports"])


def format_report_out(rep: ProgressReport) -> ProgressReportOut:
    return ProgressReportOut(
        id=rep.id,
        user_id=rep.user_id,
        report_type=rep.report_type.value if hasattr(rep.report_type, "value") else str(rep.report_type),
        period_start=rep.period_start,
        period_end=rep.period_end,
        summary_json=rep.summary_json,
        created_at=rep.created_at,
    )


@router.get("", response_model=List[ProgressReportOut])
def get_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns progress reports for the current user.
    """
    reports = (
        db.query(ProgressReport)
        .filter(ProgressReport.user_id == current_user.id)
        .order_by(ProgressReport.created_at.desc())
        .limit(20)
        .all()
    )
    return [format_report_out(r) for r in reports]


@router.post("/generate", response_model=ProgressReportOut, status_code=status.HTTP_201_CREATED)
def generate_report(
    report_type: str = Query(default="weekly"),  # daily | weekly
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generates an automated daily or weekly progress report summarizing practice activity,
    problems solved, active days, and goals progress.
    """
    rtype_clean = report_type.lower()
    if rtype_clean not in ("daily", "weekly"):
        raise HTTPException(status_code=400, detail="report_type must be 'daily' or 'weekly'")

    rtype_enum = ReportType.daily if rtype_clean == "daily" else ReportType.weekly
    now = datetime.utcnow()

    if rtype_clean == "daily":
        start_date = date.today()
        end_date = start_date
        period_start = datetime.combine(start_date, datetime.min.time())
        period_end = datetime.combine(end_date, datetime.max.time())
    else:
        # Weekly: Last 7 days
        start_date = date.today() - timedelta(days=6)
        end_date = date.today()
        period_start = datetime.combine(start_date, datetime.min.time())
        period_end = datetime.combine(end_date, datetime.max.time())

    # Query activities in period
    activities = (
        db.query(PracticeActivity)
        .filter(
            PracticeActivity.user_id == current_user.id,
            PracticeActivity.activity_date >= start_date,
            PracticeActivity.activity_date <= end_date,
        )
        .all()
    )

    total_problems = sum(a.problems_solved for a in activities)
    contests_count = sum(a.contests_attended for a in activities)
    active_days = len(set(a.activity_date for a in activities if a.problems_solved > 0 or a.contests_attended > 0))

    # Platform breakdown
    platform_problems = {}
    for a in activities:
        platform_problems[a.platform] = platform_problems.get(a.platform, 0) + a.problems_solved

    # Goals completed or active
    goals = db.query(CodingGoal).filter(CodingGoal.user_id == current_user.id).all()
    completed_goals = [g.title for g in goals if g.is_completed]
    active_goals = [g.title for g in goals if g.is_active and not g.is_completed]

    summary = {
        "period": rtype_clean,
        "date_range": f"{start_date.isoformat()} to {end_date.isoformat()}",
        "total_problems_solved": total_problems,
        "active_days": active_days,
        "contests_attended": contests_count,
        "platform_breakdown": platform_problems,
        "completed_goals": completed_goals,
        "active_goals": active_goals,
        "generated_at": now.isoformat(),
    }

    report = ProgressReport(
        user_id=current_user.id,
        report_type=rtype_enum,
        period_start=period_start,
        period_end=period_end,
        summary_json=json.dumps(summary),
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return format_report_out(report)
