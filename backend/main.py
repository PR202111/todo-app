import os
from fastapi import FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from database import Base, engine, SessionLocal
from routers import (auth, categories, tasks, coding_profiles,
                     contests, goals, analytics, notifications, reports,
                     problems, prep_plans, achievements, exports)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="TodoFlow API", version="2.0.0")

# Support configurable CORS origins for development and production
cors_env = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:8080,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:8080"
)
origins = [origin.strip() for origin in cors_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(coding_profiles.router, prefix="/api")
app.include_router(contests.router, prefix="/api")
app.include_router(goals.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(problems.router, prefix="/api")
app.include_router(prep_plans.router, prefix="/api")
app.include_router(achievements.router, prefix="/api")
app.include_router(exports.router, prefix="/api")


@app.get("/")
def root():
    return {"message": "TodoFlow API is running"}


@app.get("/health")
@app.get("/api/health")
def health_check(response: Response):
    try:
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
            db_status = "connected"
        finally:
            db.close()
        return {
            "status": "healthy",
            "database": db_status,
            "version": "2.0.0"
        }
    except Exception as e:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "unhealthy",
            "database": f"error: {str(e)}",
            "version": "2.0.0"
        }
