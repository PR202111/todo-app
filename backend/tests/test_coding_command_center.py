import json
from datetime import date, datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base
from dependencies import get_db
from main import app
from services.analytics import (calculate_streaks, calculate_weekly_consistency,
                                generate_heatmap_data)

# Test DB in-memory
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
Base.metadata.create_all(bind=test_engine)
client = TestClient(app)


# ─── UNIT TESTS: Analytics Calculations ──────────────────────────────────────

def test_streak_calculations():
    today = date(2026, 10, 19)

    # Empty
    assert calculate_streaks(set(), today=today) == (0, 0)

    # Single day today
    assert calculate_streaks({today}, today=today) == (1, 1)

    # Active yesterday only
    yesterday = today - timedelta(days=1)
    assert calculate_streaks({yesterday}, today=today) == (1, 1)

    # 3-day streak ending today
    three_day = {today, today - timedelta(days=1), today - timedelta(days=2)}
    assert calculate_streaks(three_day, today=today) == (3, 3)

    # Broken streak: 5 days ago, then gap, then 2 days ago and yesterday
    mixed = {
        today - timedelta(days=10),
        today - timedelta(days=9),
        today - timedelta(days=8),
        today - timedelta(days=7),  # 4-day streak in past
        today - timedelta(days=1),
        today,                      # 2-day current streak
    }
    curr, longest = calculate_streaks(mixed, today=today)
    assert curr == 2
    assert longest == 4


def test_weekly_consistency():
    today = date(2026, 10, 19)
    # Active 14 out of 28 days = 50.0%
    active_dates = {today - timedelta(days=i * 2) for i in range(14)}
    consistency = calculate_weekly_consistency(active_dates, today=today, days_window=28)
    assert consistency == 50.0


def test_heatmap_generation():
    today = date(2026, 10, 19)
    date_map = {
        today: {"total_problems": 5, "contests": 1, "platforms": {"codeforces"}},
    }
    heatmap = generate_heatmap_data(date_map, days_back=7, today=today)
    assert len(heatmap) == 8  # 7 days back + today
    today_entry = next(h for h in heatmap if h["date"] == today.isoformat())
    assert today_entry["count"] == 5
    assert today_entry["contests"] == 1


# ─── INTEGRATION TESTS: Coding Profiles ─────────────────────────────────────

@pytest.fixture
def auth_headers():
    username = f"user_{int(datetime.utcnow().timestamp() * 1000)}"
    reg_res = client.post(
        "/api/auth/register",
        json={"username": username, "email": f"{username}@example.com", "password": "password123"},
    )
    assert reg_res.status_code == 201
    token = reg_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def second_auth_headers():
    username = f"user2_{int(datetime.utcnow().timestamp() * 1000)}"
    reg_res = client.post(
        "/api/auth/register",
        json={"username": username, "email": f"{username}@example.com", "password": "password123"},
    )
    assert reg_res.status_code == 201
    token = reg_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@patch("routers.coding_profiles.fetch_codeforces_user_info")
@patch("routers.coding_profiles.fetch_codeforces_user_solved")
def test_link_codeforces_profile(mock_solved, mock_info, auth_headers):
    mock_info.return_value = {
        "platform": "codeforces",
        "username": "tourist",
        "rating": 3800,
        "max_rating": 3979,
        "rank_name": "Legendary Grandmaster",
        "avatar_url": "https://example.com/tourist.png",
        "contribution": 150,
        "friend_of_count": 50000,
    }
    mock_solved.return_value = {
        "total_solved": 2400,
        "daily_counts": {
            date.today().isoformat(): 3,
            (date.today() - timedelta(days=1)).isoformat(): 2,
        },
    }

    # 1. Link profile
    res = client.post(
        "/api/coding/profiles",
        json={"platform": "codeforces", "username": "tourist"},
        headers=auth_headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["platform"] == "codeforces"
    assert data["username"] == "tourist"
    assert data["rating"] == 3800
    assert data["max_rating"] == 3979
    assert data["problems_solved"] == 2400
    assert "https://codeforces.com/profile/tourist" in data["profile_url"]
    profile_id = data["id"]

    # 2. Get profiles
    get_res = client.get("/api/coding/profiles", headers=auth_headers)
    assert get_res.status_code == 200
    assert len(get_res.json()) >= 1

    # 3. Refresh profile
    mock_info.return_value["rating"] = 3850
    ref_res = client.post(f"/api/coding/profiles/{profile_id}/refresh", headers=auth_headers)
    assert ref_res.status_code == 200
    assert ref_res.json()["rating"] == 3850

    # 4. Unlink profile
    del_res = client.delete(f"/api/coding/profiles/{profile_id}", headers=auth_headers)
    assert del_res.status_code == 204


@patch("routers.coding_profiles.fetch_leetcode_user_profile")
def test_link_leetcode_profile(mock_lc, auth_headers):
    mock_lc.return_value = {
        "platform": "leetcode",
        "username": "coder123",
        "rating": 1950,
        "max_rating": 1950,
        "rank_name": "Guardian",
        "global_rank": 12000,
        "problems_solved": 450,
        "easy_solved": 150,
        "medium_solved": 250,
        "hard_solved": 50,
        "avatar_url": "https://example.com/avatar.jpg",
        "attended_contests_count": 25,
    }

    res = client.post(
        "/api/coding/profiles",
        json={"platform": "leetcode", "username": "coder123"},
        headers=auth_headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["platform"] == "leetcode"
    assert data["username"] == "coder123"
    assert data["problems_solved"] == 450
    assert data["medium_solved"] == 250
    assert "https://leetcode.com/coder123" in data["profile_url"]


# ─── INTEGRATION TESTS: Contests & Prep Task ────────────────────────────────

@patch("routers.contests.fetch_codeforces_contests")
@patch("routers.contests.fetch_leetcode_contests")
def test_unified_contests_and_prep_task(mock_lc_contests, mock_cf_contests, auth_headers):
    contest_start = datetime.utcnow() + timedelta(days=2)
    mock_cf_contests.return_value = [{
        "platform": "codeforces",
        "external_id": "9999",
        "name": "Codeforces Round 1000 (Div. 2)",
        "start_time": contest_start,
        "duration_seconds": 7200,
        "url": "https://codeforces.com/contest/9999",
        "phase": "BEFORE",
    }]
    mock_lc_contests.return_value = [{
        "platform": "leetcode",
        "external_id": "weekly-contest-400",
        "name": "Weekly Contest 400",
        "start_time": contest_start + timedelta(hours=4),
        "duration_seconds": 5400,
        "url": "https://leetcode.com/contest/weekly-contest-400",
        "phase": "BEFORE",
    }]

    # 1. Fetch unified contests
    res = client.get("/api/coding/contests", headers=auth_headers)
    assert res.status_code == 200
    contests = res.json()
    assert len(contests) >= 2
    cf_contest = next(c for c in contests if c["external_id"] == "9999")
    contest_id = cf_contest["id"]
    assert cf_contest["is_interested"] is False
    assert cf_contest["preparation_task_id"] is None

    # 2. Toggle interest preference
    pref_res = client.post(
        f"/api/coding/contests/{contest_id}/preference",
        json={"is_interested": True},
        headers=auth_headers,
    )
    assert pref_res.status_code == 200
    assert pref_res.json()["is_interested"] is True

    # 3. Create preparation task
    task_res = client.post(
        f"/api/coding/contests/{contest_id}/prepare-task",
        json={"priority": "urgent"},
        headers=auth_headers,
    )
    assert task_res.status_code == 201
    task_data = task_res.json()
    assert "Prepare for Codeforces Round 1000" in task_data["title"]
    assert task_data["priority"] == "urgent"
    task_id = task_data["id"]

    # 4. Verify contest now reflects interest and preparation_task_id
    res_after = client.get("/api/coding/contests", headers=auth_headers)
    cf_after = next(c for c in res_after.json() if c["id"] == contest_id)
    assert cf_after["is_interested"] is True
    assert cf_after["preparation_task_id"] == task_id

    # 5. Verify the task exists in user's TodoFlow task list!
    todo_res = client.get("/api/tasks", headers=auth_headers)
    assert todo_res.status_code == 200
    created_task = next(t for t in todo_res.json() if t["id"] == task_id)
    assert created_task["completed"] is False
    assert "Codeforces" in created_task["description"]


# ─── INTEGRATION TESTS: Goals & Progress ─────────────────────────────────────

def test_goals_crud_and_completion(auth_headers):
    # 1. Create a daily problem goal
    goal_res = client.post(
        "/api/coding/goals",
        json={
            "title": "Solve 3 daily problems",
            "goal_type": "daily_problems",
            "target_value": 3.0,
            "platform": "all",
        },
        headers=auth_headers,
    )
    assert goal_res.status_code == 201
    goal = goal_res.json()
    goal_id = goal["id"]
    assert goal["target_value"] == 3.0
    assert goal["is_completed"] is False

    # 2. Log practice activity to advance goal
    act_res = client.post(
        "/api/coding/activity",
        json={
            "platform": "manual",
            "activity_date": date.today().isoformat(),
            "problems_solved": 3,
        },
        headers=auth_headers,
    )
    assert act_res.status_code == 201

    # 3. Query goals again: should reflect current_value = 3.0 and is_completed = True
    get_goals = client.get("/api/coding/goals", headers=auth_headers)
    assert get_goals.status_code == 200
    updated_goal = next(g for g in get_goals.json() if g["id"] == goal_id)
    assert updated_goal["current_value"] >= 3.0
    assert updated_goal["is_completed"] is True

    # 4. Update goal
    patch_res = client.patch(
        f"/api/coding/goals/{goal_id}",
        json={"target_value": 5.0, "is_completed": False},
        headers=auth_headers,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["target_value"] == 5.0

    # 5. Delete goal
    del_res = client.delete(f"/api/coding/goals/{goal_id}", headers=auth_headers)
    assert del_res.status_code == 204


# ─── INTEGRATION TESTS: Notifications & Reports ──────────────────────────────

def test_notifications_and_reports(auth_headers):
    # 1. Fetch notifications
    notif_res = client.get("/api/coding/notifications", headers=auth_headers)
    assert notif_res.status_code == 200
    notifs = notif_res.json()

    if notifs:
        first_id = notifs[0]["id"]
        # Mark read
        read_res = client.post(f"/api/coding/notifications/{first_id}/read", headers=auth_headers)
        assert read_res.status_code == 200
        assert read_res.json()["is_read"] is True

    # Mark all read
    all_read = client.post("/api/coding/notifications/read-all", headers=auth_headers)
    assert all_read.status_code == 200

    # 2. Generate daily report
    rep_res = client.post("/api/coding/reports/generate?report_type=daily", headers=auth_headers)
    assert rep_res.status_code == 201
    rep_data = rep_res.json()
    assert rep_data["report_type"] == "daily"
    summary = json.loads(rep_data["summary_json"])
    assert "total_problems_solved" in summary

    # 3. Generate weekly report
    w_res = client.post("/api/coding/reports/generate?report_type=weekly", headers=auth_headers)
    assert w_res.status_code == 201

    # 4. List reports
    list_rep = client.get("/api/coding/reports", headers=auth_headers)
    assert list_rep.status_code == 200
    assert len(list_rep.json()) >= 2


# ─── CROSS-USER ISOLATION TESTS ──────────────────────────────────────────────

def test_cross_user_isolation(auth_headers, second_auth_headers):
    # User 1 creates a goal
    goal_res = client.post(
        "/api/coding/goals",
        json={"title": "User1 Private Goal", "goal_type": "weekly_days", "target_value": 4.0},
        headers=auth_headers,
    )
    assert goal_res.status_code == 201
    goal_id = goal_res.json()["id"]

    # User 2 attempts to delete User 1's goal: should get 404
    del_res = client.delete(f"/api/coding/goals/{goal_id}", headers=second_auth_headers)
    assert del_res.status_code == 404

    # User 2 attempts to update User 1's goal: should get 404
    patch_res = client.patch(
        f"/api/coding/goals/{goal_id}",
        json={"title": "Hacked"},
        headers=second_auth_headers,
    )
    assert patch_res.status_code == 404


# ─── INTEGRATION TESTS: Problem Library & Spaced Repetition ──────────────────

def test_problem_library_and_spaced_repetition(auth_headers, second_auth_headers):
    # 1. Create a problem
    prob_res = client.post(
        "/api/coding/problems",
        json={
            "title": "Two Sum",
            "url": "https://leetcode.com/problems/two-sum",
            "platform": "leetcode",
            "external_id": "two-sum",
            "topic": "Arrays",
            "difficulty": "Easy",
            "solve_status": "solved",
            "notes": "Used a hash map for O(n) single pass.",
            "is_bookmarked": True,
        },
        headers=auth_headers,
    )
    assert prob_res.status_code == 201
    prob = prob_res.json()
    assert prob["title"] == "Two Sum"
    assert prob["platform"] == "leetcode"
    assert prob["external_id"] == "two-sum"
    assert prob["is_bookmarked"] is True
    assert prob["next_review_at"] is not None
    prob_id = prob["id"]

    # 2. Duplicate prevention test
    dup_res = client.post(
        "/api/coding/problems",
        json={
            "title": "Two Sum",
            "platform": "leetcode",
            "external_id": "two-sum",
        },
        headers=auth_headers,
    )
    assert dup_res.status_code == 400

    # 3. Query problems with filters
    list_res = client.get("/api/coding/problems?topic=Arrays&difficulty=Easy", headers=auth_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # 4. Record spaced repetition review (Rating = 3: Good)
    rev_res = client.post(
        f"/api/coding/problems/{prob_id}/review",
        json={"rating": 3, "notes": "Felt comfortable solving in 5 minutes."},
        headers=auth_headers,
    )
    assert rev_res.status_code == 200
    updated_prob = rev_res.json()
    assert updated_prob["review_count"] == 1
    assert updated_prob["review_interval_days"] >= 1

    # 5. Practice plan evaluation
    plan_res = client.get("/api/coding/problems/plan", headers=auth_headers)
    assert plan_res.status_code == 200
    plan = plan_res.json()
    assert "weak_topics" in plan
    assert "rules_applied" in plan
    assert isinstance(plan["rules_applied"], list)

    # 6. Cross-user isolation: User 2 cannot access or delete User 1's problem
    u2_del = client.delete(f"/api/coding/problems/{prob_id}", headers=second_auth_headers)
    assert u2_del.status_code == 404


# ─── INTEGRATION TESTS: Contest Prep Workspace ───────────────────────────────

@patch("routers.contests.fetch_codeforces_contests")
@patch("routers.contests.fetch_leetcode_contests")
def test_contest_prep_workspace(mock_lc, mock_cf, auth_headers):
    mock_cf.return_value = [{
        "platform": "codeforces",
        "external_id": "8888",
        "name": "Codeforces Educational Round 150",
        "start_time": datetime.utcnow() + timedelta(days=1),
        "duration_seconds": 7200,
        "url": "https://codeforces.com/contest/8888",
        "phase": "BEFORE",
    }]
    mock_lc.return_value = []

    # Sync contest
    c_res = client.get("/api/coding/contests", headers=auth_headers)
    assert c_res.status_code == 200
    contest = next(c for c in c_res.json() if c["external_id"] == "8888")
    contest_id = contest["id"]

    # 1. Get or create prep plan workspace
    plan_res = client.get(f"/api/coding/contests/{contest_id}/prep-plan", headers=auth_headers)
    assert plan_res.status_code == 200
    plan = plan_res.json()
    assert plan["contest_id"] == contest_id
    assert "Review fast I/O" in plan["checklist_json"]

    # 2. Update checklist with items completed (100% completion)
    checklist = json.loads(plan["checklist_json"])
    for item in checklist:
        item["completed"] = True

    patch_res = client.patch(
        f"/api/coding/contests/{contest_id}/prep-plan",
        json={
            "checklist_json": json.dumps(checklist),
            "virtual_practice_notes": "Solved Div2 A and B in 25 mins",
            "post_contest_reflection": "Felt sharp, good strategy.",
        },
        headers=auth_headers,
    )
    assert patch_res.status_code == 200
    updated_plan = patch_res.json()
    assert updated_plan["completion_percentage"] == 100.0


# ─── INTEGRATION TESTS: Achievements & Data Export ───────────────────────────

def test_achievements_and_data_export(auth_headers):
    # 1. Fetch achievements list
    ach_res = client.get("/api/coding/achievements", headers=auth_headers)
    assert ach_res.status_code == 200
    badges = ach_res.json()
    assert len(badges) >= 5
    first_step = next(b for b in badges if b["key"] == "first_problem")
    assert first_step["title"] == "First Step"

    # 2. Test JSON export
    json_res = client.get("/api/coding/export/json", headers=auth_headers)
    assert json_res.status_code == 200
    data = json_res.json()
    assert "version" in data
    assert "user" in data
    assert "hashed_password" not in data["user"]
    assert "problems" in data
    assert "goals" in data
    assert "activities" in data

    # 3. Test CSV export
    csv_res = client.get("/api/coding/export/problems/csv", headers=auth_headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "title,platform,external_id" in csv_res.text

