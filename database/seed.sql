-- =========================================================
-- SiteFlow AI — Initial Database Seed Data
-- =========================================================

-- Seed Demo Users
INSERT INTO users (id, name, email, role, designation, department) VALUES
('user-emp-1', 'Vikramaditya Sharma', 'employer@demo.com', 'employer', 'Senior Project Controls Manager', 'EPC Infrastructure Division'),
('user-wrk-1', 'Rajesh Kumar', 'worker@demo.com', 'worker', 'Piping Site Supervisor', 'Field Operations - Zone B');

-- Seed Demo Project
INSERT INTO projects (id, name, code, location, client, start_date, target_completion, baseline_progress, actual_progress, status) VALUES
('proj-pune', 'Pune Industrial Expansion', 'PIE-2026-X', 'Chakan Industrial Zone, Pune, India', 'Bharat Heavy Infrastructure Ltd', '2026-01-15', '2026-12-20', 72.0, 68.0, 'Delayed');

-- Seed Disciplines
INSERT INTO disciplines (id, project_id, name, code, planned_progress, actual_progress, status, manager_name) VALUES
('disc-civil', 'proj-pune', 'Civil & Foundation', 'CIV', 78.0, 74.0, 'On Track', 'Sanjay Patel'),
('disc-piping', 'proj-pune', 'Piping & Fabrication', 'PIP', 64.0, 52.0, 'Delayed', 'Rajesh Kumar'),
('disc-elec', 'proj-pune', 'Electrical & Power', 'ELE', 70.0, 67.0, 'At Risk', 'Ananya Roy');

-- Seed Historical Project Memory
INSERT INTO historical_execution (id, project_category, activity_type, average_days, baseline_days, projects_analyzed_count, ai_insight) VALUES
('hist-1', 'Heavy Pipe Rack Erection & High-Pressure Welding', 'Heavy Spool Piping Erection', 5.2, 3.5, 6, 'Across 6 similar industrial projects, piping erection averaged 5.2 days versus baseline assumption of 3.5 days due to material delivery and crane access priority clashes.');
