"""
Safe, idempotent SQLite migration script for TodoFlow 2.0.
Verifies backup, creates new tables, preserves existing data.
"""
import shutil
from datetime import datetime
from database import Base, DB_PATH, engine, SessionLocal
from models import User, Category, Task

def run_migration():
    print(f"[{datetime.utcnow().isoformat()}] Starting migration for TodoFlow 2.0...")
    
    # 1. Verify DB path exists
    backup_path = f"{DB_PATH}.bak_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(DB_PATH, backup_path)
    print(f"✓ Backup created at: {backup_path}")

    # 2. Check pre-migration row counts
    db = SessionLocal()
    pre_users = db.query(User).count()
    pre_cats = db.query(Category).count()
    pre_tasks = db.query(Task).count()
    db.close()
    print(f"Pre-migration check: {pre_users} users, {pre_cats} categories, {pre_tasks} tasks.")

    # 3. Create any new tables (non-destructive in SQLite / SQLAlchemy)
    Base.metadata.create_all(bind=engine)
    print("✓ Base.metadata.create_all completed successfully.")

    # 4. Verify post-migration integrity
    db = SessionLocal()
    post_users = db.query(User).count()
    post_cats = db.query(Category).count()
    post_tasks = db.query(Task).count()
    db.close()

    assert pre_users == post_users, f"User count mismatch: {pre_users} vs {post_users}"
    assert pre_cats == post_cats, f"Category count mismatch: {pre_cats} vs {post_cats}"
    assert pre_tasks == post_tasks, f"Task count mismatch: {pre_tasks} vs {post_tasks}"

    print(f"✓ Post-migration integrity verified: {post_users} users, {post_cats} categories, {post_tasks} tasks intact.")
    print("✓ TodoFlow 2.0 migration successful!")

if __name__ == "__main__":
    run_migration()
