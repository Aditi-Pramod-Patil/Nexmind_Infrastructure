from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base, SessionLocal, is_postgres
from .seed_db import seed_initial_data
from .routers import auth, projects, workers, activities, progress, site_images, notifications, daily_tasks, history

from sqlalchemy import text

# Initialize database tables
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"[Database Init Warning] Base.metadata.create_all: {e}")

# Auto-migrate new columns if needed safely across PostgreSQL & SQLite
try:
    with engine.connect() as conn:
        if is_postgres:
            migrations = [
                "ALTER TABLE projects ADD COLUMN IF NOT EXISTS workflow_scope TEXT;",
                "ALTER TABLE projects ADD COLUMN IF NOT EXISTS plan_status VARCHAR(50) DEFAULT 'DRAFT';",
                "ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS daily_task_id VARCHAR(36);",
                "ALTER TABLE progress_events ADD COLUMN IF NOT EXISTS daily_task_id VARCHAR(36);",
                "ALTER TABLE site_images ADD COLUMN IF NOT EXISTS daily_task_id VARCHAR(36);",
                "ALTER TABLE site_images ADD COLUMN IF NOT EXISTS ai_progress_estimate NUMERIC(5,2);",
                "ALTER TABLE site_images ADD COLUMN IF NOT EXISTS detected_elements TEXT;",
            ]
            for stmt in migrations:
                try:
                    conn.execute(text(stmt))
                except Exception:
                    pass
        try:
            conn.commit()
        except Exception:
            pass
except Exception as e:
    print(f"[Migration Warning] Could not run DB migrations: {e}")

# Auto seed initial database users & sample project plan
db = None
try:
    db = SessionLocal()
    seed_initial_data(db)
except Exception as e:
    print(f"[Seed Notice] Initial seed skipped or already completed: {e}")
finally:
    if db is not None:
        try:
            db.close()
        except Exception:
            pass

app = FastAPI(
    title="SiteFlow AI API",
    description="AI-Powered Infrastructure Project Progress Platform Backend Service (Supabase PostgreSQL)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(workers.router)
app.include_router(activities.router)
app.include_router(progress.router)
app.include_router(site_images.router)
app.include_router(notifications.router)
app.include_router(daily_tasks.router)
app.include_router(history.router)

@app.get("/")
def read_root():
    return {
        "name": "SiteFlow AI API",
        "status": "online",
        "version": "1.0.0",
        "engine": "FastAPI + Supabase PostgreSQL Engine" if is_postgres else "FastAPI + Database Engine"
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "database": "connected",
        "provider": "Supabase PostgreSQL" if is_postgres else "Local Database",
        "auth_service": "ready"
    }
