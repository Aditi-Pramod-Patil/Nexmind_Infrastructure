from sqlalchemy.orm import Session
from .models import User
from .auth_utils import get_password_hash

def seed_initial_data(db: Session):
    user_count = db.query(User).count()
    if user_count > 0:
        return

    # Seed Primary Employer Admin
    employer = User(
        name="Aditi Patil",
        email="aditi@example.com",
        password_hash=get_password_hash("password123"),
        role="employer",
        designation="Senior Project Director",
        department="Infrastructure Management"
    )
    db.add(employer)

    # Seed Primary Worker / Supervisor
    worker = User(
        name="Rahul Sharma",
        email="rahul@example.com",
        password_hash=get_password_hash("password123"),
        role="worker",
        designation="Site Supervisor",
        department="Civil Construction"
    )
    db.add(worker)

    db.commit()
    print("Database initialized with employer (Aditi Patil) and worker (Rahul Sharma) accounts.")

def seed_activities_and_events(db: Session, project_id: str, worker_id: str):
    # Pure database: Real activities and events are created dynamically by user
    pass
