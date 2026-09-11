-- =========================================================
-- SiteFlow AI — Enterprise Infrastructure Database Schema & Seed
-- Supabase / PostgreSQL Direct Setup Script
-- =========================================================

-- Drop existing tables if re-initialization is required
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS historical_execution CASCADE;
DROP TABLE IF EXISTS delay_predictions CASCADE;
DROP TABLE IF EXISTS ai_matches CASCADE;
DROP TABLE IF EXISTS site_images CASCADE;
DROP TABLE IF EXISTS site_reports CASCADE;
DROP TABLE IF EXISTS daily_reports CASCADE;
DROP TABLE IF EXISTS progress_events CASCADE;
DROP TABLE IF EXISTS progress_updates CASCADE;
DROP TABLE IF EXISTS daily_tasks CASCADE;
DROP TABLE IF EXISTS activity_assignments CASCADE;
DROP TABLE IF EXISTS schedule_activities CASCADE;
DROP TABLE IF EXISTS wbs_nodes CASCADE;
DROP TABLE IF EXISTS disciplines CASCADE;
DROP TABLE IF EXISTS project_memberships CASCADE;
DROP TABLE IF EXISTS project_supervisors CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop Enums if existing
DROP TYPE IF EXISTS role_enum CASCADE;
DROP TYPE IF EXISTS status_enum CASCADE;
DROP TYPE IF EXISTS wbs_level_enum CASCADE;
DROP TYPE IF EXISTS risk_level_enum CASCADE;

-- Create Enums
CREATE TYPE role_enum AS ENUM ('employer', 'worker', 'supervisor');
CREATE TYPE status_enum AS ENUM ('On Track', 'Delayed', 'At Risk', 'Completed', 'Not Started', 'In Progress', 'Active');
CREATE TYPE wbs_level_enum AS ENUM ('L1', 'L2', 'L3', 'L4', 'L5', 'L6');
CREATE TYPE risk_level_enum AS ENUM ('Low', 'Medium', 'High', 'Critical');

-- 1. Users Table
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'worker',
    designation VARCHAR(255),
    department VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Projects Table
CREATE TABLE projects (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    project_access_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    project_type VARCHAR(100) DEFAULT 'Infrastructure',
    description TEXT,
    workflow_scope TEXT,
    location VARCHAR(255),
    client VARCHAR(255),
    start_date VARCHAR(50) NOT NULL,
    target_completion VARCHAR(50) NOT NULL,
    baseline_progress NUMERIC(5,2) DEFAULT 0.0,
    actual_progress NUMERIC(5,2) DEFAULT 0.0,
    status VARCHAR(50) DEFAULT 'Active',
    plan_status VARCHAR(50) DEFAULT 'DRAFT',
    disciplines TEXT,
    employer_id VARCHAR(36) REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Project Supervisors Table
CREATE TABLE project_supervisors (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,
    supervisor_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    supervisor_name VARCHAR(255),
    supervisor_email VARCHAR(255),
    discipline VARCHAR(100) DEFAULT 'Civil',
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by VARCHAR(36)
);

-- 4. Project Memberships Table
CREATE TABLE project_memberships (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,
    worker_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(100) DEFAULT 'Site Worker',
    discipline VARCHAR(100) DEFAULT 'General Construction',
    status VARCHAR(50) DEFAULT 'active',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Disciplines Table
CREATE TABLE disciplines (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    planned_progress NUMERIC(5,2) DEFAULT 0.0,
    actual_progress NUMERIC(5,2) DEFAULT 0.0,
    status VARCHAR(50) DEFAULT 'On Track',
    manager_name VARCHAR(255)
);

-- 6. WBS Nodes
CREATE TABLE wbs_nodes (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    wbs_level VARCHAR(10) NOT NULL,
    parent_id VARCHAR(36) REFERENCES wbs_nodes(id) ON DELETE CASCADE,
    planned_progress NUMERIC(5,2) DEFAULT 0.0,
    actual_progress NUMERIC(5,2) DEFAULT 0.0,
    status VARCHAR(50) DEFAULT 'On Track'
);

-- 7. Schedule Activities
CREATE TABLE schedule_activities (
    id VARCHAR(36) PRIMARY KEY,
    activity_id VARCHAR(50) NOT NULL,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,
    parent_l5_id VARCHAR(36) REFERENCES schedule_activities(id) ON DELETE CASCADE,
    wbs_node_id VARCHAR(36) REFERENCES wbs_nodes(id) ON DELETE CASCADE,
    discipline VARCHAR(100) DEFAULT 'Civil Works',
    name VARCHAR(255) NOT NULL,
    l5_name VARCHAR(255) DEFAULT 'Structural Works',
    l6_name VARCHAR(255) DEFAULT 'Column Reinforcement',
    wbs_level VARCHAR(10) DEFAULT 'L6',
    planned_start VARCHAR(50) NOT NULL,
    planned_finish VARCHAR(50) NOT NULL,
    actual_start VARCHAR(50),
    actual_finish VARCHAR(50),
    planned_progress NUMERIC(5,2) DEFAULT 0.0,
    actual_progress NUMERIC(5,2) DEFAULT 0.0,
    status VARCHAR(50) DEFAULT 'Not Started',
    ai_confidence NUMERIC(5,2) DEFAULT 0.0,
    delay_days INT DEFAULT 0,
    risk_level VARCHAR(50) DEFAULT 'Low',
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Daily Tasks Table
CREATE TABLE daily_tasks (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,
    l6_activity_id VARCHAR(36) REFERENCES schedule_activities(id) ON DELETE CASCADE,
    l5_name VARCHAR(255) NOT NULL,
    l6_name VARCHAR(255) NOT NULL,
    task_name VARCHAR(255) NOT NULL,
    planned_date VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'NOT_STARTED',
    progress NUMERIC(5,2) DEFAULT 0.0,
    actual_start VARCHAR(50),
    actual_end VARCHAR(50),
    assigned_worker_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    flagged_for_review BOOLEAN DEFAULT FALSE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Activity Assignments
CREATE TABLE activity_assignments (
    id VARCHAR(36) PRIMARY KEY,
    activity_id VARCHAR(36) REFERENCES schedule_activities(id) ON DELETE CASCADE,
    worker_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,
    assigned_by VARCHAR(36) REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Progress Events
CREATE TABLE progress_events (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,
    worker_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    activity_id VARCHAR(36) REFERENCES schedule_activities(id),
    daily_task_id VARCHAR(36) REFERENCES daily_tasks(id),
    source_type VARCHAR(50) NOT NULL,
    raw_input TEXT NOT NULL,
    transcript TEXT,
    extracted_progress NUMERIC(5,2),
    actual_start VARCHAR(50),
    actual_end VARCHAR(50),
    quantity NUMERIC(10,2),
    unit VARCHAR(50),
    match_confidence NUMERIC(5,2) DEFAULT 0.0,
    status VARCHAR(50) DEFAULT 'Pending Review',
    confirmed_by VARCHAR(36) REFERENCES users(id),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    extracted_metadata TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Daily Reports
CREATE TABLE daily_reports (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,
    activity_id VARCHAR(36) REFERENCES schedule_activities(id),
    daily_task_id VARCHAR(36) REFERENCES daily_tasks(id),
    worker_id VARCHAR(36) REFERENCES users(id),
    report_date VARCHAR(50) NOT NULL,
    progress_percentage NUMERIC(5,2) NOT NULL,
    description TEXT,
    issues TEXT,
    image_url TEXT,
    status VARCHAR(50) DEFAULT 'Pending Review',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Site Images
CREATE TABLE site_images (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,
    activity_id VARCHAR(36) REFERENCES schedule_activities(id),
    daily_task_id VARCHAR(36) REFERENCES daily_tasks(id),
    worker_id VARCHAR(36) REFERENCES users(id),
    image_url TEXT NOT NULL,
    description TEXT,
    ai_status VARCHAR(50) DEFAULT 'pending',
    ai_confidence NUMERIC(5,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Notifications
CREATE TABLE notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    target_route VARCHAR(255),
    unread BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Progress Updates
CREATE TABLE progress_updates (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,
    task_id VARCHAR(36) REFERENCES daily_tasks(id) ON DELETE SET NULL,
    l6_activity_id VARCHAR(36) REFERENCES schedule_activities(id) ON DELETE SET NULL,
    worker_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    supervisor_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    date VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'IN_PROGRESS',
    percent_complete NUMERIC(5,2) DEFAULT 0.0,
    actual_start_time VARCHAR(50),
    actual_end_time VARCHAR(50),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Historical Execution Memory
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

-- 16. Audit Logs
CREATE TABLE audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    target_entity VARCHAR(100),
    target_id VARCHAR(36),
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- SEED DATA
-- =========================================================

-- Seed Initial Demo Users (Default password: password123)
INSERT INTO users (id, name, email, password_hash, role, designation, department) VALUES
('user-emp-1', 'Aditi Patil', 'aditi@example.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'employer', 'Senior Project Director', 'Infrastructure Management'),
('user-sup-1', 'Rahul Sharma', 'rahul@example.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'supervisor', 'Civil Supervisor', 'Civil Construction'),
('user-sup-2', 'Neha Joshi', 'neha@example.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'supervisor', 'Electrical Supervisor', 'Electrical Engineering'),
('user-sup-3', 'Amit Patil', 'amit@example.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'supervisor', 'Piping Supervisor', 'Piping & Mechanical'),
('user-wrk-1', 'Vikram Singh', 'vikram@example.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'worker', 'Field Engineer', 'Piping & Mechanical');

-- Seed Historical Knowledge Memory
INSERT INTO historical_execution (id, project_category, activity_type, average_days, baseline_days, projects_analyzed_count, ai_insight) VALUES
('hist-1', 'Heavy Pipe Rack Erection & High-Pressure Welding', 'Heavy Spool Piping Erection', 5.2, 3.5, 6, 'Across 6 similar industrial projects, piping erection averaged 5.2 days versus baseline assumption of 3.5 days due to material delivery and crane access priority clashes.');

