from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Project, ProjectMembership, Notification
from ..schemas import UserOut, ProjectMembershipOut
from ..auth_utils import get_current_user

router = APIRouter(prefix="/api", tags=["Workers & Memberships"])

@router.get("/workers", response_model=List[UserOut])
def get_all_workers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "employer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employers can view worker directory."
        )

    workers = db.query(User).filter(User.role == "worker").all()
    return [UserOut.model_validate(w) for w in workers]

@router.get("/projects/{project_id}/workers", response_model=List[ProjectMembershipOut])
def get_project_workers(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    memberships = db.query(ProjectMembership).filter(
        ProjectMembership.project_id == project_id,
        ProjectMembership.status == "active"
    ).all()

    result = []
    for m in memberships:
        w = db.query(User).filter(User.id == m.worker_id).first()
        if w:
            result.append(ProjectMembershipOut(
                id=m.id,
                project_id=m.project_id,
                worker_id=m.worker_id,
                worker_name=w.name,
                worker_email=w.email,
                role=m.role,
                discipline=m.discipline,
                status=m.status,
                joined_at=m.joined_at.strftime("%Y-%m-%d %H:%M")
            ))
    return result
