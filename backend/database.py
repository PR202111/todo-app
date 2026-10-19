import logging
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DB_PATH = os.path.join(BASE_DIR, "todoapp.db")
DB_PATH = os.environ.get("DB_PATH", DEFAULT_DB_PATH)
SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL") or f"sqlite:///{DB_PATH}"

# Ensure parent directory for SQLite file exists safely
if SQLALCHEMY_DATABASE_URL.startswith("sqlite:///"):
    db_file = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "")
    parent_dir = os.path.dirname(os.path.abspath(db_file))
    if parent_dir and not os.path.exists(parent_dir):
        try:
            os.makedirs(parent_dir, exist_ok=True)
        except OSError as err:
            logger.warning(
                "Could not create database directory %s (%s). Falling back to %s",
                parent_dir,
                err,
                DEFAULT_DB_PATH,
            )
            DB_PATH = DEFAULT_DB_PATH
            SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()