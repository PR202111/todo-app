import json
import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from dependencies import get_current_user, get_db
from models import (CodingPlatform, Contest, InAppNotification,
                    NotificationType, Priority, Task, User,
                    UserContestPreference)
from schemas import (ContestOut, ContestPreferenceUpdate,
                     ContestPrepareTaskCreate, TaskOut)
from services.codeforces import fetch_codeforces_contests
from services.leetcode import fetch_leetcode_contests

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/coding/contests", tags=["contests"])


async def sync_remote_contests_to_db(db: Session):
    """
    Fetches remote contests from Codeforces and LeetCode and upserts into local DB.
    """
    try:
        cf_contests = await fetch_codeforces_contests()
    except Exception as e:
        logger.warning(f"Error fetching CF contests: {e}")
        cf_contests = []

    try:
        lc_contests = await fetch_leetcode_contests()
    except Exception as e:
        logger.warning(f"Error fetching LC contests: {e}")
        lc_contests = []

    all_remote = cf_contests + lc_contests

    for c in all_remote:
        plat_enum = CodingPlatform(c["platform"])
        existing = (
            db.query(Contest)
            .filter(
                Contest.platform == plat_enum,
                Contest.external_id == str(c["external_id"]),
            )
            .first()
        )
        if existing:
            existing.name = c["name"]
            existing.start_time = c["start_time"]
            existing.duration_seconds = c["duration_seconds"]
            existing.url = c["url"]
            existing.phase = c["phase"]
            existing.last_synced_at = datetime.utcnow()
        else:
            new_contest = Contest(
                platform=plat_enum,
                external_id=str(c["external_id"]),
                name=c["name"],
                start_time=c["start_time"],
                duration_seconds=c["duration_seconds"],
                url=c["url"],
                phase=c["phase"],
                raw_data_json=c.get("raw_data_json"),
                last_synced_at=datetime.utcnow(),
            )
            db.add(new_contest)

    db.commit()


@router.get("", response_model=List[ContestOut])
async def get_contests(
    platform: Optional[str] = Query(default="all"),
    upcoming_only: bool = Query(default=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns unified, chronologically sorted list of contests.
    Includes user-specific interest and preparation task status.
    """
    # Sync remote contests into DB (uses cache internally)
    await sync_remote_contests_to_db(db)

    query = db.query(Contest)
    if platform and platform != "all":
        try:
            plat_enum = CodingPlatform(platform.lower())
            query = query.filter(Contest.platform == plat_enum)
        except ValueError:
            pass

    if upcoming_only:
        now = datetime.utcnow()
        # Keep contests whose end time or phase indicates they are upcoming or currently coding
        query = query.filter(Contest.phase.in_(["BEFORE", "CODING"]))

    contests = query.order_by(Contest.start_time.asc()).all()

    # Fetch user preferences
    prefs = (
        db.query(UserContestPreference)
        .filter(UserContestPreference.user_id == current_user.id)
        .all()
    )
    pref_map = {p.contest_id: p for p in prefs}

    results = []
    for c in contests:
        pref = pref_map.get(c.id)
        results.append(
            ContestOut(
                id=c.id,
                platform=c.platform.value if hasattr(c.platform, "value") else str(c.platform),
                external_id=c.external_id,
                name=c.name,
                start_time=c.start_time,
                duration_seconds=c.duration_seconds,
                url=c.url,
                phase=c.phase,
                last_synced_at=c.last_synced_at,
                is_interested=pref.is_interested if pref else False,
                preparation_task_id=pref.preparation_task_id if pref else None,
            )
        )

    return results


@router.post("/{contest_id}/preference")
def toggle_contest_preference(
    contest_id: int,
    data: ContestPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Marks or unmarks a contest as interested for the current user.
    """
    contest = db.query(Contest).filter(Contest.id == contest_id).first()
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")

    pref = (
        db.query(UserContestPreference)
        .filter(
            UserContestPreference.user_id == current_user.id,
            UserContestPreference.contest_id == contest_id,
        )
        .first()
    )

    if pref:
        pref.is_interested = data.is_interested
        pref.updated_at = datetime.utcnow()
    else:
        pref = UserContestPreference(
            user_id=current_user.id,
            contest_id=contest_id,
            is_interested=data.is_interested,
        )
        db.add(pref)

    db.commit()
    return {"status": "ok", "contest_id": contest_id, "is_interested": pref.is_interested}


@router.post("/{contest_id}/prepare-task", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_contest_prepare_task(
    contest_id: int,
    data: ContestPrepareTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Creates a TodoFlow Task directly linked to this contest.
    Sets contest preference to interested and attaches preparation_task_id.
    """
    contest = db.query(Contest).filter(Contest.id == contest_id).first()
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")

    task_title = data.title or f"Prepare for {contest.name}"
    due_date = data.due_date or contest.start_time

    # Find highest order
    last_task = (
        db.query(Task)
        .filter(Task.user_id == current_user.id)
        .order_by(Task.order.desc())
        .first()
    )
    next_order = (last_task.order + 1) if last_task else 0

    priority_val = Priority.high
    if hasattr(Priority, data.priority):
        priority_val = Priority[data.priority]

    task = Task(
        title=task_title,
        description=f"Contest: {contest.name}\nPlatform: {contest.platform.value if hasattr(contest.platform, 'value') else contest.platform}\nContest URL: {contest.url}",
        priority=priority_val,
        due_date=due_date,
        order=next_order,
        user_id=current_user.id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # Link in UserContestPreference
    pref = (
        db.query(UserContestPreference)
        .filter(
            UserContestPreference.user_id == current_user.id,
            UserContestPreference.contest_id == contest_id,
        )
        .first()
    )
    if pref:
        pref.is_interested = True
        pref.preparation_task_id = task.id
        pref.updated_at = datetime.utcnow()
    else:
        pref = UserContestPreference(
            user_id=current_user.id,
            contest_id=contest_id,
            is_interested=True,
            preparation_task_id=task.id,
        )
        db.add(pref)

    # Also generate an InAppNotification for the user
    notif = InAppNotification(
        user_id=current_user.id,
        title="Contest Prep Task Created",
        message=f"Added '{task_title}' to your TodoFlow tasks for {contest.name}.",
        notification_type=NotificationType.contest_reminder,
        metadata_json=json.dumps({"contest_id": contest_id, "task_id": task.id}),
    )
    db.add(notif)
    db.commit()

    return task
