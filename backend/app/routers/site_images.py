import json
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Project, SiteImage, ScheduleActivity, DailyTask, ProgressEvent, Notification
from ..schemas import SiteImageUpload, RoboflowAnalyzeRequest
from ..auth_utils import get_current_user
from ..services import roboflow_service
from ..services.progress_sync import recalculate_and_sync_progress

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Site Images"])

def _update_activity_progress(db: Session, site_img: SiteImage, progress_estimate: Optional[float]):
    """Update linked activity and project progress based on AI-detected progress."""
    if progress_estimate is None:
        return

    activity = None
    if site_img.activity_id:
        activity = db.query(ScheduleActivity).filter(ScheduleActivity.id == site_img.activity_id).first()
    elif site_img.daily_task_id:
        task = db.query(DailyTask).filter(DailyTask.id == site_img.daily_task_id).first()
        if task:
            task.progress = round(float(progress_estimate), 1)
            if task.progress >= 100.0:
                task.status = "COMPLETED"
            elif task.progress > 0.0:
                task.status = "IN_PROGRESS"
            if task.l6_activity_id:
                activity = db.query(ScheduleActivity).filter(ScheduleActivity.id == task.l6_activity_id).first()

    # Fallback: if no specific activity linked, find project's active activities
    if not activity and site_img.project_id:
        activities = db.query(ScheduleActivity).filter(
            ScheduleActivity.project_id == site_img.project_id,
            ScheduleActivity.wbs_level == "L6"
        ).all()
        if activities:
            activity = activities[0]

    if activity and float(progress_estimate) > 0:
        recalculate_and_sync_progress(
            db=db,
            project_id=site_img.project_id,
            updated_activity_id=activity.id,
            new_progress=float(progress_estimate),
            commit=False
        )
    else:
        recalculate_and_sync_progress(db=db, project_id=site_img.project_id, commit=False)


def _format_image_response(img: SiteImage) -> dict:
    """Standard response format for a site image."""
    detected = None
    if img.detected_elements:
        try:
            detected = json.loads(img.detected_elements)
        except Exception:
            detected = None

    return {
        "id": img.id,
        "project_id": img.project_id,
        "activity_id": img.activity_id,
        "daily_task_id": img.daily_task_id,
        "worker_id": img.worker_id,
        "image_url": img.image_url,
        "description": img.description,
        "ai_status": img.ai_status,
        "ai_confidence": img.ai_confidence,
        "ai_progress_estimate": img.ai_progress_estimate,
        "detected_elements": detected,
        "created_at": img.created_at.strftime("%Y-%m-%d %H:%M") if img.created_at else None
    }


@router.post("/site-images")
def upload_site_image(
    image_data: SiteImageUpload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a site image and automatically trigger Roboflow AI analysis."""
    site_img = SiteImage(
        project_id=image_data.project_id,
        activity_id=image_data.activity_id,
        daily_task_id=image_data.daily_task_id,
        worker_id=current_user.id,
        image_url=image_data.image_url,
        description=image_data.description,
        ai_status="analyzing",
        ai_confidence=0.0
    )
    db.add(site_img)
    db.flush()

    # Auto-trigger AI analysis pipeline (ML Vision -> NLP Description Fallback -> Insufficient Data)
    try:
        from ..services.activity_intelligence import parse_report_text
        analysis = roboflow_service.analyze_image(image_data.image_url)

        detected_elems = analysis.get("detected_elements", [])
        ml_progress = analysis.get("progress_estimate")
        ml_conf = analysis.get("overall_confidence", 0.0)

        extracted_prog = None
        event_status = "Pending Review"
        notice_summary = ""

        if detected_elems and ml_progress is not None and ml_conf >= 0.15:
            site_img.ai_status = "analyzed_ml"
            site_img.ai_confidence = round(ml_conf * 100.0, 1)
            site_img.ai_progress_estimate = float(ml_progress)
            extracted_prog = float(ml_progress)
            event_status = "Automatically Matched" if ml_conf > 0.6 else "Pending Review"
            notice_summary = analysis.get("summary", "")
            site_img.detected_elements = json.dumps({
                "source": "ML_VISION",
                "elements": detected_elems,
                "summary": notice_summary
            })
        else:
            # Requirement 8 Fallback: ML failed or returned no detection -> Use worker text description NLP
            nlp_extracted = parse_report_text(image_data.description or "")
            nlp_prog = nlp_extracted.get("extracted_progress")

            if nlp_prog is not None:
                site_img.ai_status = "analyzed_nlp_fallback"
                site_img.ai_confidence = 85.0
                site_img.ai_progress_estimate = float(nlp_prog)
                extracted_prog = float(nlp_prog)
                event_status = "Automatically Matched"
                notice_summary = f"ML returned no detection. Extracted progress from text description: {nlp_prog}%."
                site_img.detected_elements = json.dumps({
                    "source": "NLP_DESCRIPTION_FALLBACK",
                    "extracted_fields": nlp_extracted,
                    "summary": notice_summary
                })
            else:
                site_img.ai_status = "pending_review"
                site_img.ai_confidence = 0.0
                site_img.ai_progress_estimate = None
                extracted_prog = None
                event_status = "Pending Review"
                notice_summary = "Insufficient data to calculate progress."
                site_img.detected_elements = json.dumps({
                    "source": "INSUFFICIENT_DATA",
                    "summary": notice_summary
                })

        if extracted_prog is not None:
            _update_activity_progress(db, site_img, extracted_prog)

        progress_event = ProgressEvent(
            project_id=image_data.project_id,
            worker_id=current_user.id,
            activity_id=image_data.activity_id,
            daily_task_id=image_data.daily_task_id,
            source_type="IMAGE",
            raw_input=image_data.description or "Site photo uploaded for analysis",
            extracted_progress=extracted_prog,
            match_confidence=site_img.ai_confidence / 100.0,
            status=event_status,
            extracted_metadata=json.dumps({
                "image_id": site_img.id,
                "summary": notice_summary,
                "ai_progress_estimate": extracted_prog
            })
        )
        db.add(progress_event)

        # Generate concise site photo progress notifications
        project = db.query(Project).filter(Project.id == image_data.project_id).first()
        prog_display = f"{extracted_prog:.0f}%" if extracted_prog is not None else "Photo Evidence"
        if project and project.employer_id and str(project.employer_id) != str(current_user.id):
            notif_emp = Notification(
                user_id=project.employer_id,
                title=f"Photo Progress: {prog_display}",
                message=f"📸 {current_user.name} uploaded site photo ({prog_display} progress detected).",
                target_route="/employer/site-images",
                unread=True
            )
            db.add(notif_emp)

        notif_wrk = Notification(
            user_id=current_user.id,
            title=f"Photo Analyzed: {prog_display}",
            message=f"📸 AI analyzed your site photo ({prog_display}, confidence {site_img.ai_confidence:.0f}%).",
            target_route="/worker/dashboard",
            unread=True
        )
        db.add(notif_wrk)

        db.commit()
        db.refresh(site_img)

        logger.info(f"Image {site_img.id} processed: {notice_summary}")

    except Exception as e:
        logger.error(f"Auto-analysis failed for image {site_img.id}: {e}", exc_info=True)
        site_img.ai_status = "pending_review"
        db.commit()

    return _format_image_response(site_img)


@router.get("/projects/{project_id}/site-images")
def get_project_site_images(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    images = db.query(SiteImage).filter(SiteImage.project_id == project_id).order_by(SiteImage.created_at.desc()).all()
    return [_format_image_response(img) for img in images]


@router.post("/site-images/analyze-roboflow")
def analyze_image_with_roboflow(
    req: RoboflowAnalyzeRequest,
    current_user: User = Depends(get_current_user)
):
    """Run Roboflow workflow on an arbitrary image path/URL (standalone test)."""
    try:
        analysis = roboflow_service.analyze_image(
            image_input=req.image_path_or_url,
            use_cache=req.use_cache
        )
        return {
            "status": "success",
            "image": req.image_path_or_url,
            "analysis": {
                "detected_elements": analysis.get("detected_elements", []),
                "progress_estimate": analysis.get("progress_estimate"),
                "overall_confidence": analysis.get("overall_confidence", 0.0),
                "summary": analysis.get("summary", "")
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Roboflow inference error: {str(e)}"
        )


@router.post("/site-images/{image_id}/analyze")
def analyze_site_image_by_id(
    image_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Trigger/re-trigger Roboflow AI analysis on a stored site image."""
    site_img = db.query(SiteImage).filter(SiteImage.id == image_id).first()
    if not site_img:
        raise HTTPException(status_code=404, detail="Site image not found")

    try:
        from ..services.activity_intelligence import parse_report_text
        site_img.ai_status = "analyzing"
        db.commit()

        analysis = roboflow_service.analyze_image(
            image_input=site_img.image_url,
            use_cache=True
        )

        detected_elems = analysis.get("detected_elements", [])
        prog_est = analysis.get("progress_estimate")
        ml_conf = analysis.get("overall_confidence", 0.0)

        if detected_elems and prog_est is not None:
            site_img.ai_status = "analyzed"
            site_img.ai_confidence = round(ml_conf * 100.0, 1)
            site_img.ai_progress_estimate = float(prog_est)
            summary_txt = analysis.get("summary", "")
            site_img.detected_elements = json.dumps({
                "source": "ML_VISION",
                "elements": detected_elems,
                "summary": summary_txt,
                "raw_classes": analysis.get("raw_classes", [])
            })
            _update_activity_progress(db, site_img, float(prog_est))
        else:
            # Fallback to text description parsing
            nlp_extracted = parse_report_text(site_img.description or "")
            nlp_prog = nlp_extracted.get("extracted_progress")

            if nlp_prog is not None:
                site_img.ai_status = "analyzed_nlp_fallback"
                site_img.ai_confidence = 85.0
                site_img.ai_progress_estimate = float(nlp_prog)
                summary_txt = f"ML returned no detection. Progress from description: {nlp_prog}%."
                site_img.detected_elements = json.dumps({
                    "source": "NLP_DESCRIPTION_FALLBACK",
                    "extracted_fields": nlp_extracted,
                    "summary": summary_txt
                })
                _update_activity_progress(db, site_img, float(nlp_prog))
            else:
                site_img.ai_status = "pending_review"
                site_img.ai_confidence = 0.0
                site_img.ai_progress_estimate = None
                summary_txt = "No visual elements or text quantities detected."
                site_img.detected_elements = json.dumps({
                    "source": "INSUFFICIENT_DATA",
                    "summary": summary_txt
                })

        db.commit()
        db.refresh(site_img)

        return {
            "id": site_img.id,
            "ai_status": site_img.ai_status,
            "ai_confidence": site_img.ai_confidence,
            "ai_progress_estimate": site_img.ai_progress_estimate,
            "analysis": {
                "detected_elements": detected_elems,
                "progress_estimate": site_img.ai_progress_estimate,
                "overall_confidence": site_img.ai_confidence / 100.0,
                "summary": summary_txt
            }
        }
    except Exception as e:
        site_img.ai_status = "failed"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

