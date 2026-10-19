import re
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from dependencies import get_current_user, get_db
from models import Problem, ProblemReview, User
from schemas import (
    PracticePlanOut,
    ProblemCreate,
    ProblemOut,
    ProblemReviewCreate,
    ProblemReviewOut,
    ProblemUpdate,
)
from services.planner import (
    calculate_sm2_interval,
    check_and_unlock_achievements,
    generate_deterministic_practice_plan,
)

router = APIRouter(prefix="/coding/problems", tags=["problems"])


def slugify(text: str) -> str:
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[-\s]+", "-", text)


@router.get("", response_model=List[ProblemOut])
def get_problems(
    search: Optional[str] = Query(default=None),
    platform: Optional[str] = Query(default=None),
    topic: Optional[str] = Query(default=None),
    difficulty: Optional[str] = Query(default=None),
    solve_status: Optional[str] = Query(default=None),
    is_bookmarked: Optional[bool] = Query(default=None),
    due_only: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Search and filter user's personal problem library.
    """
    query = db.query(Problem).filter(Problem.user_id == current_user.id)

    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            (Problem.title.ilike(s))
            | (Problem.external_id.ilike(s))
            | (Problem.topic.ilike(s))
            | (Problem.notes.ilike(s))
        )

    if platform and platform != "all":
        query = query.filter(Problem.platform == platform.lower())

    if topic and topic != "all":
        query = query.filter(Problem.topic == topic)

    if difficulty and difficulty != "all":
        query = query.filter(Problem.difficulty == difficulty)

    if solve_status and solve_status != "all":
        query = query.filter(Problem.solve_status == solve_status)

    if is_bookmarked is not None:
        query = query.filter(Problem.is_bookmarked == is_bookmarked)

    if due_only:
        now = datetime.utcnow()
        query = query.filter(Problem.next_review_at != None, Problem.next_review_at <= now)

    return query.order_by(Problem.is_bookmarked.desc(), Problem.updated_at.desc()).all()


@router.post("", response_model=ProblemOut, status_code=status.HTTP_201_CREATED)
def create_problem(
    data: ProblemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Adds a problem to the personal library with duplicate prevention.
    """
    ext_id = (data.external_id or slugify(data.title)).strip()
    plat = (data.platform or "leetcode").lower().strip()

    # Duplicate check
    existing = (
        db.query(Problem)
        .filter(
            Problem.user_id == current_user.id,
            Problem.platform == plat,
            Problem.external_id == ext_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Problem '{data.title}' ({plat} / {ext_id}) already exists in your library.",
        )

    now = datetime.utcnow()
    solved_at = now if data.solve_status == "solved" else None
    next_review = (
        data.next_review_at
        or (now + (timedelta(days=1) if data.solve_status == "solved" else timedelta(days=0)))
        if data.solve_status == "solved"
        else None
    )

    problem = Problem(
        user_id=current_user.id,
        title=data.title.strip(),
        url=data.url.strip() if data.url else None,
        platform=plat,
        external_id=ext_id,
        topic=data.topic.strip() if data.topic else None,
        difficulty=data.difficulty,
        solve_status=data.solve_status,
        attempt_count=1,
        first_attempt_at=now,
        last_attempt_at=now,
        solved_at=solved_at,
        notes=data.notes,
        revision_notes=data.revision_notes,
        is_bookmarked=data.is_bookmarked,
        next_review_at=next_review,
        review_interval_days=1,
        review_count=0,
        ease_factor=2.5,
        is_verified_submission=data.is_verified_submission,
    )
    db.add(problem)
    db.commit()
    db.refresh(problem)

    # Check for newly unlocked achievements
    check_and_unlock_achievements(db, current_user.id)

    return problem


@router.get("/revision/queue", response_model=List[ProblemOut])
def get_revision_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns all problems currently due or overdue for spaced repetition revision.
    """
    now = datetime.utcnow()
    return (
        db.query(Problem)
        .filter(
            Problem.user_id == current_user.id,
            Problem.next_review_at != None,
            Problem.next_review_at <= now,
        )
        .order_by(Problem.next_review_at.asc())
        .all()
    )


@router.get("/plan", response_model=PracticePlanOut)
def get_practice_plan(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Deterministic Practice Planner: evaluates spaced repetition queues,
    weak topics, and upcoming contests using explicit rules without any AI.
    """
    return generate_deterministic_practice_plan(db, current_user.id)


@router.get("/{problem_id}", response_model=ProblemOut)
def get_problem(
    problem_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    problem = (
        db.query(Problem)
        .filter(Problem.id == problem_id, Problem.user_id == current_user.id)
        .first()
    )
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    return problem


@router.patch("/{problem_id}", response_model=ProblemOut)
def update_problem(
    problem_id: int,
    data: ProblemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    problem = (
        db.query(Problem)
        .filter(Problem.id == problem_id, Problem.user_id == current_user.id)
        .first()
    )
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    was_solved = problem.solve_status == "solved"

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(problem, key, value)

    # If newly marked as solved
    if problem.solve_status == "solved" and not was_solved:
        problem.solved_at = datetime.utcnow()
        if not problem.next_review_at:
            problem.next_review_at = datetime.utcnow() + timedelta(days=1)

    problem.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(problem)

    check_and_unlock_achievements(db, current_user.id)
    return problem


@router.delete("/{problem_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_problem(
    problem_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    problem = (
        db.query(Problem)
        .filter(Problem.id == problem_id, Problem.user_id == current_user.id)
        .first()
    )
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    db.delete(problem)
    db.commit()


@router.post("/{problem_id}/review", response_model=ProblemOut)
def record_problem_review(
    problem_id: int,
    data: ProblemReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Submits a spaced repetition review outcome (1: Again, 2: Hard, 3: Good, 4: Easy).
    Computes new interval deterministically using the SM-2 algorithm.
    """
    problem = (
        db.query(Problem)
        .filter(Problem.id == problem_id, Problem.user_id == current_user.id)
        .first()
    )
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    if data.rating not in (1, 2, 3, 4):
        raise HTTPException(status_code=400, detail="Rating must be 1 (Again), 2 (Hard), 3 (Good), or 4 (Easy)")

    new_count, new_interval, new_ease, next_review = calculate_sm2_interval(
        current_count=problem.review_count,
        current_interval=problem.review_interval_days,
        current_ease=problem.ease_factor,
        rating=data.rating,
    )

    problem.review_count = new_count
    problem.review_interval_days = new_interval
    problem.ease_factor = new_ease
    problem.next_review_at = next_review
    problem.updated_at = datetime.utcnow()

    review_record = ProblemReview(
        problem_id=problem.id,
        user_id=current_user.id,
        reviewed_at=datetime.utcnow(),
        rating=data.rating,
        scheduled_next=next_review,
        notes=data.notes,
    )
    db.add(review_record)
    db.commit()
    db.refresh(problem)

    check_and_unlock_achievements(db, current_user.id)
    return problem
