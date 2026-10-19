import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base
from dependencies import get_db
from main import app

# Test DB in-memory
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

Base.metadata.create_all(bind=engine)

client = TestClient(app)


def test_baseline_health():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json() == {"message": "TodoFlow API is running"}


def test_health_endpoints():
    for endpoint in ["/health", "/api/health"]:
        res = client.get(endpoint)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"
        assert data["version"] == "2.0.0"


def test_baseline_auth_and_tasks():
    # 1. Register
    reg_res = client.post(
        "/api/auth/register",
        json={"username": "testuser_base", "email": "base@example.com", "password": "password123"},
    )
    assert reg_res.status_code == 201
    data = reg_res.json()
    assert "access_token" in data
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Login
    login_res = client.post(
        "/api/auth/login",
        json={"username": "testuser_base", "password": "password123"},
    )
    assert login_res.status_code == 200

    # 3. Me
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["username"] == "testuser_base"

    # 4. Create Category
    cat_res = client.post(
        "/api/categories",
        json={"name": "Dev", "color": "#6366f1"},
        headers=headers,
    )
    assert cat_res.status_code == 201
    cat_id = cat_res.json()["id"]

    # 5. Create Task
    task_res = client.post(
        "/api/tasks",
        json={"title": "Test task", "priority": "high", "category_id": cat_id},
        headers=headers,
    )
    assert task_res.status_code == 201
    task_id = task_res.json()["id"]

    # 6. Patch Task
    patch_res = client.patch(
        f"/api/tasks/{task_id}",
        json={"completed": True},
        headers=headers,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["completed"] is True

    # 7. List Tasks
    list_res = client.get("/api/tasks", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    # 8. Reorder Tasks
    reorder_res = client.post(
        "/api/tasks/reorder",
        json=[{"id": task_id, "order": 5}],
        headers=headers,
    )
    assert reorder_res.status_code == 200

    # 9. Delete Task
    del_task_res = client.delete(f"/api/tasks/{task_id}", headers=headers)
    assert del_task_res.status_code == 204

    # 10. Delete Category
    del_cat_res = client.delete(f"/api/categories/{cat_id}", headers=headers)
    assert del_cat_res.status_code == 204
