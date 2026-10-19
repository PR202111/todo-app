import json
import logging
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from dependencies import get_current_user, get_db
from models import CodingGoal, GoalType, InAppNotification, NotificationType, User
from schemas import CodingGoalCreate, CodingGoalOut, CodingGoalUpdate
from services.analytics import update_goal_progress

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/coding/goals", tags=["goals"])


def format_goal_out(goal: CodingGoal) -> CodingGoalOut:
    return CodingGoalOut(
        id=goal.id,
        user_id=goal.user_id,
        title=goal.title,
        goal_type=goal.goal_type.value if hasattr(goal.goal_type, "value") else str(goal.goal_type),
        target_value=goal.target_value,
        current_value=goal.current_value,
        platform=goal.platform,
        deadline=goal.deadline,
        is_active=goal.is_active,
        is_completed=goal.is_completed,
        created_at=goal.created_at,
        updated_at=goal.updated_at,
    )


@router.get("", response_model=List[CodingGoalOut])
def get_coding_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns all coding goals for the current user with freshly updated progress values.
    """
    update_goal_progress(db, current_user.id)
    goals = (
        db.query(CodingGoal)
        .filter(CodingGoal.user_id == current_user.id)
        .order_by(CodingGoal.created_at.desc())
        .all()
    )
    return [format_goal_out(g) for g in goals]


@router.post("", response_model=CodingGoalOut, status_code=status.HTTP_201_CREATED)
def create_coding_goal(
    data: CodingGoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Creates a new personal coding goal.
    Supported types: daily_problems, weekly_problems, weekly_days, target_rating, contest_prep.
    """
    try:
        gtype = GoalType(data.goal_type)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid goal_type '{data.goal_type}'. Must be one of: {[e.value for e in GoalType]}",
        )

    goal = CodingGoal(
        user_id=current_user.id,
        title=data.title,
        goal_type=gtype,
        target_value=data.target_value,
        current_value=0.0,
        platform=data.platform or "all",
        deadline=data.deadline,
        is_active=True,
        is_completed=False,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)

    # Immediately recalculate to see if current stats already satisfy/progress the goal
    update_goal_progress(db, current_user.id)
    db.refresh(goal)

    return format_goal_out(goal)


@router.patch("/{goal_id}", response_model=CodingGoalOut)
def update_coding_goal(
    goal_id: int,
    data: CodingGoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Updates an existing coding goal.
    """
    goal = (
        db.query(CodingGoal)
        .filter(CodingGoal.id == goal_id, CodingGoal.user_id == current_user.id)
        .first()
    )
    if not goal:
        raise HTTPException(status_code=404, detail="Coding goal not found")

    was_completed = goal.is_completed

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(goal, key, value)

    if goal.current_value >= goal.target_value:
        goal.is_completed = True

    goal.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(goal)

    # If completed just now, send notification
    if goal.is_completed and not was_completed:
        notif = InAppNotification(
            user_id=current_user.id,
            title="Goal Achieved! 🎯",
            message=f"Congratulations! You've achieved your goal: '{goal.title}'.",
            notification_type=NotificationType.goal_completed,
            metadata_json=json.dumps({"goal_id": goal.id}),
        )
        db.add(notif)
        db.commit()

    return format_goal_out(goal)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_coding_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Deletes a coding goal.
    """
    goal = (
        db.query(CodingGoal)
        .filter(CodingGoal.id == goal_id, CodingGoal.user_id == current_user.id)
        .first()
    )
    if not goal:
        raise HTTPException(status_code=404, detail="Coding goal not found")

    db.delete(goal)
    db.commit()
