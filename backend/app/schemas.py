from typing import Optional, List
from pydantic import BaseModel, EmailStr

# Auth Schemas
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str # "employer" or "worker"
    designation: Optional[str] = None
    department: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    designation: Optional[str] = None
    department: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

class ProjectSupervisorOut(BaseModel):
    id: str
    project_id: str
    supervisor_id: str
    supervisor_name: str
    supervisor_email: str
    discipline: str
    assigned_at: str

    class Config:
        from_attributes = True

class AssignSupervisorRequest(BaseModel):
    supervisor_id: str
    discipline: Optional[str] = "Civil"

# Project Schemas
class ProjectCreate(BaseModel):
    code: Optional[str] = None
    name: str
    project_type: Optional[str] = "Infrastructure"
    description: Optional[str] = None
    workflow_scope: Optional[str] = None
    client: Optional[str] = None
    location: Optional[str] = None
    start_date: str
    target_completion: str
    disciplines: Optional[List[str]] = []

class ProjectOut(BaseModel):
    id: str
    code: str
    project_access_code: str
    name: str
    project_type: Optional[str] = "Infrastructure"
    description: Optional[str] = None
    workflow_scope: Optional[str] = None
    client: Optional[str] = None
    location: Optional[str] = None
    start_date: str
    target_completion: str
    baseline_progress: float
    actual_progress: float
    status: str
    plan_status: str = "DRAFT"
    employer_id: str
    disciplines: Optional[List[str]] = []

    class Config:
        from_attributes = True

# DailyTask Schemas
class DailyTaskOut(BaseModel):
    id: str
    project_id: str
    l6_activity_id: Optional[str] = None
    l5_name: str
    l6_name: str
    task_name: str
    planned_date: str
    status: str # NOT_STARTED, IN_PROGRESS, COMPLETED, DELAYED, BLOCKED
    progress: float
    actual_start: Optional[str] = None
    actual_end: Optional[str] = None
    assigned_worker_id: Optional[str] = None
    assigned_worker_name: Optional[str] = None
    flagged_for_review: bool = False
    review_notes: Optional[str] = None

    class Config:
        from_attributes = True

class DailyTaskUpdate(BaseModel):
    task_name: Optional[str] = None
    planned_date: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[float] = None
    actual_start: Optional[str] = None
    actual_end: Optional[str] = None
    flagged_for_review: Optional[bool] = None
    review_notes: Optional[str] = None

class TaskPlan(BaseModel):
    id: str
    date: str
    name: str
    status: str
    progress: float
    discipline: Optional[str] = "Civil"
    flaggedForReview: bool = False
    reviewNotes: Optional[str] = None

class L6ActivityPlan(BaseModel):
    id: str
    code: str
    name: str
    discipline: str
    tasks: List[TaskPlan]

class L5ActivityPlan(BaseModel):
    id: str
    code: str
    name: str
    discipline: str
    l6Activities: List[L6ActivityPlan]

class ExecutionPlanOut(BaseModel):
    projectId: str
    status: str
    generatedAt: str
    l5Activities: List[L5ActivityPlan]
    day_wise_tasks: Optional[List[DailyTaskOut]] = []
    flagged_tasks_count: Optional[int] = 0
    summary_notes: Optional[str] = None

class PlanGenerationOut(BaseModel):
    project_id: str
    plan_status: str
    l5_packages: List[str]
    l6_activities: List[dict]
    day_wise_tasks: List[DailyTaskOut]
    flagged_tasks_count: int
    summary_notes: str

class ConfirmPlanRequest(BaseModel):
    notes: Optional[str] = None

# Access Code & Join Schemas
class JoinCodeRequest(BaseModel):
    access_code: str

class JoinProjectPreviewOut(BaseModel):
    project_id: str
    name: str
    code: str
    project_access_code: str
    client: Optional[str] = None
    location: Optional[str] = None
    status: str
    already_joined: bool

class ProjectMembershipOut(BaseModel):
    id: str
    project_id: str
    worker_id: str
    worker_name: str
    worker_email: str
    role: str
    discipline: str
    status: str
    joined_at: str

# Activity Assignment Schemas
class ActivityAssignRequest(BaseModel):
    worker_id: str

# Activity Schemas
class ActivityCreate(BaseModel):
    activity_id: str
    name: str
    wbs_level: Optional[str] = "L6" # "L5" or "L6"
    parent_l5_id: Optional[str] = None
    discipline: Optional[str] = "Civil Works"
    l5_name: Optional[str] = "Structural Works"
    l6_name: Optional[str] = "Column Reinforcement"
    planned_start: str
    planned_finish: str
    planned_progress: Optional[float] = 100.0
    actual_progress: Optional[float] = 0.0
    location: Optional[str] = None

class ActivityOut(BaseModel):
    id: str
    activity_id: str
    project_id: str
    parent_l5_id: Optional[str] = None
    name: str
    discipline: str
    l5_name: str
    l6_name: str
    wbs_level: str
    planned_start: str
    planned_finish: str
    actual_start: Optional[str] = None
    actual_finish: Optional[str] = None
    planned_progress: float
    actual_progress: float
    status: str
    ai_confidence: float
    delay_days: int
    risk_level: str
    location: Optional[str] = None
    is_assigned_to_me: Optional[bool] = False

    class Config:
        from_attributes = True

# Candidate Match Schema
class CandidateMatchOut(BaseModel):
    activity_id: str
    activity_code: str
    activity_name: str
    l5_name: str
    confidence: float
    reason: str

# ProgressEvent Schema
class TextReportCreate(BaseModel):
    project_id: str
    raw_text: str

class VoiceReportCreate(BaseModel):
    project_id: str
    audio_base64: Optional[str] = None
    transcript: Optional[str] = None

class ProgressEventOut(BaseModel):
    id: str
    project_id: str
    worker_id: str
    worker_name: str
    activity_id: Optional[str] = None
    activity_code: Optional[str] = None
    activity_name: Optional[str] = None
    l5_name: Optional[str] = None
    source_type: str
    raw_input: str
    transcript: Optional[str] = None
    extracted_progress: Optional[float] = None
    actual_start: Optional[str] = None
    actual_end: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    match_confidence: float
    status: str
    confirmed_by_name: Optional[str] = None
    confirmed_at: Optional[str] = None
    created_at: str
    candidate_matches: Optional[List[CandidateMatchOut]] = []
    reasoning_checklist: Optional[List[str]] = []
    issues: Optional[str] = None

    class Config:
        from_attributes = True

class ConfirmMatchRequest(BaseModel):
    action: str # "confirm", "create_new", "reject"
    matched_activity_id: Optional[str] = None
    new_activity_code: Optional[str] = None
    new_activity_name: Optional[str] = None
    new_activity_l5: Optional[str] = None
    new_activity_discipline: Optional[str] = "Civil Works"
    override_progress: Optional[float] = None

class AuditTrailOut(BaseModel):
    event_id: str
    raw_input: str
    source_type: str
    transcript: Optional[str] = None
    extracted_fields: dict
    candidate_matches: List[CandidateMatchOut]
    matched_activity: Optional[str] = None
    match_confidence: float
    confirmed_by: Optional[str] = None
    confirmed_at: Optional[str] = None
    status: str
    created_at: str

# Daily Progress Report Schema
class ProgressReportCreate(BaseModel):
    project_id: str
    activity_id: Optional[str] = None
    report_date: str
    progress_percentage: float
    description: Optional[str] = None
    issues: Optional[str] = None
    image_url: Optional[str] = None

class ProgressReportOut(BaseModel):
    id: str
    project_id: str
    activity_id: Optional[str] = None
    activity_name: Optional[str] = None
    activity_code: Optional[str] = None
    worker_id: str
    worker_name: str
    report_date: str
    progress_percentage: float
    description: Optional[str] = None
    issues: Optional[str] = None
    image_url: Optional[str] = None
    status: str

    class Config:
        from_attributes = True

# Notification Schema
class NotificationOut(BaseModel):
    id: str
    title: str
    message: str
    target_route: Optional[str] = None
    unread: bool
    created_at: str
    timestamp: Optional[str] = None

    class Config:
        from_attributes = True


class ProgressUpdateOut(BaseModel):
    id: str
    project_id: str
    task_id: Optional[str] = None
    task_name: Optional[str] = None
    l6_activity_id: Optional[str] = None
    l6_name: Optional[str] = None
    worker_id: str
    worker_name: str
    date: str
    status: str
    percent_complete: float
    actual_start_time: Optional[str] = None
    actual_end_time: Optional[str] = None
    remarks: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True

class WorkerProgressUpdateItem(BaseModel):
    id: str
    worker_name: str
    worker_email: str
    task_name: str
    l5_name: str
    l6_name: str
    percent_complete: float
    status: str
    remarks: Optional[str] = None
    updated_at: str

class ConsolidatedProjectProgressOut(BaseModel):
    project_id: str
    project_name: str
    overall_progress: float
    today_progress: float
    workers_reporting_count: int
    total_workers_count: int
    delayed_tasks_count: int
    blocked_tasks_count: int
    worker_updates: List[WorkerProgressUpdateItem]

# SiteImage Schemas
class SiteImageUpload(BaseModel):
    project_id: str
    activity_id: Optional[str] = None
    daily_task_id: Optional[str] = None
    image_url: str
    description: Optional[str] = None

class RoboflowAnalyzeRequest(BaseModel):
    image_path_or_url: str
    use_cache: Optional[bool] = True

# Historical Execution & Memory Schemas
class HistoricalExecutionCreate(BaseModel):
    project_category: str
    activity_type: str
    average_days: float
    baseline_days: float
    projects_analyzed_count: int = 1
    top_delay_causes: Optional[List[str]] = []
    ai_insight: Optional[str] = None

class HistoricalExecutionOut(BaseModel):
    id: str
    project_category: str
    activity_type: str
    average_days: float
    baseline_days: float
    projects_analyzed_count: int
    top_delay_causes: List[str] = []
    ai_insight: Optional[str] = None

    class Config:
        from_attributes = True

class SystemAuditLogOut(BaseModel):
    id: str
    user_id: Optional[str] = None
    user_name: Optional[str] = "System Administrator"
    action: str
    target_entity: Optional[str] = None
    target_id: Optional[str] = None
    details: Optional[str] = None
    timestamp: str

    class Config:
        from_attributes = True

class ArchivedProjectOut(BaseModel):
    id: str
    code: str
    name: str
    project_type: str
    client: str
    location: str
    planned_duration_days: int
    actual_duration_days: int
    baseline_completion_date: str
    actual_completion_date: str
    spi_index: float
    overall_cost_variance: str
    status: str
    key_lessons_learned: List[str]
    disciplines_count: int

class MemoryQueryRequest(BaseModel):
    query: str

class MemoryQueryResultItem(BaseModel):
    id: str
    category: str
    activity_type: str
    insight: str
    relevance_score: float
    baseline_days: float
    average_days: float
    delay_variance_pct: float
    top_delay_causes: List[str]

class MemoryQueryResponse(BaseModel):
    query: str
    results_count: int
    synthesized_summary: str
    items: List[MemoryQueryResultItem]


