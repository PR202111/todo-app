import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx

from services.cache import api_cache

logger = logging.getLogger(__name__)

LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql"
REQUEST_TIMEOUT = 12.0  # seconds

# Standard LeetCode public profile GraphQL query
USER_PROFILE_QUERY = """
query getUserProfile($username: String!) {
  matchedUser(username: $username) {
    username
    profile {
      realName
      userAvatar
      ranking
      reputation
    }
    submitStatsGlobal {
      acSubmissionNum {
        difficulty
        count
        submissions
      }
    }
  }
  userContestRanking(username: $username) {
    attendedContestsCount
    rating
    globalRanking
    totalParticipants
    topPercentage
  }
}
"""

USER_CONTEST_HISTORY_QUERY = """
query getUserContestHistory($username: String!) {
  userContestRankingHistory(username: $username) {
    attended
    rating
    ranking
    contest {
      title
      startTime
    }
  }
}
"""


class LeetCodeAPIError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


async def fetch_leetcode_user_profile(username: str, bypass_cache: bool = False) -> Dict[str, Any]:
    """
    Fetches LeetCode user statistics and ranking via public GraphQL endpoint.
    Cached for 5 minutes.
    """
    clean_username = username.strip()
    cache_key = f"lc:profile:{clean_username.lower()}"
    if not bypass_cache:
        cached = api_cache.get(cache_key)
        if cached is not None:
            return cached

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": f"https://leetcode.com/{clean_username}/",
    }

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, follow_redirects=True) as client:
            resp = await client.post(
                LEETCODE_GRAPHQL_URL,
                json={"query": USER_PROFILE_QUERY, "variables": {"username": clean_username}},
                headers=headers,
            )

            if resp.status_code == 429:
                raise LeetCodeAPIError("LeetCode API rate limit reached. Please try again in a few minutes.", status_code=429)
            if resp.status_code != 200:
                raise LeetCodeAPIError(f"LeetCode server returned status {resp.status_code}", status_code=resp.status_code)

            data = resp.json()
            if "errors" in data and not data.get("data", {}).get("matchedUser"):
                err_msg = data["errors"][0].get("message", "User not found")
                raise LeetCodeAPIError(f"LeetCode user '{clean_username}' not found: {err_msg}", status_code=404)

            matched_user = data.get("data", {}).get("matchedUser")
            if not matched_user:
                raise LeetCodeAPIError(f"LeetCode user '{clean_username}' does not exist", status_code=404)

            # Extract submissions breakdown
            submit_stats = matched_user.get("submitStatsGlobal", {}).get("acSubmissionNum", [])
            total_solved = 0
            easy_solved = 0
            medium_solved = 0
            hard_solved = 0

            for stat in submit_stats:
                diff = stat.get("difficulty", "").lower()
                count = stat.get("count", 0)
                if diff == "all":
                    total_solved = count
                elif diff == "easy":
                    easy_solved = count
                elif diff == "medium":
                    medium_solved = count
                elif diff == "hard":
                    hard_solved = count

            profile_data = matched_user.get("profile", {})
            contest_ranking = data.get("data", {}).get("userContestRanking") or {}

            rating = None
            if contest_ranking and contest_ranking.get("rating") is not None:
                rating = int(round(contest_ranking["rating"]))

            profile = {
                "platform": "leetcode",
                "username": matched_user.get("username", clean_username),
                "rating": rating,
                "max_rating": rating,  # LeetCode GraphQL exposes current rating
                "rank_name": f"Top {round(contest_ranking.get('topPercentage', 0), 1)}%" if contest_ranking.get("topPercentage") else None,
                "global_rank": contest_ranking.get("globalRanking") or profile_data.get("ranking"),
                "problems_solved": total_solved,
                "easy_solved": easy_solved,
                "medium_solved": medium_solved,
                "hard_solved": hard_solved,
                "avatar_url": profile_data.get("userAvatar"),
                "profile_url": f"https://leetcode.com/{clean_username}",
                "attended_contests_count": contest_ranking.get("attendedContestsCount", 0),
            }

            api_cache.set(cache_key, profile, ttl_seconds=300)
            return profile

    except httpx.TimeoutException:
        raise LeetCodeAPIError("LeetCode API timed out. Please try again later.", status_code=504)
    except httpx.RequestError as exc:
        raise LeetCodeAPIError(f"Unable to reach LeetCode: {str(exc)}", status_code=503)


async def fetch_leetcode_contest_history(username: str, bypass_cache: bool = False) -> List[Dict[str, Any]]:
    """
    Fetches LeetCode contest rating history if supported.
    Cached for 10 minutes.
    """
    clean_username = username.strip()
    cache_key = f"lc:contest_history:{clean_username.lower()}"
    if not bypass_cache:
        cached = api_cache.get(cache_key)
        if cached is not None:
            return cached

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    }

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, follow_redirects=True) as client:
            resp = await client.post(
                LEETCODE_GRAPHQL_URL,
                json={"query": USER_CONTEST_HISTORY_QUERY, "variables": {"username": clean_username}},
                headers=headers,
            )
            if resp.status_code != 200:
                return []
            data = resp.json()
            items = data.get("data", {}).get("userContestRankingHistory", []) or []

            history = []
            for item in items:
                if item.get("attended"):
                    contest = item.get("contest", {})
                    start_time = contest.get("startTime", 0)
                    date_str = datetime.fromtimestamp(start_time, tz=timezone.utc).strftime("%Y-%m-%d") if start_time else ""
                    history.append({
                        "contest_name": contest.get("title"),
                        "rating": int(round(item.get("rating", 0))),
                        "rank": item.get("ranking"),
                        "date": date_str,
                    })

            api_cache.set(cache_key, history, ttl_seconds=600)
            return history
    except Exception as exc:
        logger.warning(f"Error fetching LC contest history: {exc}")
        return []


async def fetch_leetcode_contests(bypass_cache: bool = False) -> List[Dict[str, Any]]:
    """
    Fetches upcoming LeetCode contests (Weekly & Biweekly contests).
    Cached for 30 minutes.
    """
    cache_key = "lc:contests:list"
    if not bypass_cache:
        cached = api_cache.get(cache_key)
        if cached is not None:
            return cached

    query = """
    query getUpcomingContests {
      allContests {
        title
        titleSlug
        startTime
        duration
        originStartTime
        isVirtual
      }
    }
    """
    headers = {"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, follow_redirects=True) as client:
            resp = await client.post(LEETCODE_GRAPHQL_URL, json={"query": query}, headers=headers)
            if resp.status_code != 200:
                return []
            data = resp.json()
            contests_raw = data.get("data", {}).get("allContests", []) or []
            now_ts = int(datetime.now(timezone.utc).timestamp())
            three_days_ago = now_ts - (3 * 86400)

            contests = []
            for c in contests_raw:
                start_ts = c.get("startTime")
                if not start_ts or c.get("isVirtual"):
                    continue
                duration = c.get("duration", 5400)
                end_ts = start_ts + duration

                if end_ts >= three_days_ago:
                    phase = "BEFORE" if start_ts > now_ts else ("CODING" if end_ts > now_ts else "FINISHED")
                    slug = c.get("titleSlug", "")
                    contests.append({
                        "platform": "leetcode",
                        "external_id": slug or c.get("title"),
                        "name": c.get("title"),
                        "start_time": datetime.fromtimestamp(start_ts, tz=timezone.utc).replace(tzinfo=None),
                        "duration_seconds": duration,
                        "url": f"https://leetcode.com/contest/{slug}",
                        "phase": phase,
                        "raw_data_json": json.dumps(c),
                    })

            contests.sort(key=lambda x: x["start_time"])
            api_cache.set(cache_key, contests, ttl_seconds=1800)
            return contests
    except Exception as exc:
        logger.warning(f"Error fetching LC contests: {exc}")
        return []
