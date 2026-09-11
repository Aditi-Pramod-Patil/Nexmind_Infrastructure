-- =========================================================
-- SiteFlow AI — Enterprise Infrastructure Database Schema
-- PostgreSQL DDL Version 1.0
-- =========================================================

CREATE TYPE role_enum AS ENUM ('employer', 'worker');
CREATE TYPE status_enum AS ENUM ('On Track', 'Delayed', 'At Risk', 'Completed', 'Not Started');
CREATE TYPE wbs_level_enum AS ENUM ('L1', 'L2', 'L3', 'L4', 'L5', 'L6');
CREATE TYPE risk_level_enum AS ENUM ('Low', 'Medium', 'High', 'Critical');

-- 1. Users Table
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role role_enum NOT NULL DEFAULT 'worker',
    designation VARCHAR(255),
    department VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Projects Table
CREATE TABLE projects (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    location VARCHAR(255),
    client VARCHAR(255),
    start_date DATE NOT NULL,
    target_completion DATE NOT NULL,
    baseline_progress NUMERIC(5,2) DEFAULT 0.0,
    actual_progress NUMERIC(5,2) DEFAULT 0.0,
    status status_enum DEFAULT 'On Track',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Disciplines Table
CREATE TABLE disciplines (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    planned_progress NUMERIC(5,2) DEFAULT 0.0,
    actual_progress NUMERIC(5,2) DEFAULT 0.0,
    status status_enum DEFAULT 'On Track',
    manager_name VARCHAR(255)
);

-- 4. WBS Nodes (Hierarchical Tree L1-L6)
CREATE TABLE wbs_nodes (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    wbs_level wbs_level_enum NOT NULL,
    parent_id VARCHAR(36) REFERENCES wbs_nodes(id) ON DELETE CASCADE,
    planned_progress NUMERIC(5,2) DEFAULT 0.0,
    actual_progress NUMERIC(5,2) DEFAULT 0.0,
    status status_enum DEFAULT 'On Track'
);

-- 5. Schedule Activities (Primavera L6 Line Items)
CREATE TABLE schedule_activities (
    id VARCHAR(36) PRIMARY KEY,
    activity_id VARCHAR(50) NOT NULL,
    wbs_node_id VARCHAR(36) REFERENCES wbs_nodes(id) ON DELETE CASCADE,
    discipline_id VARCHAR(36) REFERENCES disciplines(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    wbs_level wbs_level_enum DEFAULT 'L6',
    planned_start DATE NOT NULL,
    planned_finish DATE NOT NULL,
    actual_start DATE,
    actual_finish DATE,
    planned_progress NUMERIC(5,2) DEFAULT 0.0,
    actual_progress NUMERIC(5,2) DEFAULT 0.0,
    status status_enum DEFAULT 'Not Started',
    ai_confidence NUMERIC(5,2) DEFAULT 0.0,
    delay_days INT DEFAULT 0,
    risk_level risk_level_enum DEFAULT 'Low',
    location VARCHAR(255)
);

-- 6. Activity Progress Events & Logs
CREATE TABLE activity_events (
    id VARCHAR(36) PRIMARY KEY,
    activity_id VARCHAR(36) REFERENCES schedule_activities(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    reported_by VARCHAR(36) REFERENCES users(id),
    source VARCHAR(50) NOT NULL,
    confidence NUMERIC(5,2) NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Site Reports
CREATE TABLE site_reports (
    id VARCHAR(36) PRIMARY KEY,
    reporter_id VARCHAR(36) REFERENCES users(id),
    report_date DATE NOT NULL,
    discipline_id VARCHAR(36) REFERENCES disciplines(id),
    raw_text TEXT NOT NULL,
    matched_activity_id VARCHAR(36) REFERENCES schedule_activities(id),
    ai_confidence NUMERIC(5,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending Review'
);

-- 8. Site Images & Visual AI Analysis
CREATE TABLE site_images (
    id VARCHAR(36) PRIMARY KEY,
    uploader_id VARCHAR(36) REFERENCES users(id),
    activity_id VARCHAR(36) REFERENCES schedule_activities(id),
    image_url TEXT NOT NULL,
    previous_progress NUMERIC(5,2),
    current_progress NUMERIC(5,2),
    ai_confidence NUMERIC(5,2),
    detected_elements JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. AI Activity Matches
CREATE TABLE ai_matches (
    id VARCHAR(36) PRIMARY KEY,
    raw_input TEXT NOT NULL,
    discipline VARCHAR(50),
    suggested_activity_id VARCHAR(36) REFERENCES schedule_activities(id),
    confidence NUMERIC(5,2) NOT NULL,
    reasoning_checklist JSONB,
    match_status VARCHAR(50) NOT NULL,
    planner_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Risk Predictions
CREATE TABLE delay_predictions (
    id VARCHAR(36) PRIMARY KEY,
    activity_id VARCHAR(36) REFERENCES schedule_activities(id) ON DELETE CASCADE,
    delay_days INT NOT NULL,
    delay_probability NUMERIC(5,2) NOT NULL,
    risk_level risk_level_enum NOT NULL,
    root_causes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Historical Project Memory
CREATE TABLE historical_execution (
    id VARCHAR(36) PRIMARY KEY,
    project_category VARCHAR(255) NOT NULL,
    activity_type VARCHAR(255) NOT NULL,
    average_days NUMERIC(5,2) NOT NULL,
    baseline_days NUMERIC(5,2) NOT NULL,
    projects_analyzed_count INT NOT NULL,
    top_delay_causes JSONB,
    ai_insight TEXT
);

-- 12. Audit Logs
CREATE TABLE audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    target_entity VARCHAR(100),
    target_id VARCHAR(36),
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
