import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import text as _sa_text
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Load environment variables from .env file relative to the backend directory
_backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=_backend_dir / ".env", override=True)

DATABASE_URL = os.getenv("DATABASE_URL")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Path to local fallback database directory if PostgreSQL environment variables are unset
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_DIR = os.path.join(BASE_DIR, "database")
os.makedirs(DB_DIR, exist_ok=True)

# Helper to create SQLite fallback engine
def _create_sqlite_engine():
    DB_PATH = os.path.join(DB_DIR, "siteflow_fallback.db")
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"
    return create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False}
    )

# Format & validate connection URL
if DATABASE_URL and ("your-project-ref" not in DATABASE_URL and "your-password" not in DATABASE_URL):
    # Supabase gives postgres:// scheme in some dashboards; SQLAlchemy requires postgresql://
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    # Automatically switch Supabase connection pooler to transaction mode (port 6543) and NullPool
    if "pooler.supabase.com" in DATABASE_URL:
        if ":5432/" in DATABASE_URL:
            DATABASE_URL = DATABASE_URL.replace(":5432/", ":6543/")
        _pg_engine = create_engine(
            DATABASE_URL,
            poolclass=NullPool,
            connect_args={"connect_timeout": 10}
        )
    else:
        _pg_engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10
        )
    
    # Verify PostgreSQL is actually reachable; fall back to SQLite if not
    try:
        with _pg_engine.connect() as _test_conn:
            _test_conn.execute(_sa_text("SELECT 1"))
        engine = _pg_engine
        is_postgres = True
        print("[Database] Connected to PostgreSQL (Supabase)")
    except Exception as _pg_err:
        print(f"[Database Warning] PostgreSQL unreachable: {_pg_err}")
        print("[Database] Falling back to local SQLite database")
        _pg_engine.dispose()
        engine = _create_sqlite_engine()
        is_postgres = False
else:
    # Safe SQLite local fallback engine if user has not filled in their Supabase credentials yet
    engine = _create_sqlite_engine()
    is_postgres = False

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Optional Supabase Python SDK Client Helper
supabase_client = None
if SUPABASE_URL and SUPABASE_ANON_KEY and "your-project-ref" not in SUPABASE_URL:
    try:
        from supabase import create_client
        supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY)
    except Exception as e:
        print(f"[Supabase Client Warning] Could not initialize Supabase SDK client: {e}")
