import json
import logging
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from dependencies import get_current_user, get_db
from models import (Contest, InAppNotification, NotificationType, User,
                    UserContestPreference)
from schemas import InAppNotificationOut

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/coding/notifications", tags=["notifications"])


def format_notification(n: InAppNotification) -> InAppNotificationOut:
    return InAppNotificationOut(
        id=n.id,
        user_id=n.user_id,
        title=n.title,
        message=n.message,
        notification_type=n.notification_type.value if hasattr(n.notification_type, "value") else str(n.notification_type),
        is_read=n.is_read,
        metadata_json=n.metadata_json,
        created_at=n.created_at,
    )


def check_and_generate_contest_reminders(db: Session, user_id: int):
    """
    Checks if there are interested upcoming contests within the next 24 hours
    that haven't already generated a notification for this user.
    """
    now = datetime.utcnow()
    in_24h = now + timedelta(hours=24)

    interested_prefs = (
        db.query(UserContestPreference)
        .filter(UserContestPreference.user_id == user_id, UserContestPreference.is_interested == True)
        .all()
    )

    for pref in interested_prefs:
        contest = db.query(Contest).filter(Contest.id == pref.contest_id).first()
        if contest and now <= contest.start_time <= in_24h:
            # Check if notification already exists
            existing = (
                db.query(InAppNotification)
                .filter(
                    InAppNotification.user_id == user_id,
                    InAppNotification.notification_type == NotificationType.contest_reminder,
                )
                .all()
            )
            already_notified = any(
                n.metadata_json and f'"contest_id": {contest.id}' in n.metadata_json
                for n in existing
            )
            if not already_notified:
                time_diff = contest.start_time - now
                hours = int(time_diff.total_seconds() // 3600)
                minutes = int((time_diff.total_seconds() % 3600) // 60)
                time_str = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"

                notif = InAppNotification(
                    user_id=user_id,
                    title="Upcoming Contest Alert! ⏰",
                    message=f"'{contest.name}' starts in approximately {time_str}.",
                    notification_type=NotificationType.contest_reminder,
                    metadata_json=json.dumps({"contest_id": contest.id}),
                )
                db.add(notif)
                db.commit()


@router.get("", response_model=List[InAppNotificationOut])
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns in-app notifications for the current user.
    """
    check_and_generate_contest_reminders(db, current_user.id)
    notifs = (
        db.query(InAppNotification)
        .filter(InAppNotification.user_id == current_user.id)
        .order_by(InAppNotification.created_at.desc())
        .limit(50)
        .all()
    )
    return [format_notification(n) for n in notifs]


@router.post("/{notification_id}/read", response_model=InAppNotificationOut)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Marks an individual notification as read.
    """
    notif = (
        db.query(InAppNotification)
        .filter(
            InAppNotification.id == notification_id,
            InAppNotification.user_id == current_user.id,
        )
        .first()
    )
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return format_notification(notif)


@router.post("/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Marks all notifications for the current user as read.
    """
    db.query(InAppNotification).filter(
        InAppNotification.user_id == current_user.id,
        InAppNotification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}
