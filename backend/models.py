import enum
from datetime import datetime

from sqlalchemy import (Boolean, Column, Date, DateTime, Enum, Float,
                        ForeignKey, Integer, String, Text, UniqueConstraint)
from sqlalchemy.orm import relationship

from database import Base


class Priority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


class CodingPlatform(str, enum.Enum):
    codeforces = "codeforces"
    leetcode = "leetcode"


class GoalType(str, enum.Enum):
    daily_problems = "daily_problems"
    weekly_problems = "weekly_problems"
    weekly_days = "weekly_days"
    target_rating = "target_rating"
    contest_prep = "contest_prep"


class NotificationType(str, enum.Enum):
    contest_reminder = "contest_reminder"
    goal_deadline = "goal_deadline"
    goal_completed = "goal_completed"
    daily_summary = "daily_summary"
    weekly_report = "weekly_report"


class ReportType(str, enum.Enum):
    daily = "daily"
    weekly = "weekly"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="user", cascade="all, delete-orphan")
    coding_profiles = relationship("CodingProfile", back_populates="user", cascade="all, delete-orphan")
    contest_preferences = relationship("UserContestPreference", back_populates="user", cascade="all, delete-orphan")
    practice_activities = relationship("PracticeActivity", back_populates="user", cascade="all, delete-orphan")
    coding_goals = relationship("CodingGoal", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("InAppNotification", back_populates="user", cascade="all, delete-orphan")
    reports = relationship("ProgressReport", back_populates="user", cascade="all, delete-orphan")
    problems = relationship("Problem", back_populates="user", cascade="all, delete-orphan")
    prep_plans = relationship("ContestPrepPlan", back_populates="user", cascade="all, delete-orphan")
    achievements = relationship("Achievement", back_populates="user", cascade="all, delete-orphan")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    color = Column(String, default="#6366f1")
    icon = Column(String, nullable=True)
    order = Column(Integer, default=0)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="categories")
    tasks = relationship("Task", back_populates="category", passive_deletes=True)


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    completed = Column(Boolean, default=False)
    priority = Column(Enum(Priority), default=Priority.medium)
    due_date = Column(DateTime, nullable=True)
    order = Column(Integer, default=0)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="tasks")
    category = relationship("Category", back_populates="tasks")


class CodingProfile(Base):
    __tablename__ = "coding_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    platform = Column(Enum(CodingPlatform), nullable=False)
    username = Column(String, nullable=False)
    rating = Column(Integer, nullable=True)
    max_rating = Column(Integer, nullable=True)
    rank_name = Column(String, nullable=True)
    global_rank = Column(Integer, nullable=True)
    problems_solved = Column(Integer, default=0)
    easy_solved = Column(Integer, default=0)
    medium_solved = Column(Integer, default=0)
    hard_solved = Column(Integer, default=0)
    raw_stats_json = Column(Text, nullable=True)
    last_refreshed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="coding_profiles")

    __table_args__ = (
        UniqueConstraint("user_id", "platform", name="uq_user_platform"),
    )


class Contest(Base):
    __tablename__ = "contests"

    id = Column(Integer, primary_key=True, index=True)
    platform = Column(Enum(CodingPlatform), nullable=False, index=True)
    external_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    start_time = Column(DateTime, nullable=False, index=True)
    duration_seconds = Column(Integer, nullable=False)
    url = Column(String, nullable=False)
    phase = Column(String, default="BEFORE")  # BEFORE, CODING, FINISHED
    raw_data_json = Column(Text, nullable=True)
    last_synced_at = Column(DateTime, default=datetime.utcnow)

    preferences = relationship("UserContestPreference", back_populates="contest", cascade="all, delete-orphan")
    prep_plans = relationship("ContestPrepPlan", back_populates="contest", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("platform", "external_id", name="uq_platform_external_id"),
    )


class UserContestPreference(Base):
    __tablename__ = "user_contest_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    contest_id = Column(Integer, ForeignKey("contests.id", ondelete="CASCADE"), nullable=False, index=True)
    is_interested = Column(Boolean, default=False)
    preparation_task_id = Column(Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="contest_preferences")
    contest = relationship("Contest", back_populates="preferences")
    preparation_task = relationship("Task")

    __table_args__ = (
        UniqueConstraint("user_id", "contest_id", name="uq_user_contest"),
    )


class PracticeActivity(Base):
    __tablename__ = "practice_activities"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    platform = Column(String, nullable=False, index=True)  # codeforces, leetcode, manual
    activity_date = Column(Date, nullable=False, index=True)
    problems_solved = Column(Integer, default=0)
    contests_attended = Column(Integer, default=0)
    points = Column(Float, default=0.0)
    source = Column(String, default="synced")  # synced, manual
    details_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="practice_activities")

    __table_args__ = (
        UniqueConstraint("user_id", "platform", "activity_date", name="uq_user_platform_date"),
    )


class CodingGoal(Base):
    __tablename__ = "coding_goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    goal_type = Column(Enum(GoalType), nullable=False)
    target_value = Column(Float, nullable=False)
    current_value = Column(Float, default=0.0)
    platform = Column(String, nullable=True)  # codeforces, leetcode, all
    deadline = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="coding_goals")


class InAppNotification(Base):
    __tablename__ = "in_app_notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    notification_type = Column(Enum(NotificationType), nullable=False, index=True)
    is_read = Column(Boolean, default=False, index=True)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="notifications")


class ProgressReport(Base):
    __tablename__ = "progress_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    report_type = Column(Enum(ReportType), nullable=False, index=True)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    summary_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="reports")


class Problem(Base):
    __tablename__ = "problems"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    url = Column(String, nullable=True)
    platform = Column(String, default="leetcode", index=True)  # leetcode, codeforces, manual
    external_id = Column(String, nullable=False, index=True)
    topic = Column(String, nullable=True, index=True)  # e.g. Arrays, DP, Graphs
    difficulty = Column(String, default="Medium")  # Easy, Medium, Hard
    solve_status = Column(String, default="solved", index=True)  # unsolved, attempted, solved
    attempt_count = Column(Integer, default=1)
    first_attempt_at = Column(DateTime, default=datetime.utcnow)
    last_attempt_at = Column(DateTime, default=datetime.utcnow)
    solved_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    revision_notes = Column(Text, nullable=True)
    is_bookmarked = Column(Boolean, default=False, index=True)
    next_review_at = Column(DateTime, nullable=True, index=True)
    review_interval_days = Column(Integer, default=1)
    review_count = Column(Integer, default=0)
    ease_factor = Column(Float, default=2.5)
    is_verified_submission = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="problems")
    reviews = relationship("ProblemReview", back_populates="problem", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("user_id", "platform", "external_id", name="uq_user_platform_problem"),
    )


class ProblemReview(Base):
    __tablename__ = "problem_reviews"

    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reviewed_at = Column(DateTime, default=datetime.utcnow, index=True)
    rating = Column(Integer, nullable=False)  # 1: Again, 2: Hard, 3: Good, 4: Easy
    scheduled_next = Column(DateTime, nullable=False)
    notes = Column(Text, nullable=True)

    problem = relationship("Problem", back_populates="reviews")
    user = relationship("User")


class ContestPrepPlan(Base):
    __tablename__ = "contest_prep_plans"

    id = Column(Integer, primary_key=True, index=True)
    contest_id = Column(Integer, ForeignKey("contests.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    checklist_json = Column(Text, nullable=True)
    virtual_practice_notes = Column(Text, nullable=True)
    post_contest_reflection = Column(Text, nullable=True)
    completion_percentage = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    contest = relationship("Contest", back_populates="prep_plans")
    user = relationship("User", back_populates="prep_plans")

    __table_args__ = (
        UniqueConstraint("user_id", "contest_id", name="uq_user_contest_prep_plan"),
    )


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    badge_key = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    icon = Column(String, default="🏆")
    unlocked_at = Column(DateTime, default=datetime.utcnow, index=True)
    is_verified = Column(Boolean, default=False)

    user = relationship("User", back_populates="achievements")

    __table_args__ = (
        UniqueConstraint("user_id", "badge_key", name="uq_user_badge"),
    )