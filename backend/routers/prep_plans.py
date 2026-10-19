import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from dependencies import get_current_user, get_db
from models import Contest, ContestPrepPlan, User
from schemas import ContestPrepPlanCreate, ContestPrepPlanOut, ContestPrepPlanUpdate
from services.planner import check_and_unlock_achievements

router = APIRouter(prefix="/coding/contests", tags=["contest_prep_plans"])

DEFAULT_CHECKLIST = [
    {"id": "c1", "text": "Review fast I/O & template code", "completed": False},
    {"id": "c2", "text": "Solve 2 warm-up problems from previous rounds", "completed": False},
    {"id": "c3", "text": "Test IDE / local debugger setup", "completed": False},
    {"id": "c4", "text": "Review formulas / algorithms for identified weak topics", "completed": False},
    {"id": "c5", "text": "Post-contest: Upsolve at least 1 problem missed during round", "completed": False},
]


def format_prep_plan(plan: ContestPrepPlan) -> ContestPrepPlanOut:
    return ContestPrepPlanOut(
        id=plan.id,
        contest_id=plan.contest_id,
        user_id=plan.user_id,
        checklist_json=plan.checklist_json,
        virtual_practice_notes=plan.virtual_practice_notes,
        post_contest_reflection=plan.post_contest_reflection,
        completion_percentage=plan.completion_percentage,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )


@router.get("/{contest_id}/prep-plan", response_model=ContestPrepPlanOut)
def get_or_create_contest_prep_plan(
    contest_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves or deterministically initializes a structured contest preparation workspace.
    """
    contest = db.query(Contest).filter(Contest.id == contest_id).first()
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")

    plan = (
        db.query(ContestPrepPlan)
        .filter(
            ContestPrepPlan.contest_id == contest_id,
            ContestPrepPlan.user_id == current_user.id,
        )
        .first()
    )

    if not plan:
        plan = ContestPrepPlan(
            contest_id=contest_id,
            user_id=current_user.id,
            checklist_json=json.dumps(DEFAULT_CHECKLIST),
            virtual_practice_notes=None,
            post_contest_reflection=None,
            completion_percentage=0.0,
        )
        db.add(plan)
        db.commit()
        db.refresh(plan)

    return format_prep_plan(plan)


@router.patch("/{contest_id}/prep-plan", response_model=ContestPrepPlanOut)
def update_contest_prep_plan(
    contest_id: int,
    data: ContestPrepPlanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Updates the preparation checklist, reflection, or practice notes.
    """
    plan = (
        db.query(ContestPrepPlan)
        .filter(
            ContestPrepPlan.contest_id == contest_id,
            ContestPrepPlan.user_id == current_user.id,
        )
        .first()
    )
    if not plan:
        raise HTTPException(status_code=404, detail="Preparation plan not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(plan, key, value)

    # Automatically compute completion percentage if checklist_json was updated
    if data.checklist_json:
        try:
            items = json.loads(data.checklist_json)
            if isinstance(items, list) and len(items) > 0:
                completed_count = sum(1 for it in items if it.get("completed"))
                plan.completion_percentage = round((completed_count / len(items)) * 100.0, 1)
        except Exception:
            pass

    plan.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(plan)

    # If 100% completed, check for achievement
    if plan.completion_percentage >= 100.0:
        check_and_unlock_achievements(db, current_user.id)

    return format_prep_plan(plan)
