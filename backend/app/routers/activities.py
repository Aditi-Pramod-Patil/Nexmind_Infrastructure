from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Project, ScheduleActivity, ProjectMembership, ActivityAssignment, Notification
from ..schemas import ActivityCreate, ActivityOut, ActivityAssignRequest
from ..auth_utils import get_current_user

router = APIRouter(prefix="/api", tags=["L5/L6 Activities"])

@router.get("/projects/{project_id}/activities", response_model=List[ActivityOut])
def get_project_activities(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    activities = db.query(ScheduleActivity).filter(ScheduleActivity.project_id == project_id).all()

    # For workers, check which activities are assigned specifically to them
    assigned_activity_ids = set()
    if current_user.role == "worker":
        user_assignments = db.query(ActivityAssignment.activity_id).filter(
            ActivityAssignment.project_id == project_id,
            ActivityAssignment.worker_id == current_user.id
        ).all()
        assigned_activity_ids = {a[0] for a in user_assignments}

    res = []
    for a in activities:
        act_out = ActivityOut.model_validate(a)
        act_out.is_assigned_to_me = a.id in assigned_activity_ids
        res.append(act_out)
    return res

@router.post("/projects/{project_id}/activities", response_model=ActivityOut, status_code=status.HTTP_201_CREATED)
def create_project_activity(
    project_id: str,
    activity_data: ActivityCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "employer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Employers can create schedule activities."
        )

    project = db.query(Project).filter(Project.id == project_id, Project.employer_id == current_user.id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or not owned by you."
        )

    activity = ScheduleActivity(
        activity_id=activity_data.activity_id,
        project_id=project_id,
        parent_l5_id=activity_data.parent_l5_id,
        name=activity_data.name,
        discipline=activity_data.discipline or "Civil Works",
        l5_name=activity_data.l5_name or "Structural Works",
        l6_name=activity_data.l6_name or activity_data.name,
        wbs_level=activity_data.wbs_level or "L6",
        planned_start=activity_data.planned_start,
        planned_finish=activity_data.planned_finish,
        planned_progress=activity_data.planned_progress or 100.0,
        actual_progress=activity_data.actual_progress or 0.0,
        location=activity_data.location or "Block A",
        status="On Track" if activity_data.actual_progress > 0 else "Not Started",
        ai_confidence=92.0
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)

    return ActivityOut.model_validate(activity)

@router.post("/projects/{project_id}/activities/upload", status_code=status.HTTP_201_CREATED)
def bulk_upload_activities(
    project_id: str,
    activities_data: List[ActivityCreate],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "employer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Employers can upload schedule activities."
        )

    project = db.query(Project).filter(Project.id == project_id, Project.employer_id == current_user.id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or not owned by you."
        )

    created_count = 0
    for item in activities_data:
        existing = db.query(ScheduleActivity).filter(
            ScheduleActivity.project_id == project_id,
            ScheduleActivity.activity_id == item.activity_id
        ).first()

        if not existing:
            act = ScheduleActivity(
                activity_id=item.activity_id,
                project_id=project_id,
                parent_l5_id=item.parent_l5_id,
                name=item.name,
                discipline=item.discipline or "Civil Works",
                l5_name=item.l5_name or "Work Package",
                l6_name=item.l6_name or item.name,
                wbs_level=item.wbs_level or "L6",
                planned_start=item.planned_start,
                planned_finish=item.planned_finish,
                planned_progress=item.planned_progress or 100.0,
                actual_progress=item.actual_progress or 0.0,
                location=item.location or "Site Zone A",
                status="Not Started"
            )
            db.add(act)
            created_count += 1

    db.commit()
    return {"status": "success", "message": f"Successfully created/imported {created_count} activities into schedule."}

@router.post("/projects/{project_id}/activities/{activity_id}/assign")
def assign_activity_to_worker(
    project_id: str,
    activity_id: str,
    req: ActivityAssignRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "employer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Employers can assign activities to workers."
        )

    activity = db.query(ScheduleActivity).filter(ScheduleActivity.id == activity_id, ScheduleActivity.project_id == project_id).first()
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule activity not found."
        )

    # Check if worker is a project member
    mem = db.query(ProjectMembership).filter(
        ProjectMembership.project_id == project_id,
        ProjectMembership.worker_id == req.worker_id,
        ProjectMembership.status == "active"
    ).first()

    if not mem:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Worker has not joined this project yet."
        )

    # Create ActivityAssignment
    existing_assign = db.query(ActivityAssignment).filter(
        ActivityAssignment.activity_id == activity_id,
        ActivityAssignment.worker_id == req.worker_id
    ).first()

    if not existing_assign:
        assign = ActivityAssignment(
            activity_id=activity_id,
            worker_id=req.worker_id,
            project_id=project_id,
            assigned_by=current_user.id
        )
        db.add(assign)

        # Notify worker
        worker = db.query(User).filter(User.id == req.worker_id).first()
        notif = Notification(
            user_id=req.worker_id,
            title="New Activity Assigned",
            message=f"You have been assigned to activity {activity.activity_id} ({activity.name}).",
            target_route=f"/worker/projects/{project_id}",
            unread=True
        )
        db.add(notif)

        db.commit()

    return {"status": "success", "message": "Activity assigned to worker successfully."}
