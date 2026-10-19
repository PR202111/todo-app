import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx

from services.cache import api_cache

logger = logging.getLogger(__name__)

CF_BASE_URL = "https://codeforces.com/api"
REQUEST_TIMEOUT = 12.0  # seconds


class CodeforcesAPIError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


async def fetch_codeforces_user_info(handle: str, bypass_cache: bool = False) -> Dict[str, Any]:
    """
    Fetches Codeforces user profile from user.info API.
    Cached for 5 minutes.
    """
    clean_handle = handle.strip()
    cache_key = f"cf:user_info:{clean_handle.lower()}"
    if not bypass_cache:
        cached = api_cache.get(cache_key)
        if cached is not None:
            return cached

    url = f"{CF_BASE_URL}/user.info?handles={clean_handle}"
    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            resp = await client.get(url)
            if resp.status_code == 429:
                raise CodeforcesAPIError("Codeforces API rate limit exceeded. Please wait a moment.", status_code=429)
            if resp.status_code != 200:
                raise CodeforcesAPIError(f"Codeforces API error (HTTP {resp.status_code})", status_code=resp.status_code)
            
            data = resp.json()
            if data.get("status") != "OK":
                comment = data.get("comment", "User not found")
                raise CodeforcesAPIError(f"Codeforces user '{clean_handle}' not found: {comment}", status_code=404)

            result_list = data.get("result", [])
            if not result_list:
                raise CodeforcesAPIError(f"No profile found for handle '{clean_handle}'", status_code=404)

            user_data = result_list[0]
            # Normalize profile fields
            profile = {
                "platform": "codeforces",
                "username": user_data.get("handle", clean_handle),
                "rating": user_data.get("rating"),
                "max_rating": user_data.get("maxRating"),
                "rank_name": user_data.get("rank"),
                "avatar_url": user_data.get("titlePhoto") or user_data.get("avatar"),
                "contribution": user_data.get("contribution", 0),
                "friend_of_count": user_data.get("friendOfCount", 0),
                "profile_url": f"https://codeforces.com/profile/{clean_handle}",
            }
            api_cache.set(cache_key, profile, ttl_seconds=300)
            return profile

    except httpx.TimeoutException:
        raise CodeforcesAPIError("Codeforces API timed out. Please try again later.", status_code=504)
    except httpx.RequestError as exc:
        raise CodeforcesAPIError(f"Failed to reach Codeforces: {str(exc)}", status_code=503)


async def fetch_codeforces_rating_history(handle: str, bypass_cache: bool = False) -> List[Dict[str, Any]]:
    """
    Fetches Codeforces user rating change history from user.rating API.
    Cached for 10 minutes.
    """
    clean_handle = handle.strip()
    cache_key = f"cf:rating_history:{clean_handle.lower()}"
    if not bypass_cache:
        cached = api_cache.get(cache_key)
        if cached is not None:
            return cached

    url = f"{CF_BASE_URL}/user.rating?handle={clean_handle}"
    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return []
            data = resp.json()
            if data.get("status") != "OK":
                return []

            history = []
            for item in data.get("result", []):
                history.append({
                    "contest_id": item.get("contestId"),
                    "contest_name": item.get("contestName"),
                    "rank": item.get("rank"),
                    "old_rating": item.get("oldRating"),
                    "new_rating": item.get("newRating"),
                    "rating_time_seconds": item.get("ratingUpdateTimeSeconds"),
                    "date": datetime.fromtimestamp(item.get("ratingUpdateTimeSeconds", 0), tz=timezone.utc).strftime("%Y-%m-%d"),
                })
            api_cache.set(cache_key, history, ttl_seconds=600)
            return history
    except Exception as exc:
        logger.warning(f"Error fetching CF rating history: {exc}")
        return []


async def fetch_codeforces_user_solved(handle: str, bypass_cache: bool = False) -> Dict[str, Any]:
    """
    Calculates problems solved and practice activity from user.status.
    Cached for 10 minutes.
    """
    clean_handle = handle.strip()
    cache_key = f"cf:solved:{clean_handle.lower()}"
    if not bypass_cache:
        cached = api_cache.get(cache_key)
        if cached is not None:
            return cached

    url = f"{CF_BASE_URL}/user.status?handle={clean_handle}&from=1&count=500"
    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return {"total_solved": 0, "daily_counts": {}}
            data = resp.json()
            if data.get("status") != "OK":
                return {"total_solved": 0, "daily_counts": {}}

            solved_problems = set()
            daily_counts: Dict[str, int] = {}

            for sub in data.get("result", []):
                if sub.get("verdict") == "OK":
                    prob = sub.get("problem", {})
                    prob_id = f"{prob.get('contestId', '')}{prob.get('index', '')}"
                    if prob_id and prob_id not in solved_problems:
                        solved_problems.add(prob_id)
                        time_sec = sub.get("creationTimeSeconds", 0)
                        if time_sec:
                            day_str = datetime.fromtimestamp(time_sec, tz=timezone.utc).strftime("%Y-%m-%d")
                            daily_counts[day_str] = daily_counts.get(day_str, 0) + 1

            result = {
                "total_solved": len(solved_problems),
                "daily_counts": daily_counts,
            }
            api_cache.set(cache_key, result, ttl_seconds=600)
            return result
    except Exception as exc:
        logger.warning(f"Error fetching CF user solved: {exc}")
        return {"total_solved": 0, "daily_counts": {}}


async def fetch_codeforces_contests(bypass_cache: bool = False) -> List[Dict[str, Any]]:
    """
    Fetches upcoming and recently finished contests from contest.list.
    Cached for 15 minutes.
    """
    cache_key = "cf:contests:list"
    if not bypass_cache:
        cached = api_cache.get(cache_key)
        if cached is not None:
            return cached

    url = f"{CF_BASE_URL}/contest.list?gym=false"
    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                raise CodeforcesAPIError(f"Failed to fetch contests (HTTP {resp.status_code})")
            data = resp.json()
            if data.get("status") != "OK":
                raise CodeforcesAPIError("Codeforces returned non-OK status for contests")

            now_ts = int(datetime.now(timezone.utc).timestamp())
            three_days_ago = now_ts - (3 * 86400)

            contests = []
            for c in data.get("result", []):
                start_ts = c.get("startTimeSeconds")
                phase = c.get("phase", "BEFORE")
                # Keep upcoming (BEFORE / CODING) and recent finished (within last 3 days)
                if start_ts and (start_ts >= three_days_ago or phase in ("BEFORE", "CODING")):
                    contests.append({
                        "platform": "codeforces",
                        "external_id": str(c.get("id")),
                        "name": c.get("name"),
                        "start_time": datetime.fromtimestamp(start_ts, tz=timezone.utc).replace(tzinfo=None),
                        "duration_seconds": c.get("durationSeconds", 7200),
                        "url": f"https://codeforces.com/contest/{c.get('id')}",
                        "phase": phase,
                        "raw_data_json": json.dumps(c),
                    })

            # Sort chronological
            contests.sort(key=lambda x: x["start_time"])
            api_cache.set(cache_key, contests, ttl_seconds=900)
            return contests

    except httpx.RequestError as exc:
        logger.warning(f"Failed to reach Codeforces contests: {exc}")
        return []
