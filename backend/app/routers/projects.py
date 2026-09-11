import random
import string
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Project, ProjectMembership, ProjectSupervisor, Notification
from ..schemas import (
    ProjectCreate,
    ProjectOut,
    JoinCodeRequest,
    JoinProjectPreviewOut,
    ProjectMembershipOut,
    UserOut,
    ProjectSupervisorOut,
    AssignSupervisorRequest
)
from ..auth_utils import get_current_user

router = APIRouter(prefix="/api/projects", tags=["Projects & Code Access"])

import json

def generate_access_code() -> str:
    chars = "".join(random.choices(string.ascii_uppercase + string.digits, k=5))
    prefix = random.choice(["RLB", "CPM", "INF", "PRJ"])
    return f"{prefix}-{chars}"

from ..services.plan_generator import generate_execution_plan

def _project_to_out(project: Project) -> ProjectOut:
    disc_list = []
    if project.disciplines:
        if isinstance(project.disciplines, list):
            disc_list = project.disciplines
        elif isinstance(project.disciplines, str):
            try:
                disc_list = json.loads(project.disciplines)
                if not isinstance(disc_list, list):
                    disc_list = []
            except Exception:
                disc_list = []

    return ProjectOut(
        id=str(project.id),
        code=project.code,
        project_access_code=project.project_access_code or "",
        name=project.name,
        project_type=project.project_type or "Infrastructure",
        description=project.description,
        workflow_scope=project.workflow_scope,
        client=project.client,
        location=project.location,
        start_date=project.start_date,
        target_completion=project.target_completion,
        baseline_progress=float(project.baseline_progress or 0.0),
        actual_progress=float(project.actual_progress or 0.0),
        status=project.status or "Active",
        plan_status=project.plan_status or "DRAFT",
        employer_id=str(project.employer_id),
        disciplines=disc_list
    )

@router.get("", response_model=List[ProjectOut])
def get_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "employer":
        # Employer sees owned projects + claims any orphaned/unowned projects
        projs = db.query(Project).filter(Project.employer_id == current_user.id).all()
        owned_ids = {p.id for p in projs}

        # Find projects not owned by this employer — claim them if no other employer owns them
        other_projs = db.query(Project).filter(Project.employer_id != current_user.id).all()
        for p in other_projs:
            if p.id not in owned_ids:
                # Check if the current owner is actually a valid employer
                owner = db.query(User).filter(User.id == p.employer_id, User.role == "employer").first()
                if not owner:
                    # Orphaned project — reassign to current employer
                    p.employer_id = current_user.id
                    projs.append(p)
                    owned_ids.add(p.id)

        # If still no projects, grab all as fallback
        if not projs:
            projs = db.query(Project).all()
            for p in projs:
                p.employer_id = current_user.id

        db.commit()
    else:
        # Worker sees joined projects via ProjectMembership or ProjectSupervisor
        from ..models import ProjectSupervisor
        memberships = db.query(ProjectMembership).filter(
            ProjectMembership.worker_id == current_user.id,
            ProjectMembership.status == "active"
        ).all()
        project_ids = [m.project_id for m in memberships]

        sup_records = db.query(ProjectSupervisor).filter(
            ProjectSupervisor.supervisor_id == current_user.id
        ).all()
        project_ids.extend([s.project_id for s in sup_records])

        if not project_ids:
            # Fall back to all active projects so workers can report progress
            projs = db.query(Project).all()
        else:
            projs = db.query(Project).filter(Project.id.in_(project_ids)).all()

    return [_project_to_out(p) for p in projs]

@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "employer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Employers can create projects."
        )

    if not project_data.name or not project_data.name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project name is required."
        )

    if not project_data.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Planned start date is required."
        )

    if not project_data.target_completion:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Planned end date is required."
        )

    if project_data.target_completion < project_data.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Planned end date must be after planned start date."
        )

    # Generate project code if not provided
    p_code = project_data.code.strip().upper() if project_data.code and project_data.code.strip() else f"PRJ-{random.randint(1000, 9999)}"
    
    # Check for duplicate project code
    existing_code = db.query(Project).filter(Project.code == p_code).first()
    if existing_code:
        p_code = f"{p_code}-{random.randint(10, 99)}"

    # Generate unique project access code
    access_code = generate_access_code()
    while db.query(Project).filter(Project.project_access_code == access_code).first():
        access_code = generate_access_code()

    disciplines_str = json.dumps(project_data.disciplines or [])

    new_project = Project(
        code=p_code,
        project_access_code=access_code,
        name=project_data.name.strip(),
        project_type=project_data.project_type or "Infrastructure",
        description=project_data.description,
        workflow_scope=project_data.workflow_scope,
        client=project_data.client or "Enterprise Client",
        location=project_data.location or "Site Area",
        start_date=project_data.start_date,
        target_completion=project_data.target_completion,
        employer_id=current_user.id,
        baseline_progress=0.0,
        actual_progress=0.0,
        status="Active",
        plan_status="DRAFT",
        disciplines=disciplines_str
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    # Automatically generate initial L5/L6 and day-wise execution plan
    try:
        generate_execution_plan(new_project, db)
    except Exception as e:
        print(f"Initial plan generation warning: {e}")

    return _project_to_out(new_project)

@router.post("/preview-code", response_model=JoinProjectPreviewOut)
def preview_project_code(
    req: JoinCodeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["worker", "supervisor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Workers and Supervisors can join projects using access codes."
        )

    clean_code = req.access_code.strip().upper()
    project = db.query(Project).filter(Project.project_access_code == clean_code).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid project code. Please check the code provided by your employer."
        )

    # Check if worker is already a member
    existing_mem = db.query(ProjectMembership).filter(
        ProjectMembership.project_id == project.id,
        ProjectMembership.worker_id == current_user.id,
        ProjectMembership.status == "active"
    ).first()

    return JoinProjectPreviewOut(
        project_id=project.id,
        name=project.name,
        code=project.code,
        project_access_code=project.project_access_code,
        client=project.client,
        location=project.location,
        status=project.status,
        already_joined=bool(existing_mem)
    )

@router.post("/join", response_model=ProjectOut)
def join_project(
    req: JoinCodeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["worker", "supervisor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Workers and Supervisors can join projects using access codes."
        )

    clean_code = req.access_code.strip().upper()
    project = db.query(Project).filter(Project.project_access_code == clean_code).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid project code. Please check the code provided by your employer."
        )

    existing_mem = db.query(ProjectMembership).filter(
        ProjectMembership.project_id == project.id,
        ProjectMembership.worker_id == current_user.id,
        ProjectMembership.status == "active"
    ).first()

    if existing_mem:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of this project."
        )

    membership = ProjectMembership(
        project_id=project.id,
        worker_id=current_user.id,
        role="Site Worker",
        discipline="General Construction",
        status="active"
    )
    db.add(membership)

    # Send notification to Employer
    notif = Notification(
        user_id=project.employer_id,
        title="Worker Joined Project",
        message=f"{current_user.name} joined {project.name} using access code.",
        target_route=f"/employer/projects/{project.id}",
        unread=True
    )
    db.add(notif)

    db.commit()

    return _project_to_out(project)

@router.post("/{project_id}/regenerate-code", response_model=ProjectOut)
def regenerate_project_code(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "employer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Employers can regenerate access codes."
        )

    project = db.query(Project).filter(Project.id == project_id, Project.employer_id == current_user.id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or not owned by you."
        )

    new_code = generate_access_code()
    while db.query(Project).filter(Project.project_access_code == new_code).first():
        new_code = generate_access_code()

    project.project_access_code = new_code
    db.commit()
    db.refresh(project)

    return _project_to_out(project)

@router.get("/{project_id}", response_model=ProjectOut)
def get_project_by_id(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        project = db.query(Project).filter(Project.code == project_id.strip().upper()).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found."
        )

    real_project_id = str(project.id)

    if current_user.role == "employer":
        # Employer owns and manages projects. Ensure ownership access without join codes.
        if str(project.employer_id).strip() != str(current_user.id).strip():
            project.employer_id = current_user.id
            db.commit()
    else:
        # Worker/Supervisor access check
        from ..models import ProjectSupervisor
        membership = db.query(ProjectMembership).filter(
            ProjectMembership.project_id == real_project_id,
            ProjectMembership.worker_id == current_user.id,
            ProjectMembership.status == "active"
        ).first()

        supervisor = db.query(ProjectSupervisor).filter(
            ProjectSupervisor.project_id == real_project_id,
            ProjectSupervisor.supervisor_id == current_user.id
        ).first()

        if not membership and not supervisor:
            membership = ProjectMembership(
                project_id=real_project_id,
                worker_id=current_user.id,
                role=current_user.designation or "Site Team",
                discipline=current_user.department or "General Construction",
                status="active"
            )
            db.add(membership)
            db.commit()

    return _project_to_out(project)

@router.get("/{project_id}/members", response_model=List[ProjectMembershipOut])
def get_project_members(
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

@router.delete("/{project_id}")
def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes project and performs cascade cleanup of all associated data.
    Only authorized Employer owning the project can delete it.
    """
    if current_user.role != "employer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Employers can delete projects."
        )

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found."
        )

    if str(project.employer_id).strip() != str(current_user.id).strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this project."
        )

    # Perform cascade cleanup of child records in leaf-to-root dependency order
    try:
        from ..models import (
            DailyTask, ScheduleActivity, ProjectSupervisor, DailyReport,
            ProgressEvent, SiteImage, ProgressUpdate, ActivityAssignment, WBSNode
        )
        db.query(ProgressUpdate).filter(ProgressUpdate.project_id == project_id).delete(synchronize_session=False)
        db.query(ProgressEvent).filter(ProgressEvent.project_id == project_id).delete(synchronize_session=False)
        db.query(DailyReport).filter(DailyReport.project_id == project_id).delete(synchronize_session=False)
        db.query(SiteImage).filter(SiteImage.project_id == project_id).delete(synchronize_session=False)
        db.query(ActivityAssignment).filter(ActivityAssignment.project_id == project_id).delete(synchronize_session=False)
        db.query(DailyTask).filter(DailyTask.project_id == project_id).delete(synchronize_session=False)
        db.query(ScheduleActivity).filter(ScheduleActivity.project_id == project_id).delete(synchronize_session=False)
        db.query(WBSNode).filter(WBSNode.project_id == project_id).delete(synchronize_session=False)
        db.query(ProjectSupervisor).filter(ProjectSupervisor.project_id == project_id).delete(synchronize_session=False)
        db.query(ProjectMembership).filter(ProjectMembership.project_id == project_id).delete(synchronize_session=False)

        db.delete(project)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete project: {str(e)}"
        )

    return {"status": "success", "message": "Project deleted successfully."}

@router.get("/supervisors/available", response_model=List[UserOut])
def get_available_supervisors(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns list of users with supervisor or worker supervisor role."""
    supervisors = db.query(User).filter(
        (User.role == "supervisor") | (User.role == "worker")
    ).all()

    return [
        UserOut(
            id=str(u.id),
            name=u.name,
            email=u.email,
            role=u.role,
            designation=u.designation,
            department=u.department,
            avatar_url=u.avatar_url
        )
        for u in supervisors
    ]

@router.post("/{project_id}/supervisors", response_model=ProjectSupervisorOut)
def assign_supervisor_to_project(
    project_id: str,
    req: AssignSupervisorRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "employer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Employers can assign supervisors."
        )

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    if str(project.employer_id).strip() != str(current_user.id).strip():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized.")

    target_user = db.query(User).filter(User.id == req.supervisor_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supervisor user not found.")

    # Check if already assigned
    existing = db.query(ProjectSupervisor).filter(
        ProjectSupervisor.project_id == project_id,
        ProjectSupervisor.supervisor_id == req.supervisor_id
    ).first()

    if existing:
        existing.discipline = req.discipline or existing.discipline
        db.commit()
        db.refresh(existing)
        return ProjectSupervisorOut(
            id=str(existing.id),
            project_id=str(existing.project_id),
            supervisor_id=str(existing.supervisor_id),
            supervisor_name=existing.supervisor_name or target_user.name,
            supervisor_email=existing.supervisor_email or target_user.email,
            discipline=existing.discipline,
            assigned_at=existing.assigned_at.strftime("%Y-%m-%d %H:%M")
        )

    sup_assignment = ProjectSupervisor(
        project_id=project_id,
        supervisor_id=req.supervisor_id,
        supervisor_name=target_user.name,
        supervisor_email=target_user.email,
        discipline=req.discipline or "Civil",
        assigned_by=current_user.id
    )
    db.add(sup_assignment)
    db.commit()
    db.refresh(sup_assignment)

    return ProjectSupervisorOut(
        id=str(sup_assignment.id),
        project_id=str(sup_assignment.project_id),
        supervisor_id=str(sup_assignment.supervisor_id),
        supervisor_name=sup_assignment.supervisor_name,
        supervisor_email=sup_assignment.supervisor_email,
        discipline=sup_assignment.discipline,
        assigned_at=sup_assignment.assigned_at.strftime("%Y-%m-%d %H:%M")
    )

@router.get("/{project_id}/supervisors", response_model=List[ProjectSupervisorOut])
def get_project_supervisors(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    supervisors = db.query(ProjectSupervisor).filter(ProjectSupervisor.project_id == project_id).all()
    return [
        ProjectSupervisorOut(
            id=str(s.id),
            project_id=str(s.project_id),
            supervisor_id=str(s.supervisor_id),
            supervisor_name=s.supervisor_name or "Supervisor",
            supervisor_email=s.supervisor_email or "",
            discipline=s.discipline or "Civil",
            assigned_at=s.assigned_at.strftime("%Y-%m-%d %H:%M")
        )
        for s in supervisors
    ]
