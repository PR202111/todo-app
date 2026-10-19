import json
import logging
from datetime import date, datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from dependencies import get_current_user, get_db
from models import CodingPlatform, CodingProfile, PracticeActivity, User
from schemas import CodingProfileLink, CodingProfileOut
from services.analytics import update_goal_progress
from services.codeforces import (CodeforcesAPIError,
                                fetch_codeforces_rating_history,
                                fetch_codeforces_user_info,
                                fetch_codeforces_user_solved)
from services.leetcode import (LeetCodeAPIError,
                               fetch_leetcode_contest_history,
                               fetch_leetcode_user_profile)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/coding/profiles", tags=["coding_profiles"])


def format_profile_out(profile: CodingProfile) -> CodingProfileOut:
    plat = profile.platform.value if hasattr(profile.platform, "value") else str(profile.platform)
    profile_url = (
        f"https://codeforces.com/profile/{profile.username}"
        if plat == "codeforces"
        else f"https://leetcode.com/{profile.username}"
    )
    return CodingProfileOut(
        id=profile.id,
        user_id=profile.user_id,
        platform=plat,
        username=profile.username,
        rating=profile.rating,
        max_rating=profile.max_rating,
        rank_name=profile.rank_name,
        global_rank=profile.global_rank,
        problems_solved=profile.problems_solved,
        easy_solved=profile.easy_solved,
        medium_solved=profile.medium_solved,
        hard_solved=profile.hard_solved,
        raw_stats_json=profile.raw_stats_json,
        last_refreshed_at=profile.last_refreshed_at,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
        profile_url=profile_url,
    )


async def sync_profile_data(profile: CodingProfile, db: Session, bypass_cache: bool = False):
    """
    Fetches latest stats from platform API and updates profile + practice activities.
    """
    plat = profile.platform.value if hasattr(profile.platform, "value") else str(profile.platform)

    if plat == "codeforces":
        info = await fetch_codeforces_user_info(profile.username, bypass_cache=bypass_cache)
        profile.rating = info.get("rating")
        profile.max_rating = info.get("max_rating")
        profile.rank_name = info.get("rank_name")
        profile.last_refreshed_at = datetime.utcnow()

        # Fetch solved stats and daily submissions
        solved_info = await fetch_codeforces_user_solved(profile.username, bypass_cache=bypass_cache)
        profile.problems_solved = solved_info.get("total_solved", 0)

        # Store raw stats
        profile.raw_stats_json = json.dumps({
            "contribution": info.get("contribution"),
            "friend_of_count": info.get("friend_of_count"),
            "avatar_url": info.get("avatar_url"),
        })

        # Sync recent daily submissions into PracticeActivity
        daily_counts = solved_info.get("daily_counts", {})
        for day_str, count in daily_counts.items():
            try:
                act_date = date.fromisoformat(day_str)
                existing_act = (
                    db.query(PracticeActivity)
                    .filter(
                        PracticeActivity.user_id == profile.user_id,
                        PracticeActivity.platform == "codeforces",
                        PracticeActivity.activity_date == act_date,
                    )
                    .first()
                )
                if existing_act:
                    existing_act.problems_solved = max(existing_act.problems_solved, count)
                else:
                    new_act = PracticeActivity(
                        user_id=profile.user_id,
                        platform="codeforces",
                        activity_date=act_date,
                        problems_solved=count,
                        source="synced",
                    )
                    db.add(new_act)
            except Exception as e:
                logger.debug(f"Could not parse daily activity date {day_str}: {e}")

    elif plat == "leetcode":
        info = await fetch_leetcode_user_profile(profile.username, bypass_cache=bypass_cache)
        profile.rating = info.get("rating")
        profile.max_rating = info.get("max_rating")
        profile.rank_name = info.get("rank_name")
        profile.global_rank = info.get("global_rank")
        profile.problems_solved = info.get("problems_solved", 0)
        profile.easy_solved = info.get("easy_solved", 0)
        profile.medium_solved = info.get("medium_solved", 0)
        profile.hard_solved = info.get("hard_solved", 0)
        profile.last_refreshed_at = datetime.utcnow()

        profile.raw_stats_json = json.dumps({
            "avatar_url": info.get("avatar_url"),
            "attended_contests_count": info.get("attended_contests_count", 0),
        })

    profile.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(profile)

    # Automatically trigger goal progress evaluation
    update_goal_progress(db, profile.user_id)


@router.get("", response_model=List[CodingProfileOut])
def get_coding_profiles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns all linked coding profiles for the authenticated user.
    """
    profiles = (
        db.query(CodingProfile)
        .filter(CodingProfile.user_id == current_user.id)
        .order_by(CodingProfile.created_at.asc())
        .all()
    )
    return [format_profile_out(p) for p in profiles]


@router.post("", response_model=CodingProfileOut, status_code=status.HTTP_201_CREATED)
async def link_coding_profile(
    data: CodingProfileLink,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Links a Codeforces or LeetCode handle to the user's account and syncs initial stats.
    """
    plat_str = data.platform.lower().strip()
    username = data.username.strip()

    if plat_str not in ("codeforces", "leetcode"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported platform '{data.platform}'. Supported: codeforces, leetcode",
        )

    if not username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username cannot be empty")

    # Check if this user already linked this platform
    existing = (
        db.query(CodingProfile)
        .filter(
            CodingProfile.user_id == current_user.id,
            CodingProfile.platform == CodingPlatform(plat_str),
        )
        .first()
    )

    if existing:
        # Update handle
        existing.username = username
        target_profile = existing
    else:
        target_profile = CodingProfile(
            user_id=current_user.id,
            platform=CodingPlatform(plat_str),
            username=username,
        )
        db.add(target_profile)
        db.commit()
        db.refresh(target_profile)

    # Sync statistics from platform
    try:
        await sync_profile_data(target_profile, db, bypass_cache=True)
    except (CodeforcesAPIError, LeetCodeAPIError) as exc:
        # Still retain profile if already saved or rollback if creation failed?
        # Requirement: "If the integration fails, retain the linked username and external profile link."
        # If it was a 404 (user doesn't exist), report bad request so user can fix typo
        if getattr(exc, "status_code", 400) == 404:
            if not existing:
                db.delete(target_profile)
                db.commit()
            raise HTTPException(status_code=404, detail=str(exc.message))
        # Otherwise log and preserve profile
        logger.warning(f"Error syncing profile on link: {exc}")
    except Exception as exc:
        logger.error(f"Unexpected error linking profile: {exc}")

    db.refresh(target_profile)
    return format_profile_out(target_profile)


@router.post("/{profile_id}/refresh", response_model=CodingProfileOut)
async def refresh_coding_profile(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Manually refreshes stats for a specific linked profile.
    """
    profile = (
        db.query(CodingProfile)
        .filter(CodingProfile.id == profile_id, CodingProfile.user_id == current_user.id)
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Coding profile not found")

    try:
        await sync_profile_data(profile, db, bypass_cache=True)
    except (CodeforcesAPIError, LeetCodeAPIError) as exc:
        raise HTTPException(status_code=getattr(exc, "status_code", 400), detail=str(exc.message))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to refresh profile: {str(exc)}")

    return format_profile_out(profile)


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def unlink_coding_profile(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Unlinks a coding profile.
    """
    profile = (
        db.query(CodingProfile)
        .filter(CodingProfile.id == profile_id, CodingProfile.user_id == current_user.id)
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Coding profile not found")

    db.delete(profile)
    db.commit()
