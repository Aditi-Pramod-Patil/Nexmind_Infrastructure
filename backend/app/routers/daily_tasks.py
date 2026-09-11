import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Project, ScheduleActivity, DailyTask, DailyReport, ProgressEvent, Notification, AuditLog, ProjectMembership, ProjectSupervisor, ProgressUpdate
from ..schemas import (
    DailyTaskOut,
    DailyTaskUpdate,
    PlanGenerationOut,
    ConfirmPlanRequest,
    ExecutionPlanOut,
    L5ActivityPlan,
    L6ActivityPlan,
    TaskPlan,
    ConsolidatedProjectProgressOut,
    WorkerProgressUpdateItem,
    ProgressUpdateOut
)
from ..auth_utils import get_current_user
from ..services.plan_generator import generate_execution_plan
from ..services.progress_sync import recalculate_and_sync_progress

router = APIRouter(prefix="/api", tags=["Day-Wise Tasks & Execution Plan"])

def _daily_task_to_out(task: DailyTask, db: Session) -> DailyTaskOut:
    worker_name = None
    if task.assigned_worker_id:
        w = db.query(User).filter(User.id == task.assigned_worker_id).first()
        if w:
            worker_name = w.name

    return DailyTaskOut(
        id=str(task.id),
        project_id=str(task.project_id),
        l6_activity_id=str(task.l6_activity_id) if task.l6_activity_id else None,
        l5_name=task.l5_name,
        l6_name=task.l6_name,
        task_name=task.task_name,
        planned_date=task.planned_date,
        status=task.status or "NOT_STARTED",
        progress=float(task.progress or 0.0),
        actual_start=task.actual_start,
        actual_end=task.actual_end,
        assigned_worker_id=str(task.assigned_worker_id) if task.assigned_worker_id else None,
        assigned_worker_name=worker_name,
        flagged_for_review=bool(task.flagged_for_review),
        review_notes=task.review_notes
    )

def _build_nested_execution_plan(project: Project, db: Session) -> ExecutionPlanOut:
    activities = db.query(ScheduleActivity).filter(ScheduleActivity.project_id == project.id).all()
    tasks = db.query(DailyTask).filter(DailyTask.project_id == project.id).order_by(DailyTask.planned_date.asc()).all()

    # If no activities/tasks exist yet, trigger plan generation
    if not activities or not tasks:
        activities, tasks, _ = generate_execution_plan(project, db)

    l5_acts = [a for a in activities if a.wbs_level == "L5"]
    l6_acts = [a for a in activities if a.wbs_level == "L6"]

    # Fallback if no explicit L5 objects exist: group by l5_name text
    if not l5_acts and l6_acts:
        unique_l5_names = list(set(a.l5_name for a in l6_acts if a.l5_name))
        for idx, l5_n in enumerate(unique_l5_names):
            l5_dummy = ScheduleActivity(
                id=f"dummy-l5-{idx}",
                activity_id=f"L5-0{idx+1}",
                project_id=project.id,
                name=l5_n,
                l5_name=l5_n,
                wbs_level="L5",
                discipline="Civil"
            )
            l5_acts.append(l5_dummy)

    l5_plan_list = []
    for l5 in l5_acts:
        # Find L6 items under this L5
        child_l6s = [a for a in l6_acts if a.parent_l5_id == l5.id or a.l5_name == l5.l5_name]
        l6_plan_list = []

        for l6 in child_l6s:
            # Find daily tasks under this L6
            child_tasks = [t for t in tasks if t.l6_activity_id == l6.id or (t.l5_name == l5.l5_name and t.l6_name == l6.l6_name)]
            task_plan_list = []
            for t in child_tasks:
                task_plan_list.append(TaskPlan(
                    id=str(t.id),
                    date=t.planned_date,
                    name=t.task_name,
                    status=t.status or "NOT_STARTED",
                    progress=float(t.progress or 0.0),
                    discipline=l6.discipline or "Civil",
                    flaggedForReview=bool(t.flagged_for_review),
                    reviewNotes=t.review_notes
                ))

            l6_plan_list.append(L6ActivityPlan(
                id=str(l6.id),
                code=l6.activity_id or "L6-01",
                name=l6.name or l6.l6_name,
                discipline=l6.discipline or "Civil",
                tasks=task_plan_list
            ))

        l5_plan_list.append(L5ActivityPlan(
            id=str(l5.id),
            code=l5.activity_id or "L5-01",
            name=l5.name or l5.l5_name,
            discipline=l5.discipline or "Civil",
            l6Activities=l6_plan_list
        ))

    flagged_count = sum(1 for t in tasks if t.flagged_for_review)
    task_outs = [_daily_task_to_out(t, db) for t in tasks]

    return ExecutionPlanOut(
        projectId=str(project.id),
        status=project.plan_status or "DRAFT",
        generatedAt=project.created_at.isoformat() if project.created_at else datetime.utcnow().isoformat(),
        l5Activities=l5_plan_list,
        day_wise_tasks=task_outs,
        flagged_tasks_count=flagged_count,
        summary_notes=f"Generated {len(l5_plan_list)} L5 Work Packages, {len(l6_acts)} L6 Activities, and {len(tasks)} Day-wise tasks."
    )

@router.post("/projects/{project_id}/execution-plan/generate", response_model=ExecutionPlanOut)
@router.post("/projects/{project_id}/generate-plan", response_model=ExecutionPlanOut)
def generate_project_plan(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    print(f"[DEBUG] Execution plan generation requested. project_id={project_id}, current_user_id={current_user.id}")
    if current_user.role != "employer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Employers can generate execution plans."
        )

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        print(f"[DEBUG] Project not found in database: {project_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found."
        )

    if current_user.role == "employer":
        if str(project.employer_id).strip() != str(current_user.id).strip():
            project.employer_id = current_user.id
            db.commit()

    generate_execution_plan(project, db)
    return _build_nested_execution_plan(project, db)

@router.get("/projects/{project_id}/execution-plan", response_model=ExecutionPlanOut)
@router.get("/projects/{project_id}/plan", response_model=ExecutionPlanOut)
def get_project_plan(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    print(f"[DEBUG] Get execution plan requested. project_id={project_id}, current_user_id={current_user.id}")
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        print(f"[DEBUG] Project not found in database: {project_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found."
        )

    if current_user.role == "employer":
        if str(project.employer_id).strip() != str(current_user.id).strip():
            project.employer_id = current_user.id
            db.commit()

    return _build_nested_execution_plan(project, db)

@router.post("/projects/{project_id}/confirm-plan")
def confirm_project_plan(
    project_id: str,
    req: Optional[ConfirmPlanRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "employer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Employers can confirm plans.")

    project = db.query(Project).filter(Project.id == project_id, Project.employer_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    project.plan_status = "CONFIRMED"
    project.status = "Active"
    db.commit()

    return {"status": "success", "message": "Execution plan confirmed and published to Workers/Supervisors."}

@router.get("/projects/{project_id}/today-tasks", response_model=List[DailyTaskOut])
def get_today_tasks(
    project_id: str,
    date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns day-wise tasks for workers/supervisors.
    If specific date is provided, filters by date.
    Otherwise defaults to current date or closest planned date.
    """
    target_date = date or datetime.now().strftime("%Y-%m-%d")

    tasks = db.query(DailyTask).filter(
        DailyTask.project_id == project_id,
        DailyTask.planned_date == target_date
    ).all()

    # Fallback if no tasks specifically on target_date
    if not tasks:
        tasks = db.query(DailyTask).filter(DailyTask.project_id == project_id).order_by(DailyTask.planned_date.asc()).limit(10).all()

    return [_daily_task_to_out(t, db) for t in tasks]

@router.put("/daily-tasks/{task_id}", response_model=DailyTaskOut)
def update_daily_task(
    task_id: str,
    task_update: DailyTaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Controlled task editing for Employers or Workers updating day-wise tasks."""
    task = db.query(DailyTask).filter(DailyTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    if task_update.task_name is not None:
        task.task_name = task_update.task_name
    if task_update.planned_date is not None:
        task.planned_date = task_update.planned_date
    if task_update.status is not None:
        task.status = task_update.status
    if task_update.progress is not None:
        task.progress = task_update.progress
    if task_update.actual_start is not None:
        task.actual_start = task_update.actual_start
    if task_update.actual_end is not None:
        task.actual_end = task_update.actual_end
    if task_update.flagged_for_review is not None:
        task.flagged_for_review = task_update.flagged_for_review
    if task_update.review_notes is not None:
        task.review_notes = task_update.review_notes

    # Re-calculate overall project progress via cascading sync
    recalculate_and_sync_progress(db=db, project_id=task.project_id)

    # Generate progress notification if progress changed
    if task_update.progress is not None:
        project = db.query(Project).filter(Project.id == task.project_id).first()
        prog_pct_str = f"{task.progress:.0f}%"
        task_short_name = (task.task_name[:32] + "..") if len(task.task_name) > 32 else task.task_name
        if project and project.employer_id and str(project.employer_id) != str(current_user.id):
            notif = Notification(
                user_id=project.employer_id,
                title=f"Task Progress: {prog_pct_str} • {task_short_name}",
                message=f"{current_user.name} updated '{task.task_name}' to {prog_pct_str} [{task.status}].",
                target_route=f"/employer/projects",
                unread=True
            )
            db.add(notif)

    db.commit()
    db.refresh(task)

    return _daily_task_to_out(task, db)

@router.post("/daily-tasks/{task_id}/update", response_model=DailyTaskOut)
def worker_update_task_progress(
    task_id: str,
    update_data: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Worker/Supervisor action to update a Day-wise Executable Task.
    Expected dict payload keys: status, progress, actual_start, actual_end, notes
    """
    task = db.query(DailyTask).filter(DailyTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    if "status" in update_data and update_data["status"]:
        task.status = update_data["status"]

    if "progress" in update_data and update_data["progress"] is not None:
        prog_val = float(update_data["progress"])
        if prog_val < 0.0 or prog_val > 100.0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Progress percentage must be between 0.0 and 100.0.")
        task.progress = round(prog_val, 1)
        if task.progress >= 100.0:
            task.status = "COMPLETED"
        elif task.progress > 0 and task.status == "NOT_STARTED":
            task.status = "IN_PROGRESS"

    if "actual_start" in update_data and update_data["actual_start"]:
        task.actual_start = update_data["actual_start"]

    if "actual_end" in update_data and update_data["actual_end"]:
        task.actual_end = update_data["actual_end"]

    # Record ProgressUpdate history audit entry
    remarks_text = update_data.get("notes") or update_data.get("remarks") or f"Progress updated to {task.progress}% ({task.status})"
    prog_update = ProgressUpdate(
        project_id=task.project_id,
        task_id=task.id,
        l6_activity_id=task.l6_activity_id,
        worker_id=current_user.id,
        date=task.planned_date or datetime.now().strftime("%Y-%m-%d"),
        status=task.status,
        percent_complete=task.progress,
        actual_start_time=task.actual_start,
        actual_end_time=task.actual_end,
        remarks=remarks_text
    )
    db.add(prog_update)

    # Record DailyReport for history
    report = DailyReport(
        project_id=task.project_id,
        activity_id=task.l6_activity_id,
        daily_task_id=task.id,
        worker_id=current_user.id,
        report_date=datetime.now().strftime("%Y-%m-%d"),
        progress_percentage=task.progress,
        description=remarks_text,
        status="Verified"
    )
    db.add(report)

    # Update L6 activity progress and cascade up to L5 package and overall project
    if task.l6_activity_id:
        l6_tasks = db.query(DailyTask).filter(DailyTask.l6_activity_id == task.l6_activity_id).all()
        if l6_tasks:
            l6_avg = sum(t.progress for t in l6_tasks) / len(l6_tasks)
            recalculate_and_sync_progress(
                db=db,
                project_id=task.project_id,
                updated_activity_id=task.l6_activity_id,
                new_progress=l6_avg
            )
        else:
            recalculate_and_sync_progress(db=db, project_id=task.project_id)
    # Generate concise progress notifications for employer and worker
    project = db.query(Project).filter(Project.id == task.project_id).first()
    prog_pct_str = f"{task.progress:.0f}%"
    task_short_name = (task.task_name[:32] + "..") if len(task.task_name) > 32 else task.task_name

    # Notify Employer / PM
    if project and project.employer_id and str(project.employer_id) != str(current_user.id):
        notif_emp = Notification(
            user_id=project.employer_id,
            title=f"Progress: {prog_pct_str} • {task_short_name}",
            message=f"{current_user.name} reported {prog_pct_str} on '{task.task_name}' [{task.status}]. {remarks_text[:60]}",
            target_route=f"/employer/projects",
            unread=True
        )
        db.add(notif_emp)

    # Notify Worker confirmation
    notif_wrk = Notification(
        user_id=current_user.id,
        title=f"Progress Logged: {prog_pct_str}",
        message=f"Logged {prog_pct_str} on '{task.task_name}' ({task.status}). Schedule cascaded.",
        target_route="/worker/dashboard",
        unread=True
    )
    db.add(notif_wrk)

    db.commit()
    db.refresh(task)

    return _daily_task_to_out(task, db)

@router.get("/projects/{project_id}/consolidated-progress", response_model=ConsolidatedProjectProgressOut)
@router.get("/projects/{project_id}/progress-consolidated", response_model=ConsolidatedProjectProgressOut)
def get_consolidated_project_progress(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Consolidated real-time progress endpoint for Employer & Supervisor dashboards.
    Calculated directly from database task execution and progress_updates history.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    # Sync overall progress accurately using WBS duration-weighted recalculation
    recalculate_and_sync_progress(db=db, project_id=project_id)
    project = db.query(Project).filter(Project.id == project_id).first()
    overall_prog = float(project.actual_progress or 0.0)

    # Today's progress calculation
    today_str = datetime.now().strftime("%Y-%m-%d")
    today_tasks = db.query(DailyTask).filter(
        DailyTask.project_id == project_id,
        DailyTask.planned_date == today_str
    ).all()
    
    today_prog = 0.0
    if today_tasks:
        today_prog = round(sum(float(t.progress or 0.0) for t in today_tasks) / len(today_tasks), 1)
    else:
        # Check if any progress updates occurred today
        today_updates = db.query(ProgressUpdate).filter(
            ProgressUpdate.project_id == project_id,
            ProgressUpdate.date == today_str
        ).all()
        if today_updates:
            today_prog = round(sum(float(u.percent_complete or 0.0) for u in today_updates) / len(today_updates), 1)

    # Count reporting workers today
    reporting_workers = db.query(ProgressUpdate.worker_id).filter(
        ProgressUpdate.project_id == project_id,
        ProgressUpdate.date == today_str
    ).distinct().all()
    workers_reporting_count = len(reporting_workers)

    # Total assigned workers
    total_members = db.query(ProjectMembership).filter(
        ProjectMembership.project_id == project_id,
        ProjectMembership.status == "active"
    ).count()

    # Delayed & Blocked tasks count
    all_proj_tasks = db.query(DailyTask).filter(DailyTask.project_id == project_id).all()
    delayed_count = sum(
        1 for t in all_proj_tasks
        if (t.status and t.status.upper() in ["DELAYED", "Delayed"]) or
           (t.planned_date and t.planned_date < today_str and float(t.progress or 0.0) < 100.0 and t.status != "COMPLETED")
    )

    blocked_count = sum(
        1 for t in all_proj_tasks
        if t.status and t.status.upper() in ["BLOCKED", "Blocked"]
    )

    # Fetch latest worker progress updates
    updates = db.query(ProgressUpdate).filter(
        ProgressUpdate.project_id == project_id
    ).order_by(ProgressUpdate.created_at.desc()).limit(20).all()

    update_items = []
    for u in updates:
        worker = db.query(User).filter(User.id == u.worker_id).first()
        task = db.query(DailyTask).filter(DailyTask.id == u.task_id).first() if u.task_id else None
        
        worker_name = worker.name if worker else "Worker"
        worker_email = worker.email if worker else ""
        task_name = task.task_name if task else "Task Execution"
        l5_name = task.l5_name if task else "General Package"
        l6_name = task.l6_name if task else "Execution Item"

        update_items.append(WorkerProgressUpdateItem(
            id=str(u.id),
            worker_name=worker_name,
            worker_email=worker_email,
            task_name=task_name,
            l5_name=l5_name,
            l6_name=l6_name,
            percent_complete=float(u.percent_complete or 0.0),
            status=u.status or "IN_PROGRESS",
            remarks=u.remarks,
            updated_at=u.created_at.strftime("%Y-%m-%d %H:%M")
        ))

    return ConsolidatedProjectProgressOut(
        project_id=str(project.id),
        project_name=project.name,
        overall_progress=overall_prog,
        today_progress=today_prog,
        workers_reporting_count=workers_reporting_count,
        total_workers_count=max(total_members, 1),
        delayed_tasks_count=delayed_count,
        blocked_tasks_count=blocked_count,
        worker_updates=update_items
    )
