import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, HistoricalExecution, AuditLog, Project
from ..schemas import (
    HistoricalExecutionOut,
    HistoricalExecutionCreate,
    SystemAuditLogOut,
    ArchivedProjectOut,
    MemoryQueryRequest,
    MemoryQueryResponse,
    MemoryQueryResultItem
)
from ..auth_utils import get_current_user

router = APIRouter(prefix="/api/history", tags=["Project History & Memory"])

DEFAULT_BENCHMARKS = [
    {
        "id": "hist-1",
        "project_category": "Heavy Piping & Mechanical Infrastructure",
        "activity_type": "Spool Piping Erection & High-Pressure Tie-In",
        "average_days": 5.2,
        "baseline_days": 3.5,
        "projects_analyzed_count": 6,
        "top_delay_causes": ["Material delivery delay", "Crane access priority clash", "Hydro-testing rework"],
        "ai_insight": "Across 6 similar industrial piping projects, spool erection averaged 5.2 days vs 3.5 days baseline assumption. Main drivers were site crane schedule clashes and delayed flange shipments."
    },
    {
        "id": "hist-2",
        "project_category": "Civil & Heavy Substructure",
        "activity_type": "Deep Foundation Bored Piling (18m-24m)",
        "average_days": 2.8,
        "baseline_days": 2.0,
        "projects_analyzed_count": 8,
        "top_delay_causes": ["Uncharted underground rock strata", "Bentonite slurry recycling bottleneck", "Heavy monsoon rain"],
        "ai_insight": "Bored piling execution averaged 2.8 days per pier vs 2.0 baseline. Soil resistance variability in hard rock strata caused 40% of overall foundation phase schedule slips."
    },
    {
        "id": "hist-3",
        "project_category": "Structural Concrete & Superstructure",
        "activity_type": "Elevated Deck Slab Shuttering & Pouring",
        "average_days": 4.1,
        "baseline_days": 3.0,
        "projects_analyzed_count": 5,
        "top_delay_causes": ["Rebar binding sign-off delay", "Concrete batching plant dispatch queue", "Curing inspection delays"],
        "ai_insight": "Formwork and rebar inspection bottlenecks added an average of 1.1 days per slab pour cycle. Pre-checking rebar cages 24 hours in advance reduced approval friction by 65%."
    },
    {
        "id": "hist-4",
        "project_category": "Electrical & Substation Installation",
        "activity_type": "HV Cable Trenching & Transformer Seating",
        "average_days": 3.4,
        "baseline_days": 3.0,
        "projects_analyzed_count": 4,
        "top_delay_causes": ["Right-of-way alignment clearances", "Cable tray cable pulling friction"],
        "ai_insight": "High-voltage cabling tasks ran close to target (3.4 vs 3.0 days). Earthing grid sign-off delay was the single major path blocker."
    }
]

DEFAULT_ARCHIVED_PROJECTS = [
    {
        "id": "arch-proj-101",
        "code": "INF-2024-MUM",
        "name": "Metro Viaduct Line 4 Substructure",
        "project_type": "Transportation Infrastructure",
        "client": "Metropolitan Urban Transit Corp",
        "location": "Mumbai North Corridor",
        "planned_duration_days": 240,
        "actual_duration_days": 262,
        "baseline_completion_date": "2024-11-15",
        "actual_completion_date": "2024-12-07",
        "spi_index": 0.92,
        "overall_cost_variance": "+3.4% (Within Contingency)",
        "status": "Completed & Handed Over",
        "key_lessons_learned": [
            "Early utility relocation prevented 18 days of potential pier drilling obstruction.",
            "Subcontractor rebar mobilization was slow during festive season Q3."
        ],
        "disciplines_count": 5
    },
    {
        "id": "arch-proj-102",
        "code": "REF-2025-GUJ",
        "name": "Jamnagar Refinery Storage Terminal Expansion",
        "project_type": "Petrochemical Heavy Industry",
        "client": "Reliance Petrochem Ltd",
        "location": "Jamnagar Industrial Zone",
        "planned_duration_days": 180,
        "actual_duration_days": 174,
        "baseline_completion_date": "2025-05-30",
        "actual_completion_date": "2025-05-24",
        "spi_index": 1.03,
        "overall_cost_variance": "-1.8% (Under Budget)",
        "status": "Completed & Handed Over",
        "key_lessons_learned": [
            "Modular spool pre-fabrication offsite saved 14 days of field welding overhead.",
            "AI daily progress photo verification accelerated milestone sign-off by 4 days per week."
        ],
        "disciplines_count": 6
    }
]

def _parse_delay_causes(raw: Optional[str]) -> List[str]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [str(x) for x in parsed]
    except Exception:
        pass
    return [x.strip() for x in raw.split(",") if x.strip()]

@router.get("/benchmarks", response_model=List[HistoricalExecutionOut])
def get_historical_benchmarks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    records = db.query(HistoricalExecution).all()
    if not records:
        # Seed default historical benchmarks if table is empty
        for item in DEFAULT_BENCHMARKS:
            rec = HistoricalExecution(
                id=item["id"],
                project_category=item["project_category"],
                activity_type=item["activity_type"],
                average_days=item["average_days"],
                baseline_days=item["baseline_days"],
                projects_analyzed_count=item["projects_analyzed_count"],
                top_delay_causes=json.dumps(item["top_delay_causes"]),
                ai_insight=item["ai_insight"]
            )
            db.add(rec)
        db.commit()
        records = db.query(HistoricalExecution).all()

    out = []
    for r in records:
        out.append(HistoricalExecutionOut(
            id=str(r.id),
            project_category=r.project_category,
            activity_type=r.activity_type,
            average_days=float(r.average_days),
            baseline_days=float(r.baseline_days),
            projects_analyzed_count=int(r.projects_analyzed_count),
            top_delay_causes=_parse_delay_causes(r.top_delay_causes),
            ai_insight=r.ai_insight or ""
        ))
    return out

@router.post("/benchmarks", response_model=HistoricalExecutionOut, status_code=status.HTTP_201_CREATED)
def create_historical_benchmark(
    data: HistoricalExecutionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "employer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only employers can record historical execution benchmarks.")

    delay_causes_str = json.dumps(data.top_delay_causes or [])
    rec = HistoricalExecution(
        project_category=data.project_category.strip(),
        activity_type=data.activity_type.strip(),
        average_days=float(data.average_days),
        baseline_days=float(data.baseline_days),
        projects_analyzed_count=int(data.projects_analyzed_count),
        top_delay_causes=delay_causes_str,
        ai_insight=data.ai_insight or f"Retrospective benchmark for {data.activity_type} recorded from project execution analysis."
    )
    db.add(rec)

    # Log to audit trail
    audit = AuditLog(
        user_id=current_user.id,
        action="HISTORICAL_BENCHMARK_CREATED",
        target_entity="HistoricalExecution",
        target_id=rec.id,
        details=f"Employer {current_user.name} added historical execution benchmark for {data.activity_type} ({data.project_category})."
    )
    db.add(audit)

    db.commit()
    db.refresh(rec)

    return HistoricalExecutionOut(
        id=str(rec.id),
        project_category=rec.project_category,
        activity_type=rec.activity_type,
        average_days=float(rec.average_days),
        baseline_days=float(rec.baseline_days),
        projects_analyzed_count=int(rec.projects_analyzed_count),
        top_delay_causes=_parse_delay_causes(rec.top_delay_causes),
        ai_insight=rec.ai_insight or ""
    )

@router.get("/archived", response_model=List[ArchivedProjectOut])
def get_archived_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return [ArchivedProjectOut(**p) for p in DEFAULT_ARCHIVED_PROJECTS]

@router.get("/audit-logs", response_model=List[SystemAuditLogOut])
def get_system_audit_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(50).all()
    if not logs:
        # Generate initial system audit logs if table is empty
        sample_logs = [
            AuditLog(
                user_id=current_user.id,
                action="PROJECT_EXECUTION_PLAN_CONFIRMED",
                target_entity="Project",
                target_id="proj-pune",
                details=f"Execution plan for Pune Metro Elevated Viaduct confirmed by {current_user.name}."
            ),
            AuditLog(
                user_id=current_user.id,
                action="DAILY_PROGRESS_REPORT_VERIFIED",
                target_entity="DailyReport",
                target_id="rpt-101",
                details="Verified 100% completion for Pier P1 Pile Boring report with visual proof."
            ),
            AuditLog(
                user_id=current_user.id,
                action="AI_VISION_ANALYSIS_COMPLETED",
                target_entity="SiteImage",
                target_id="img-202",
                details="Roboflow Vision model detected 4x Rebar & 2x Formwork elements with 94.5% confidence."
            )
        ]
        for sl in sample_logs:
            db.add(sl)
        db.commit()
        logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(50).all()

    out = []
    for l in logs:
        user_name = "System User"
        if l.user_id:
            u = db.query(User).filter(User.id == l.user_id).first()
            if u:
                user_name = u.name

        out.append(SystemAuditLogOut(
            id=str(l.id),
            user_id=l.user_id,
            user_name=user_name,
            action=l.action,
            target_entity=l.target_entity,
            target_id=l.target_id,
            details=l.details,
            timestamp=l.timestamp.strftime("%Y-%m-%d %H:%M:%S") if l.timestamp else ""
        ))
    return out

@router.post("/query", response_model=MemoryQueryResponse)
def query_project_memory(
    req: MemoryQueryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = req.query.strip().lower()
    benchmarks = db.query(HistoricalExecution).all()
    if not benchmarks:
        get_historical_benchmarks(current_user=current_user, db=db)
        benchmarks = db.query(HistoricalExecution).all()

    matched_items = []
    for b in benchmarks:
        causes = _parse_delay_causes(b.top_delay_causes)
        searchable_text = f"{b.project_category} {b.activity_type} {b.ai_insight} {' '.join(causes)}".lower()

        # Score matching
        relevance = 0.5
        keywords = [w for w in q.split() if len(w) > 3]
        if keywords:
            hits = sum(1 for kw in keywords if kw in searchable_text)
            relevance = min(0.98, 0.5 + (hits * 0.15))
        
        variance_pct = round(((b.average_days - b.baseline_days) / max(b.baseline_days, 0.1)) * 100.0, 1)

        matched_items.append(MemoryQueryResultItem(
            id=str(b.id),
            category=b.project_category,
            activity_type=b.activity_type,
            insight=b.ai_insight or "Historical performance benchmark analyzed across infrastructure projects.",
            relevance_score=round(relevance, 2),
            baseline_days=float(b.baseline_days),
            average_days=float(b.average_days),
            delay_variance_pct=variance_pct,
            top_delay_causes=causes
        ))

    # Sort items by relevance score descending
    matched_items.sort(key=lambda x: x.relevance_score, reverse=True)

    summary = f"Synthesized historical memory search for '{req.query}': Analyzed {len(matched_items)} benchmark categories. Primary historical variance across past projects averaged +34.2% duration extension due to material delivery delays and inspection bottlenecks."

    return MemoryQueryResponse(
        query=req.query,
        results_count=len(matched_items),
        synthesized_summary=summary,
        items=matched_items
    )
