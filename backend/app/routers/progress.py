import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Project, ScheduleActivity, DailyReport, ProgressEvent, ProgressUpdate, Notification, AuditLog
from ..schemas import (
    ProgressReportCreate,
    ProgressReportOut,
    TextReportCreate,
    VoiceReportCreate,
    ProgressEventOut,
    CandidateMatchOut,
    ConfirmMatchRequest,
    AuditTrailOut,
    ActivityCreate
)
from ..auth_utils import get_current_user
from ..services.progress_sync import recalculate_and_sync_progress
from ..services.activity_intelligence import parse_report_text, match_l5_l6_activity

router = APIRouter(prefix="/api", tags=["Daily Progress & L5/L6 Intelligence"])

@router.post("/progress/text", response_model=ProgressEventOut, status_code=status.HTTP_201_CREATED)
def process_text_report(
    req: TextReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Process natural language worker text report, extract structured fields, and auto-match L5/L6 activity."""
    project = db.query(Project).filter(Project.id == req.project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    # Extract structured fields (times, progress %, quantity, unit, issues)
    extracted = parse_report_text(req.raw_text)

    # Fetch project activities (L5 & L6)
    activities = db.query(ScheduleActivity).filter(ScheduleActivity.project_id == req.project_id).all()

    # Match L5/L6 activity
    matched_act, confidence, candidate_list, reasoning, match_status = match_l5_l6_activity(
        raw_text=req.raw_text,
        project_activities=activities,
        threshold=0.30
    )

    event_type = extracted.get("event_type", "PROGRESS_UPDATE")
    prog_to_sync = extracted.get("extracted_progress")

    target_act_id = matched_act.id if matched_act else (activities[0].id if activities else None)

    if event_type == "ACTUAL_START" and matched_act:
        matched_act.actual_start = extracted.get("actual_start") or datetime.utcnow().strftime("%Y-%m-%d %H:%M")
        matched_act.status = "In Progress"
        if prog_to_sync is None:
            prog_to_sync = 10.0

    if event_type == "ACTUAL_FINISH" and matched_act:
        matched_act.actual_finish = extracted.get("actual_end") or datetime.utcnow().strftime("%Y-%m-%d %H:%M")
        matched_act.status = "Completed"
        prog_to_sync = 100.0

    # Do NOT assign a default progress value when NLP extracts nothing meaningful.
    # Setting 15% for ambiguous reports would incorrectly update L6 activity progress.
    # Keep prog_to_sync as None — the activity status will still be set to In Progress if ACTUAL_START.
    if prog_to_sync is None and event_type == "ACTUAL_START":
        prog_to_sync = 5.0  # Minimal start acknowledgement only

    # Store ProgressEvent
    event = ProgressEvent(
        project_id=req.project_id,
        worker_id=current_user.id,
        activity_id=target_act_id,
        source_type="TEXT",
        raw_input=req.raw_text,
        transcript=None,
        extracted_progress=prog_to_sync,
        actual_start=extracted.get("actual_start"),
        actual_end=extracted.get("actual_end"),
        quantity=extracted.get("quantity"),
        unit=extracted.get("unit"),
        match_confidence=round(float(confidence), 3),
        status="Automatically Matched" if confidence >= 0.50 else "Pending Review",
        extracted_metadata=json.dumps({
            "event_type": event_type,
            "extracted_fields": extracted,
            "candidate_matches": candidate_list,
            "reasoning_checklist": reasoning,
            "issues": extracted.get("issues")
        })
    )
    db.add(event)

    # Store ProgressUpdate for live Employer dashboard updates
    safe_prog = float(prog_to_sync) if prog_to_sync is not None else 0.0
    prog_update = ProgressUpdate(
        project_id=req.project_id,
        l6_activity_id=target_act_id,
        worker_id=current_user.id,
        date=datetime.now().strftime("%Y-%m-%d"),
        status="COMPLETED" if safe_prog >= 100 else ("IN_PROGRESS" if safe_prog > 0 else "NOT_STARTED"),
        percent_complete=safe_prog,
        actual_start_time=extracted.get("actual_start"),
        actual_end_time=extracted.get("actual_end"),
        remarks=req.raw_text
    )
    db.add(prog_update)

    # Store DailyReport for History
    report = DailyReport(
        project_id=req.project_id,
        activity_id=target_act_id,
        worker_id=current_user.id,
        report_date=datetime.now().strftime("%Y-%m-%d"),
        progress_percentage=safe_prog,
        description=req.raw_text,
        status="Verified"
    )
    db.add(report)

    # Update schedule activity progress and trigger cascading recalculation
    if target_act_id and prog_to_sync is not None:
        recalculate_and_sync_progress(
            db=db,
            project_id=req.project_id,
            updated_activity_id=target_act_id,
            new_progress=prog_to_sync
        )
    else:
        recalculate_and_sync_progress(db=db, project_id=req.project_id)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="L5/L6 Text Intelligence Processing",
        target_entity="ProgressEvent",
        target_id=event.id,
        details=f"Extracted event_type={event_type}, progress={prog_to_sync}%, AI confidence={confidence:.2f}"
    )
    db.add(audit)

    # Concise progress notifications with progress percentage in short
    prog_pct_str = f"{safe_prog:.0f}%" if prog_to_sync is not None else "Logged"
    act_name = matched_act.name if matched_act else "Field Work"
    act_short = (act_name[:30] + "..") if len(act_name) > 30 else act_name
    short_text = (req.raw_text[:50] + "..") if len(req.raw_text) > 50 else req.raw_text

    if project and project.employer_id and str(project.employer_id) != str(current_user.id):
        notif_emp = Notification(
            user_id=project.employer_id,
            title=f"Progress: {prog_pct_str} • {act_short}",
            message=f"{current_user.name} reported {prog_pct_str} progress: \"{short_text}\"",
            target_route="/employer/reports",
            unread=True
        )
        db.add(notif_emp)

    notif_wrk = Notification(
        user_id=current_user.id,
        title=f"Progress Logged: {prog_pct_str}",
        message=f"Text progress saved at {prog_pct_str} on {act_short}.",
        target_route="/worker/dashboard",
        unread=True
    )
    db.add(notif_wrk)

    db.commit()
    db.refresh(event)

    worker = db.query(User).filter(User.id == current_user.id).first()

    return ProgressEventOut(
        id=event.id,
        project_id=event.project_id,
        worker_id=event.worker_id,
        worker_name=worker.name if worker else "Worker",
        activity_id=event.activity_id,
        activity_code=matched_act.activity_id if matched_act else None,
        activity_name=matched_act.name if matched_act else None,
        l5_name=matched_act.l5_name if matched_act else None,
        source_type=event.source_type,
        raw_input=event.raw_input,
        transcript=event.transcript,
        extracted_progress=event.extracted_progress,
        actual_start=event.actual_start,
        actual_end=event.actual_end,
        quantity=event.quantity,
        unit=event.unit,
        match_confidence=event.match_confidence,
        status=event.status,
        created_at=event.created_at.strftime("%Y-%m-%d %H:%M"),
        candidate_matches=[CandidateMatchOut(**c) for c in candidate_list],
        reasoning_checklist=reasoning,
        issues=extracted.get("issues")
    )


@router.post("/progress/voice")
def process_voice_report(
    req: VoiceReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Process voice report transcript through Speech-to-Text pipeline & L5/L6 Intelligence."""
    project = db.query(Project).filter(Project.id == req.project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    # Check transcript availability
    if not req.transcript and not req.audio_base64:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No voice transcript or audio data provided.")

    transcript_text = (req.transcript or "").strip()
    if not transcript_text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Voice audio transcript is empty. Please speak into the microphone or type your field report.")

    # Extract structured fields
    extracted = parse_report_text(transcript_text)

    # Fetch project activities
    activities = db.query(ScheduleActivity).filter(ScheduleActivity.project_id == req.project_id).all()

    # Match L5/L6
    matched_act, confidence, candidate_list, reasoning, match_status = match_l5_l6_activity(
        raw_text=transcript_text,
        project_activities=activities,
        threshold=0.30
    )

    event_type = extracted.get("event_type", "PROGRESS_UPDATE")
    prog_to_sync = extracted.get("extracted_progress")

    target_act_id = matched_act.id if matched_act else (activities[0].id if activities else None)

    if event_type == "ACTUAL_START" and matched_act:
        matched_act.actual_start = extracted.get("actual_start") or datetime.utcnow().strftime("%Y-%m-%d %H:%M")
        matched_act.status = "In Progress"
        if prog_to_sync is None:
            prog_to_sync = 10.0

    if event_type == "ACTUAL_FINISH" and matched_act:
        matched_act.actual_finish = extracted.get("actual_end") or datetime.utcnow().strftime("%Y-%m-%d %H:%M")
        matched_act.status = "Completed"
        prog_to_sync = 100.0

    if prog_to_sync is None and event_type == "ACTUAL_START":
        prog_to_sync = 5.0  # Minimal start acknowledgement only

    # Create ProgressEvent
    event = ProgressEvent(
        project_id=req.project_id,
        worker_id=current_user.id,
        activity_id=target_act_id,
        source_type="VOICE",
        raw_input=transcript_text,
        transcript=transcript_text,
        extracted_progress=prog_to_sync,
        actual_start=extracted.get("actual_start"),
        actual_end=extracted.get("actual_end"),
        quantity=extracted.get("quantity"),
        unit=extracted.get("unit"),
        match_confidence=round(float(confidence), 3),
        status="Automatically Matched" if confidence >= 0.50 else "Pending Review",
        extracted_metadata=json.dumps({
            "event_type": event_type,
            "extracted_fields": extracted,
            "candidate_matches": candidate_list,
            "reasoning_checklist": reasoning,
            "issues": extracted.get("issues")
        })
    )
    db.add(event)

    # Store ProgressUpdate for live Employer dashboard updates
    safe_prog = float(prog_to_sync) if prog_to_sync is not None else 0.0
    prog_update = ProgressUpdate(
        project_id=req.project_id,
        l6_activity_id=target_act_id,
        worker_id=current_user.id,
        date=datetime.now().strftime("%Y-%m-%d"),
        status="COMPLETED" if safe_prog >= 100 else ("IN_PROGRESS" if safe_prog > 0 else "NOT_STARTED"),
        percent_complete=safe_prog,
        actual_start_time=extracted.get("actual_start"),
        actual_end_time=extracted.get("actual_end"),
        remarks=transcript_text
    )
    db.add(prog_update)

    # Store DailyReport for History
    report = DailyReport(
        project_id=req.project_id,
        activity_id=target_act_id,
        worker_id=current_user.id,
        report_date=datetime.now().strftime("%Y-%m-%d"),
        progress_percentage=safe_prog,
        description=transcript_text,
        status="Verified"
    )
    db.add(report)

    # Update schedule activity progress and trigger cascading recalculation
    if target_act_id and prog_to_sync is not None:
        recalculate_and_sync_progress(
            db=db,
            project_id=req.project_id,
            updated_activity_id=target_act_id,
            new_progress=prog_to_sync
        )
    else:
        recalculate_and_sync_progress(db=db, project_id=req.project_id)

    # Concise voice progress notifications
    prog_pct_str = f"{safe_prog:.0f}%" if prog_to_sync is not None else "Logged"
    act_name = matched_act.name if matched_act else "Field Work"
    act_short = (act_name[:30] + "..") if len(act_name) > 30 else act_name
    short_voice = (transcript_text[:50] + "..") if len(transcript_text) > 50 else transcript_text

    if project and project.employer_id and str(project.employer_id) != str(current_user.id):
        notif_emp = Notification(
            user_id=project.employer_id,
            title=f"Voice Progress: {prog_pct_str} • {act_short}",
            message=f"🎙️ {current_user.name} reported {prog_pct_str} via voice: \"{short_voice}\"",
            target_route="/employer/reports",
            unread=True
        )
        db.add(notif_emp)

    notif_wrk = Notification(
        user_id=current_user.id,
        title=f"Voice Progress Logged: {prog_pct_str}",
        message=f"🎙️ Voice update saved: {prog_pct_str} on {act_short}.",
        target_route="/worker/dashboard",
        unread=True
    )
    db.add(notif_wrk)

    db.commit()
    db.refresh(event)

    worker = db.query(User).filter(User.id == current_user.id).first()

    return {
        "status": "success",
        "event": ProgressEventOut(
            id=event.id,
            project_id=event.project_id,
            worker_id=event.worker_id,
            worker_name=worker.name if worker else "Worker",
            activity_id=event.activity_id,
            activity_code=matched_act.activity_id if matched_act else None,
            activity_name=matched_act.name if matched_act else None,
            l5_name=matched_act.l5_name if matched_act else None,
            source_type=event.source_type,
            raw_input=event.raw_input,
            transcript=event.transcript,
            extracted_progress=event.extracted_progress,
            actual_start=event.actual_start,
            actual_end=event.actual_end,
            quantity=event.quantity,
            unit=event.unit,
            match_confidence=event.match_confidence,
            status=event.status,
            created_at=event.created_at.strftime("%Y-%m-%d %H:%M"),
            candidate_matches=[CandidateMatchOut(**c) for c in candidate_list],
            reasoning_checklist=reasoning,
            issues=extracted.get("issues")
        )
    }


@router.get("/projects/{project_id}/progress-events", response_model=List[ProgressEventOut])
def get_project_progress_events(
    project_id: str,
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch progress events for a project with optional status filtering."""
    query = db.query(ProgressEvent).filter(ProgressEvent.project_id == project_id)
    if status_filter:
        query = query.filter(ProgressEvent.status == status_filter)

    events = query.order_by(ProgressEvent.created_at.desc()).all()

    result = []
    for ev in events:
        worker = db.query(User).filter(User.id == ev.worker_id).first()
        act = db.query(ScheduleActivity).filter(ScheduleActivity.id == ev.activity_id).first() if ev.activity_id else None
        conf_user = db.query(User).filter(User.id == ev.confirmed_by).first() if ev.confirmed_by else None

        # Parse extracted metadata JSON
        candidates = []
        reasoning = []
        issues = None
        if ev.extracted_metadata:
            try:
                meta = json.loads(ev.extracted_metadata)
                candidates = [CandidateMatchOut(**c) for c in meta.get("candidate_matches", [])]
                reasoning = meta.get("reasoning_checklist", [])
                issues = meta.get("issues")
            except Exception:
                pass

        # Preserve the real status — do NOT silently upgrade Pending Review to Automatically Matched.
        # The employer's review queue must show the accurate status so they can confirm low-confidence matches.
        ev_status = ev.status or "Pending Review"

        result.append(ProgressEventOut(
            id=ev.id,
            project_id=ev.project_id,
            worker_id=ev.worker_id,
            worker_name=worker.name if worker else "Worker",
            activity_id=ev.activity_id,
            activity_code=act.activity_id if act else None,
            activity_name=act.name if act else None,
            l5_name=act.l5_name if act else None,
            source_type=ev.source_type,
            raw_input=ev.raw_input,
            transcript=ev.transcript,
            extracted_progress=ev.extracted_progress if ev.extracted_progress is not None else 100.0,
            actual_start=ev.actual_start,
            actual_end=ev.actual_end,
            quantity=ev.quantity,
            unit=ev.unit,
            match_confidence=round(float(ev.match_confidence or 0.0), 3),
            status=ev_status,
            confirmed_by_name=conf_user.name if conf_user else None,
            confirmed_at=ev.confirmed_at.strftime("%Y-%m-%d %H:%M") if ev.confirmed_at else None,
            created_at=ev.created_at.strftime("%Y-%m-%d %H:%M"),
            candidate_matches=candidates,
            reasoning_checklist=reasoning,
            issues=issues
        ))

    return result


@router.post("/progress-events/{event_id}/confirm")
def confirm_or_resolve_match(
    event_id: str,
    req: ConfirmMatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Planner/Employer action to confirm match, create new activity, or reject an unmatched progress report."""
    if current_user.role != "employer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Employers can confirm activity matches.")

    event = db.query(ProgressEvent).filter(ProgressEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Progress event not found.")

    if req.action == "confirm":
        if not req.matched_activity_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="matched_activity_id required for confirm action.")

        activity = db.query(ScheduleActivity).filter(ScheduleActivity.id == req.matched_activity_id).first()
        if not activity:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target activity not found.")

        event.activity_id = activity.id
        event.status = "Confirmed"
        event.confirmed_by = current_user.id
        event.confirmed_at = datetime.utcnow()

        # Override or apply progress
        prog_to_apply = req.override_progress if req.override_progress is not None else event.extracted_progress
        if prog_to_apply is not None:
            recalculate_and_sync_progress(
                db=db,
                project_id=event.project_id,
                updated_activity_id=activity.id,
                new_progress=prog_to_apply
            )

    elif req.action == "create_new":
        code = req.new_activity_code or f"L6-NEW-{int(datetime.utcnow().timestamp()) % 10000}"
        name = req.new_activity_name or event.raw_input[:60]
        l5 = req.new_activity_l5 or "Unbudgeted Site Activities"

        new_act = ScheduleActivity(
            activity_id=code,
            project_id=event.project_id,
            name=name,
            discipline=req.new_activity_discipline or "Civil Works",
            l5_name=l5,
            l6_name=name,
            wbs_level="L6",
            planned_start=datetime.utcnow().strftime("%Y-%m-%d"),
            planned_finish=datetime.utcnow().strftime("%Y-%m-%d"),
            planned_progress=100.0,
            actual_progress=event.extracted_progress or 0.0,
            status="In Progress"
        )
        db.add(new_act)
        db.flush()

        event.activity_id = new_act.id
        event.status = "Confirmed"
        event.confirmed_by = current_user.id
        event.confirmed_at = datetime.utcnow()

    elif req.action == "reject":
        event.status = "Rejected"
        event.confirmed_by = current_user.id
        event.confirmed_at = datetime.utcnow()

    db.commit()
    return {"status": "success", "message": f"Progress event {req.action} successfully updated."}


@router.get("/progress-events/{event_id}/audit", response_model=AuditTrailOut)
def get_event_audit_trail(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve full audit trail of how system matched L5/L6 activity."""
    event = db.query(ProgressEvent).filter(ProgressEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Progress event not found.")

    conf_user = db.query(User).filter(User.id == event.confirmed_by).first() if event.confirmed_by else None
    act = db.query(ScheduleActivity).filter(ScheduleActivity.id == event.activity_id).first() if event.activity_id else None

    extracted_fields = {}
    candidates = []
    if event.extracted_metadata:
        try:
            meta = json.loads(event.extracted_metadata)
            extracted_fields = meta.get("extracted_fields", {})
            candidates = [CandidateMatchOut(**c) for c in meta.get("candidate_matches", [])]
        except Exception:
            pass

    return AuditTrailOut(
        event_id=event.id,
        raw_input=event.raw_input,
        source_type=event.source_type,
        transcript=event.transcript,
        extracted_fields=extracted_fields,
        candidate_matches=candidates,
        matched_activity=f"{act.activity_id} — {act.name}" if act else None,
        match_confidence=event.match_confidence,
        confirmed_by=conf_user.name if conf_user else None,
        confirmed_at=event.confirmed_at.strftime("%Y-%m-%d %H:%M") if event.confirmed_at else None,
        status=event.status,
        created_at=event.created_at.strftime("%Y-%m-%d %H:%M")
    )


# Standard Daily Progress Reports Endpoint
@router.post("/progress", response_model=ProgressReportOut, status_code=status.HTTP_201_CREATED)
def submit_daily_progress(
    report_data: ProgressReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ("worker", "supervisor"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Workers and Supervisors can submit daily progress reports."
        )

    project = db.query(Project).filter(Project.id == report_data.project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found."
        )

    activity = None
    if report_data.activity_id:
        activity = db.query(ScheduleActivity).filter(ScheduleActivity.id == report_data.activity_id).first()

    report = DailyReport(
        project_id=report_data.project_id,
        activity_id=report_data.activity_id,
        worker_id=current_user.id,
        report_date=report_data.report_date,
        progress_percentage=report_data.progress_percentage,
        description=report_data.description,
        issues=report_data.issues,
        image_url=report_data.image_url,
        status="Pending Verification"
    )
    db.add(report)

    if activity:
        recalculate_and_sync_progress(
            db=db,
            project_id=report_data.project_id,
            updated_activity_id=activity.id,
            new_progress=report_data.progress_percentage
        )
    else:
        recalculate_and_sync_progress(db=db, project_id=report_data.project_id)

    prog_pct_str = f"{report_data.progress_percentage:.0f}%"
    notification = Notification(
        user_id=project.employer_id,
        title=f"Daily Progress: {prog_pct_str} • {project.name[:25]}",
        message=f"{current_user.name} submitted {prog_pct_str} progress on {project.name}.",
        target_route="/employer/reports",
        unread=True
    )
    db.add(notification)

    audit = AuditLog(
        user_id=current_user.id,
        action="Submit Daily Progress Report",
        target_entity="DailyReport",
        target_id=report.id,
        details=f"Reported {report_data.progress_percentage}% on project {project.code}"
    )
    db.add(audit)

    db.commit()
    db.refresh(report)

    return ProgressReportOut(
        id=report.id,
        project_id=report.project_id,
        activity_id=report.activity_id,
        activity_name=activity.name if activity else "General Site Progress",
        activity_code=activity.activity_id if activity else project.code,
        worker_id=report.worker_id,
        worker_name=current_user.name,
        report_date=report.report_date,
        progress_percentage=report.progress_percentage,
        description=report.description,
        issues=report.issues,
        image_url=report.image_url,
        status=report.status
    )

@router.get("/projects/{project_id}/progress", response_model=List[ProgressReportOut])
def get_project_progress_reports(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    reports = db.query(DailyReport).filter(DailyReport.project_id == project_id).all()

    result = []
    for r in reports:
        w = db.query(User).filter(User.id == r.worker_id).first()
        act = db.query(ScheduleActivity).filter(ScheduleActivity.id == r.activity_id).first() if r.activity_id else None
        result.append(ProgressReportOut(
            id=r.id,
            project_id=r.project_id,
            activity_id=r.activity_id,
            activity_name=act.name if act else "General Field Work",
            activity_code=act.activity_id if act else "GENERAL",
            worker_id=r.worker_id,
            worker_name=w.name if w else "Worker",
            report_date=r.report_date,
            progress_percentage=r.progress_percentage,
            description=r.description,
            issues=r.issues,
            image_url=r.image_url,
            status=r.status
        ))
    return result
