import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from .database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="worker") # "employer" or "worker"
    designation = Column(String(255), nullable=True)
    department = Column(String(255), nullable=True)
    avatar_url = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    owned_projects = relationship("Project", back_populates="employer", foreign_keys="Project.employer_id")
    project_memberships = relationship("ProjectMembership", back_populates="worker", foreign_keys="ProjectMembership.worker_id")
    activity_assignments = relationship("ActivityAssignment", back_populates="worker", foreign_keys="ActivityAssignment.worker_id")
    submitted_reports = relationship("DailyReport", back_populates="worker", foreign_keys="DailyReport.worker_id")
    progress_events = relationship("ProgressEvent", back_populates="worker", foreign_keys="ProgressEvent.worker_id")
    uploaded_images = relationship("SiteImage", back_populates="worker", foreign_keys="SiteImage.worker_id")
    notifications = relationship("Notification", back_populates="user")


class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    code = Column(String(50), unique=True, nullable=False, index=True)
    project_access_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    project_type = Column(String(100), default="Infrastructure")
    description = Column(Text, nullable=True)
    workflow_scope = Column(Text, nullable=True)
    client = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    start_date = Column(String(50), nullable=False)
    target_completion = Column(String(50), nullable=False)
    baseline_progress = Column(Float, default=0.0)
    actual_progress = Column(Float, default=0.0)
    status = Column(String(50), default="Active")
    plan_status = Column(String(50), default="DRAFT") # "DRAFT", "GENERATED", "CONFIRMED"
    disciplines = Column(Text, nullable=True)
    employer_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    employer = relationship("User", back_populates="owned_projects", foreign_keys=[employer_id])
    memberships = relationship("ProjectMembership", back_populates="project", cascade="all, delete-orphan")
    supervisors = relationship("ProjectSupervisor", back_populates="project", cascade="all, delete-orphan")
    wbs_nodes = relationship("WBSNode", back_populates="project", cascade="all, delete-orphan")
    activities = relationship("ScheduleActivity", back_populates="project", cascade="all, delete-orphan")
    daily_tasks = relationship("DailyTask", back_populates="project", cascade="all, delete-orphan")
    daily_reports = relationship("DailyReport", back_populates="project", cascade="all, delete-orphan")
    progress_events = relationship("ProgressEvent", back_populates="project", cascade="all, delete-orphan")
    progress_updates = relationship("ProgressUpdate", back_populates="project", cascade="all, delete-orphan")
    site_images = relationship("SiteImage", back_populates="project", cascade="all, delete-orphan")


class ProjectSupervisor(Base):
    __tablename__ = "project_supervisors"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    supervisor_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    supervisor_name = Column(String(255), nullable=True)
    supervisor_email = Column(String(255), nullable=True)
    discipline = Column(String(100), default="Civil")
    assigned_at = Column(DateTime, default=datetime.utcnow)
    assigned_by = Column(String(36), nullable=True)

    # Relationships
    project = relationship("Project", back_populates="supervisors")
    supervisor = relationship("User", foreign_keys=[supervisor_id])


class ProjectMembership(Base):
    __tablename__ = "project_memberships"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    worker_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(100), default="Site Worker")
    discipline = Column(String(100), default="General Construction")
    status = Column(String(50), default="active")
    joined_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="memberships")
    worker = relationship("User", back_populates="project_memberships", foreign_keys=[worker_id])


class WBSNode(Base):
    __tablename__ = "wbs_nodes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    code = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    wbs_level = Column(String(10), nullable=False)
    parent_id = Column(String(36), ForeignKey("wbs_nodes.id", ondelete="CASCADE"), nullable=True)
    planned_progress = Column(Float, default=0.0)
    actual_progress = Column(Float, default=0.0)
    status = Column(String(50), default="On Track")

    project = relationship("Project", back_populates="wbs_nodes")


class ScheduleActivity(Base):
    __tablename__ = "schedule_activities"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    activity_id = Column(String(50), nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    parent_l5_id = Column(String(36), ForeignKey("schedule_activities.id", ondelete="CASCADE"), nullable=True)
    wbs_node_id = Column(String(36), ForeignKey("wbs_nodes.id", ondelete="CASCADE"), nullable=True)
    discipline = Column(String(100), default="Civil Works")
    name = Column(String(255), nullable=False)
    l5_name = Column(String(255), default="Structural Works")
    l6_name = Column(String(255), default="Column Reinforcement")
    wbs_level = Column(String(10), default="L6") # "L5" or "L6"
    planned_start = Column(String(50), nullable=False)
    planned_finish = Column(String(50), nullable=False)
    actual_start = Column(String(50), nullable=True)
    actual_finish = Column(String(50), nullable=True)
    planned_progress = Column(Float, default=0.0)
    actual_progress = Column(Float, default=0.0)
    status = Column(String(50), default="Not Started")
    ai_confidence = Column(Float, default=0.0)
    delay_days = Column(Integer, default=0)
    risk_level = Column(String(50), default="Low")
    location = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="activities")
    parent_l5 = relationship("ScheduleActivity", remote_side=[id], backref="l6_activities")
    assignments = relationship("ActivityAssignment", back_populates="activity", cascade="all, delete-orphan")
    daily_reports = relationship("DailyReport", back_populates="activity")
    progress_events = relationship("ProgressEvent", back_populates="activity")


class DailyTask(Base):
    __tablename__ = "daily_tasks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    l6_activity_id = Column(String(36), ForeignKey("schedule_activities.id", ondelete="CASCADE"), nullable=True)
    l5_name = Column(String(255), nullable=False)
    l6_name = Column(String(255), nullable=False)
    task_name = Column(String(255), nullable=False)
    planned_date = Column(String(50), nullable=False)
    status = Column(String(50), default="NOT_STARTED") # NOT_STARTED, IN_PROGRESS, COMPLETED, DELAYED, BLOCKED
    progress = Column(Float, default=0.0) # 0.0 to 100.0
    actual_start = Column(String(50), nullable=True)
    actual_end = Column(String(50), nullable=True)
    assigned_worker_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    flagged_for_review = Column(Boolean, default=False)
    review_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="daily_tasks")
    l6_activity = relationship("ScheduleActivity", backref="daily_tasks")
    assigned_worker = relationship("User", foreign_keys=[assigned_worker_id])
    daily_reports = relationship("DailyReport", back_populates="daily_task")
    progress_events = relationship("ProgressEvent", back_populates="daily_task")
    site_images = relationship("SiteImage", back_populates="daily_task")


class ActivityAssignment(Base):
    __tablename__ = "activity_assignments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    activity_id = Column(String(36), ForeignKey("schedule_activities.id", ondelete="CASCADE"), nullable=False)
    worker_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    assigned_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow)

    activity = relationship("ScheduleActivity", back_populates="assignments")
    worker = relationship("User", back_populates="activity_assignments", foreign_keys=[worker_id])


class ProgressEvent(Base):
    __tablename__ = "progress_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    worker_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    activity_id = Column(String(36), ForeignKey("schedule_activities.id"), nullable=True)
    daily_task_id = Column(String(36), ForeignKey("daily_tasks.id"), nullable=True)
    source_type = Column(String(50), nullable=False) # "TEXT", "VOICE", "REPORT", "IMAGE"
    raw_input = Column(Text, nullable=False)
    transcript = Column(Text, nullable=True)
    extracted_progress = Column(Float, nullable=True)
    actual_start = Column(String(50), nullable=True)
    actual_end = Column(String(50), nullable=True)
    quantity = Column(Float, nullable=True)
    unit = Column(String(50), nullable=True)
    match_confidence = Column(Float, default=0.0) # 0.0 to 1.0
    status = Column(String(50), default="Pending Review") # "Automatically Matched", "Pending Review", "Unmatched", "Confirmed", "Rejected"
    confirmed_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    confirmed_at = Column(DateTime, nullable=True)
    extracted_metadata = Column(Text, nullable=True) # JSON audit log details
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="progress_events")
    worker = relationship("User", back_populates="progress_events", foreign_keys=[worker_id])
    activity = relationship("ScheduleActivity", back_populates="progress_events")
    daily_task = relationship("DailyTask", back_populates="progress_events")


class DailyReport(Base):
    __tablename__ = "daily_reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    activity_id = Column(String(36), ForeignKey("schedule_activities.id"), nullable=True)
    daily_task_id = Column(String(36), ForeignKey("daily_tasks.id"), nullable=True)
    worker_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    report_date = Column(String(50), nullable=False)
    progress_percentage = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    issues = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)
    status = Column(String(50), default="Pending Review")
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="daily_reports")
    activity = relationship("ScheduleActivity", back_populates="daily_reports")
    daily_task = relationship("DailyTask", back_populates="daily_reports")
    worker = relationship("User", back_populates="submitted_reports")


class SiteImage(Base):
    __tablename__ = "site_images"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    activity_id = Column(String(36), ForeignKey("schedule_activities.id"), nullable=True)
    daily_task_id = Column(String(36), ForeignKey("daily_tasks.id"), nullable=True)
    worker_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    image_url = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    ai_status = Column(String(50), default="pending")
    ai_confidence = Column(Float, default=0.0)
    ai_progress_estimate = Column(Float, nullable=True)
    detected_elements = Column(Text, nullable=True)  # JSON string of detected construction elements
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="site_images")
    worker = relationship("User", back_populates="uploaded_images")
    daily_task = relationship("DailyTask", back_populates="site_images")
    activity = relationship("ScheduleActivity", foreign_keys=[activity_id])


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    target_route = Column(String(255), nullable=True)
    unread = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    action = Column(String(255), nullable=False)
    target_entity = Column(String(100), nullable=True)
    target_id = Column(String(36), nullable=True)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)


class ProgressUpdate(Base):
    __tablename__ = "progress_updates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    task_id = Column(String(36), ForeignKey("daily_tasks.id", ondelete="SET NULL"), nullable=True)
    l6_activity_id = Column(String(36), ForeignKey("schedule_activities.id", ondelete="SET NULL"), nullable=True)
    worker_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    supervisor_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    date = Column(String(50), nullable=False)
    status = Column(String(50), default="IN_PROGRESS") # NOT_STARTED, IN_PROGRESS, COMPLETED, BLOCKED, DELAYED
    percent_complete = Column(Float, default=0.0)
    actual_start_time = Column(String(50), nullable=True)
    actual_end_time = Column(String(50), nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="progress_updates")
    worker = relationship("User", foreign_keys=[worker_id])
    task = relationship("DailyTask")
    l6_activity = relationship("ScheduleActivity")


class HistoricalExecution(Base):
    __tablename__ = "historical_execution"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_category = Column(String(255), nullable=False)
    activity_type = Column(String(255), nullable=False)
    average_days = Column(Float, nullable=False)
    baseline_days = Column(Float, nullable=False)
    projects_analyzed_count = Column(Integer, nullable=False, default=1)
    top_delay_causes = Column(Text, nullable=True) # Stored as JSON string
    ai_insight = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

