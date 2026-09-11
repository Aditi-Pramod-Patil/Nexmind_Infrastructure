from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime
from ..models import Project, ScheduleActivity, DailyTask

def recalculate_and_sync_progress(
    db: Session,
    project_id: str,
    updated_activity_id: Optional[str] = None,
    new_progress: Optional[float] = None,
    commit: bool = True
) -> float:
    """
    Cascading Progress Synchronization Service (Optimized Batch Engine):
    - Updates target ScheduleActivity progress if specified.
    - Recalculates L6 Activities from DailyTasks using batch mapping (zero N+1 queries).
    - Cascades progress from L6 Activities -> Parent L5 Work Package activities.
    - Recalculates and updates overall Project.actual_progress.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return 0.0

    today_str = datetime.now().strftime("%Y-%m-%d")

    # 1. Update specific activity if requested
    if updated_activity_id and new_progress is not None:
        act = db.query(ScheduleActivity).filter(
            ScheduleActivity.id == updated_activity_id,
            ScheduleActivity.project_id == project_id
        ).first()

        if not act:
            act = db.query(ScheduleActivity).filter(
                ScheduleActivity.activity_id == updated_activity_id,
                ScheduleActivity.project_id == project_id
            ).first()

        if act:
            act.actual_progress = round(float(new_progress), 1)
            if act.actual_progress >= 100.0:
                act.status = "Completed"
            elif act.actual_progress > 0.0:
                act.status = "In Progress"
            else:
                act.status = "Not Started"

            # Propagate updated progress to child DailyTasks
            d_child_tasks = db.query(DailyTask).filter(
                DailyTask.project_id == project_id,
                (DailyTask.l6_activity_id == act.id) | (DailyTask.l6_name == act.l6_name)
            ).all()
            for dt in d_child_tasks:
                dt.progress = act.actual_progress
                if dt.progress >= 100.0:
                    dt.status = "COMPLETED"
                elif dt.progress > 0.0:
                    dt.status = "IN_PROGRESS"

            # If L5 package was directly updated, propagate to L6 children
            if act.wbs_level == "L5":
                l6_children = db.query(ScheduleActivity).filter(
                    ScheduleActivity.project_id == project_id,
                    (ScheduleActivity.parent_l5_id == act.id) | (ScheduleActivity.l5_name == act.l5_name),
                    ScheduleActivity.wbs_level == "L6"
                ).all()

                for l6 in l6_children:
                    l6.actual_progress = act.actual_progress
                    l6.status = act.status

    # 2. Batch fetch all daily tasks and schedule activities for this project (2 SQL queries total)
    all_daily_tasks = db.query(DailyTask).filter(DailyTask.project_id == project_id).all()
    all_activities = db.query(ScheduleActivity).filter(ScheduleActivity.project_id == project_id).all()

    tasks_by_l6 = {}
    for dt in all_daily_tasks:
        key_id = str(dt.l6_activity_id) if dt.l6_activity_id else None
        key_name = dt.l6_name
        if key_id:
            tasks_by_l6.setdefault(key_id, []).append(dt)
        if key_name:
            tasks_by_l6.setdefault(key_name, []).append(dt)

    l6_activities = [a for a in all_activities if a.wbs_level == "L6"]
    l5_activities = [a for a in all_activities if a.wbs_level == "L5"]

    updated_act_id_str = str(updated_activity_id) if updated_activity_id else None

    for l6 in l6_activities:
        d_tasks = tasks_by_l6.get(str(l6.id)) or tasks_by_l6.get(l6.l6_name) or []
        if d_tasks and (not updated_act_id_str or (str(l6.id) != updated_act_id_str and l6.activity_id != updated_act_id_str)):
            avg_dt = sum(float(dt.progress or 0.0) for dt in d_tasks) / len(d_tasks)
            l6.actual_progress = round(avg_dt, 1)

        if l6.actual_progress >= 100.0:
            l6.status = "Completed"
        elif l6.actual_progress > 0.0:
            l6.status = "In Progress"
        elif l6.planned_finish and l6.planned_finish < today_str:
            l6.status = "Delayed"
            try:
                fin_dt = datetime.strptime(l6.planned_finish, "%Y-%m-%d")
                now_dt = datetime.strptime(today_str, "%Y-%m-%d")
                l6.delay_days = max(0, (now_dt - fin_dt).days)
            except Exception:
                l6.delay_days = 1
        else:
            l6.status = "Not Started"

    # 3. Batch map L6s to L5 Parent Packages
    l6_by_l5 = {}
    for l6 in l6_activities:
        key_id = str(l6.parent_l5_id) if l6.parent_l5_id else None
        key_name = l6.l5_name
        if key_id:
            l6_by_l5.setdefault(key_id, []).append(l6)
        if key_name:
            l6_by_l5.setdefault(key_name, []).append(l6)

    for l5_act in l5_activities:
        child_l6s = l6_by_l5.get(str(l5_act.id)) or l6_by_l5.get(l5_act.l5_name) or []
        if child_l6s:
            avg_progress = sum(float(l6.actual_progress or 0.0) for l6 in child_l6s) / len(child_l6s)
            l5_act.actual_progress = round(avg_progress, 1)

            if l5_act.actual_progress >= 100.0:
                l5_act.status = "Completed"
            elif l5_act.actual_progress > 0.0:
                l5_act.status = "In Progress"
            else:
                l5_act.status = "Not Started"

    def _get_activity_weight(act: ScheduleActivity) -> float:
        try:
            s = datetime.strptime(act.planned_start, "%Y-%m-%d")
            f = datetime.strptime(act.planned_finish, "%Y-%m-%d")
            return max(float((f - s).days + 1), 1.0)
        except Exception:
            return 1.0

    # 4. Recalculate overall Project actual progress
    if l6_activities:
        weighted_sum = sum(float(a.actual_progress or 0.0) * _get_activity_weight(a) for a in l6_activities)
        total_weight = sum(_get_activity_weight(a) for a in l6_activities)
        project.actual_progress = round(weighted_sum / max(total_weight, 1.0), 1)
    elif all_daily_tasks:
        overall_avg = sum(float(dt.progress or 0.0) for dt in all_daily_tasks) / len(all_daily_tasks)
        project.actual_progress = round(overall_avg, 1)
    else:
        if all_activities:
            weighted_sum = sum(float(a.actual_progress or 0.0) * _get_activity_weight(a) for a in all_activities)
            total_weight = sum(_get_activity_weight(a) for a in all_activities)
            project.actual_progress = round(weighted_sum / max(total_weight, 1.0), 1)

    if commit:
        db.commit()
    return project.actual_progress
