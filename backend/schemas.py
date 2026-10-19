from datetime import date, datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr


# ─── Auth ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


class TokenData(BaseModel):
    user_id: Optional[int] = None


# ─── Category ────────────────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str
    color: str = "#6366f1"
    icon: Optional[str] = None
    order: int = 0


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    order: Optional[int] = None


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    color: str
    icon: Optional[str]
    order: int
    user_id: int
    created_at: datetime


# ─── Task ────────────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[datetime] = None
    category_id: Optional[int] = None
    order: int = 0


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    category_id: Optional[int] = None
    order: Optional[int] = None


class ReorderItem(BaseModel):
    id: int
    order: int


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str]
    completed: bool
    priority: str
    due_date: Optional[datetime]
    order: int
    user_id: int
    category_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryOut] = None


# ─── Coding Profiles ─────────────────────────────────────────────────────────

class CodingProfileLink(BaseModel):
    platform: str  # codeforces | leetcode
    username: str


class CodingProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    platform: str
    username: str
    rating: Optional[int] = None
    max_rating: Optional[int] = None
    rank_name: Optional[str] = None
    global_rank: Optional[int] = None
    problems_solved: int = 0
    easy_solved: int = 0
    medium_solved: int = 0
    hard_solved: int = 0
    raw_stats_json: Optional[str] = None
    last_refreshed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    profile_url: Optional[str] = None


# ─── Contests ────────────────────────────────────────────────────────────────

class ContestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    platform: str
    external_id: str
    name: str
    start_time: datetime
    duration_seconds: int
    url: str
    phase: str
    last_synced_at: Optional[datetime] = None
    is_interested: bool = False
    preparation_task_id: Optional[int] = None


class ContestPreferenceUpdate(BaseModel):
    is_interested: bool


class ContestPrepareTaskCreate(BaseModel):
    contest_id: Optional[int] = None
    title: Optional[str] = None
    priority: str = "high"
    due_date: Optional[datetime] = None


# ─── Goals ───────────────────────────────────────────────────────────────────

class CodingGoalCreate(BaseModel):
    title: str
    goal_type: str  # daily_problems | weekly_problems | weekly_days | target_rating | contest_prep
    target_value: float
    platform: Optional[str] = "all"
    deadline: Optional[datetime] = None


class CodingGoalUpdate(BaseModel):
    title: Optional[str] = None
    target_value: Optional[float] = None
    current_value: Optional[float] = None
    is_active: Optional[bool] = None
    is_completed: Optional[bool] = None
    deadline: Optional[datetime] = None


class CodingGoalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    goal_type: str
    target_value: float
    current_value: float
    platform: Optional[str] = None
    deadline: Optional[datetime] = None
    is_active: bool
    is_completed: bool
    created_at: datetime
    updated_at: datetime


# ─── Practice Activity & Analytics ───────────────────────────────────────────

class PracticeActivityCreate(BaseModel):
    platform: str = "manual"
    activity_date: date
    problems_solved: int = 0
    contests_attended: int = 0
    points: float = 0.0
    details: Optional[str] = None


class PracticeActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    platform: str
    activity_date: date
    problems_solved: int
    contests_attended: int
    points: float
    source: str
    details_json: Optional[str] = None
    created_at: datetime


class StreakAnalyticsOut(BaseModel):
    current_streak: int
    longest_streak: int
    weekly_consistency: float  # e.g. 85.7%
    active_days_count: int
    total_problems_solved: int
    heatmap: List[Dict[str, Any]]  # [{"date": "2026-10-18", "count": 4, "platform": "..."}]
    rating_history: List[Dict[str, Any]]  # [{"platform": "codeforces", "date": "...", "rating": 1450}]


# ─── Notifications & Reports ─────────────────────────────────────────────────

class InAppNotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    message: str
    notification_type: str
    is_read: bool
    metadata_json: Optional[str] = None
    created_at: datetime


class ProgressReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    report_type: str
    period_start: datetime
    period_end: datetime
    summary_json: Optional[str] = None
    created_at: datetime


# ─── Problems & Spaced Repetition ───────────────────────────────────────────

class ProblemCreate(BaseModel):
    title: str
    url: Optional[str] = None
    platform: str = "leetcode"  # leetcode, codeforces, manual
    external_id: Optional[str] = None
    topic: Optional[str] = None
    difficulty: str = "Medium"
    solve_status: str = "solved"  # unsolved, attempted, solved
    notes: Optional[str] = None
    revision_notes: Optional[str] = None
    is_bookmarked: bool = False
    next_review_at: Optional[datetime] = None
    is_verified_submission: bool = False


class ProblemUpdate(BaseModel):
    title: Optional[str] = None
    url: Optional[str] = None
    topic: Optional[str] = None
    difficulty: Optional[str] = None
    solve_status: Optional[str] = None
    attempt_count: Optional[int] = None
    notes: Optional[str] = None
    revision_notes: Optional[str] = None
    is_bookmarked: Optional[bool] = None
    next_review_at: Optional[datetime] = None


class ProblemReviewCreate(BaseModel):
    rating: int  # 1: Again, 2: Hard, 3: Good, 4: Easy
    notes: Optional[str] = None


class ProblemReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    problem_id: int
    user_id: int
    reviewed_at: datetime
    rating: int
    scheduled_next: datetime
    notes: Optional[str] = None


class ProblemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    url: Optional[str] = None
    platform: str
    external_id: str
    topic: Optional[str] = None
    difficulty: str
    solve_status: str
    attempt_count: int
    first_attempt_at: datetime
    last_attempt_at: datetime
    solved_at: Optional[datetime] = None
    notes: Optional[str] = None
    revision_notes: Optional[str] = None
    is_bookmarked: bool
    next_review_at: Optional[datetime] = None
    review_interval_days: int
    review_count: int
    ease_factor: float
    is_verified_submission: bool
    created_at: datetime
    updated_at: datetime


# ─── Contest Preparation Workspace ──────────────────────────────────────────

class ContestPrepPlanCreate(BaseModel):
    contest_id: int
    checklist_json: Optional[str] = None
    virtual_practice_notes: Optional[str] = None
    post_contest_reflection: Optional[str] = None


class ContestPrepPlanUpdate(BaseModel):
    checklist_json: Optional[str] = None
    virtual_practice_notes: Optional[str] = None
    post_contest_reflection: Optional[str] = None
    completion_percentage: Optional[float] = None


class ContestPrepPlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    contest_id: int
    user_id: int
    checklist_json: Optional[str] = None
    virtual_practice_notes: Optional[str] = None
    post_contest_reflection: Optional[str] = None
    completion_percentage: float
    created_at: datetime
    updated_at: datetime
    contest: Optional[ContestOut] = None


# ─── Achievements ────────────────────────────────────────────────────────────

class AchievementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    badge_key: str
    title: str
    description: str
    icon: str
    unlocked_at: datetime
    is_verified: bool


# ─── Deterministic Planner ───────────────────────────────────────────────────

class PracticePlanOut(BaseModel):
    weak_topics: List[Dict[str, Any]]
    recommended_problems: List[ProblemOut]
    upcoming_contest_plans: List[Dict[str, Any]]
    due_reviews_count: int
    rules_applied: List[str]

