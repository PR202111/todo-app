import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DB_PATH = os.path.join(BASE_DIR, "todoapp.db")
DB_PATH = os.environ.get("DB_PATH", DEFAULT_DB_PATH)
SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL") or f"sqlite:///{DB_PATH}"

# Ensure parent directory for SQLite file exists
if SQLALCHEMY_DATABASE_URL.startswith("sqlite:///"):
    db_file = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "")
    parent_dir = os.path.dirname(os.path.abspath(db_file))
    if parent_dir and not os.path.exists(parent_dir):
        os.makedirs(parent_dir, exist_ok=True)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()