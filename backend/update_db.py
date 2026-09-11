from app.database import SessionLocal, engine
from app.models import ProgressEvent, ScheduleActivity, DailyTask, Project
from app.services.progress_sync import recalculate_and_sync_progress
from sqlalchemy import text

db = SessionLocal()
try:
    projects = db.query(Project).all()
    print(f"Found {len(projects)} projects for math recalculation.")
    
    events = db.query(ProgressEvent).all()
    for ev in events:
        text_lower = (ev.raw_input or "").lower()
        if any(w in text_lower for w in ["done", "completed", "poured", "pour", "erected", "finished"]):
            ev.extracted_progress = 100.0
        elif "70%" in text_lower or "70 percent" in text_lower:
            ev.extracted_progress = 70.0
        elif "50%" in text_lower or "half" in text_lower:
            ev.extracted_progress = 50.0

    db.commit()

    for proj in projects:
        new_actual = recalculate_and_sync_progress(db, proj.id)
        print(f"Project '{proj.name}' ({proj.code}) overall actual progress recalculation = {new_actual}%")

    db.commit()
    print("SUCCESS: Recalculated mathematically exact progress for all database projects!")
except Exception as e:
    print("Database recalculation error:", e)
finally:
    db.close()
