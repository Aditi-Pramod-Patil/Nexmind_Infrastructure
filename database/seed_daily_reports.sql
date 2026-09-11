-- =========================================================
-- SiteFlow AI — Daily Reports Seed Data
-- Run this in Supabase SQL Editor to populate daily_reports
-- =========================================================
-- NOTE: This script uses the users and projects seeded by supabase_setup.sql
-- Existing user IDs: user-emp-1, user-sup-1, user-sup-2, user-sup-3, user-wrk-1
-- =========================================================

-- Step 1: Ensure a project exists (insert only if not already present)
INSERT INTO projects (id, code, project_access_code, name, project_type, description, location, client, start_date, target_completion, baseline_progress, actual_progress, status, plan_status, disciplines, employer_id)
VALUES (
  'proj-pune-001',
  'PIE-2026-01',
  'ACCESS-2026-01',
  'Pune Industrial Expansion Phase 1',
  'Infrastructure',
  'Heavy pipe rack erection, pier construction and electrical work for Pune industrial zone expansion.',
  'Chakan Industrial Zone, Pune, India',
  'Bharat Heavy Infrastructure Ltd',
  '2026-01-15',
  '2026-12-20',
  72.0,
  68.0,
  'Active',
  'CONFIRMED',
  'Civil Works,Piping Works,Electrical',
  'user-emp-1'
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Ensure schedule activities exist (L5 + L6)
INSERT INTO schedule_activities (id, activity_id, project_id, discipline, name, l5_name, l6_name, wbs_level, planned_start, planned_finish, actual_start, actual_finish, planned_progress, actual_progress, status, ai_confidence, location)
VALUES
  ('act-l5-civ-01', 'L5-CIV-01', 'proj-pune-001', 'Civil Works', 'Pier Construction', 'Pier Construction', 'Pier Construction Package', 'L5', '2026-02-01', '2026-09-30', '2026-02-03', NULL, 100.0, 65.0, 'In Progress', 0.0, 'Pier P3 Zone'),
  ('act-l6-civ-01', 'CIV-034',   'proj-pune-001', 'Civil Works', 'Pier Reinforcement Installation', 'Pier Construction', 'Pier Reinforcement Installation', 'L6', '2026-03-01', '2026-04-15', '2026-03-02', NULL, 100.0, 70.0, 'In Progress', 94.0, 'Pier P3 Zone'),
  ('act-l6-civ-02', 'CIV-035',   'proj-pune-001', 'Civil Works', 'Pier Formwork Installation', 'Pier Construction', 'Pier Formwork Installation', 'L6', '2026-04-16', '2026-05-15', '2026-04-17', NULL, 100.0, 40.0, 'In Progress', 88.0, 'Pier P3 Zone'),
  ('act-l5-pip-01', 'L5-PIP-01', 'proj-pune-001', 'Piping Works', 'Pipe Rack Spool Erection', 'Pipe Rack Spool Erection', 'Pipe Rack Spool Erection Package', 'L5', '2026-03-10', '2026-10-15', '2026-03-12', NULL, 100.0, 50.0, 'In Progress', 0.0, 'Rack Line 24'),
  ('act-l6-pip-01', 'PIP-001',   'proj-pune-001', 'Piping Works', 'Erect Line 24-XX Spool', 'Pipe Rack Spool Erection', 'Erect Line 24-XX Spool', 'L6', '2026-04-01', '2026-05-30', '2026-04-02', NULL, 100.0, 50.0, 'In Progress', 91.0, 'Rack Line 24')
ON CONFLICT (id) DO NOTHING;

-- Step 3: Ensure daily tasks exist (linked to L6 activities)
INSERT INTO daily_tasks (id, project_id, l6_activity_id, l5_name, l6_name, task_name, planned_date, status, progress, actual_start, actual_end, assigned_worker_id, flagged_for_review)
VALUES
  ('task-001', 'proj-pune-001', 'act-l6-civ-01', 'Pier Construction', 'Pier Reinforcement Installation', 'Install rebar cage for Pier P3 Column A', '2026-09-01', 'COMPLETED', 100.0, '08:00', '17:30', 'user-wrk-1', FALSE),
  ('task-002', 'proj-pune-001', 'act-l6-civ-01', 'Pier Construction', 'Pier Reinforcement Installation', 'Tie stirrups and check cover blocks for Pier P3', '2026-09-02', 'COMPLETED', 100.0, '08:30', '16:00', 'user-wrk-1', FALSE),
  ('task-003', 'proj-pune-001', 'act-l6-civ-02', 'Pier Construction', 'Pier Formwork Installation', 'Erect outer shuttering panels for Pier P3 Column B', '2026-09-03', 'COMPLETED', 100.0, '09:00', '18:00', 'user-sup-1', FALSE),
  ('task-004', 'proj-pune-001', 'act-l6-civ-02', 'Pier Construction', 'Pier Formwork Installation', 'Align and brace formwork for concrete pour', '2026-09-04', 'IN_PROGRESS', 60.0, '08:00', NULL, 'user-sup-1', TRUE),
  ('task-005', 'proj-pune-001', 'act-l6-pip-01', 'Pipe Rack Spool Erection', 'Erect Line 24-XX Spool', 'Lift and position spool segment S-01 to S-04', '2026-09-05', 'COMPLETED', 100.0, '07:30', '16:30', 'user-wrk-1', FALSE),
  ('task-006', 'proj-pune-001', 'act-l6-pip-01', 'Pipe Rack Spool Erection', 'Erect Line 24-XX Spool', 'Weld spool joints S-05 and S-06 at Rack Elevation +6.5m', '2026-09-06', 'IN_PROGRESS', 50.0, '08:00', NULL, 'user-sup-3', FALSE),
  ('task-007', 'proj-pune-001', 'act-l6-civ-01', 'Pier Construction', 'Pier Reinforcement Installation', 'Inspect and sign off rebar for Pier P4 Column A', '2026-09-08', 'NOT_STARTED', 0.0, NULL, NULL, 'user-sup-1', FALSE),
  ('task-008', 'proj-pune-001', 'act-l6-pip-01', 'Pipe Rack Spool Erection', 'Erect Line 24-XX Spool', 'Hydraulic pressure test for Line 24 completed joints', '2026-09-09', 'NOT_STARTED', 0.0, NULL, NULL, 'user-sup-3', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Step 4: Seed daily_reports records
INSERT INTO daily_reports (id, project_id, activity_id, daily_task_id, worker_id, report_date, progress_percentage, description, issues, image_url, status)
VALUES
  (
    'rpt-001',
    'proj-pune-001',
    'act-l6-civ-01',
    'task-001',
    'user-wrk-1',
    '2026-09-01',
    100.0,
    'Completed installation of rebar cage for Pier P3 Column A. All stirrups tied and cover blocks placed as per drawing CIV-034-Rev2. Inspection passed by site engineer.',
    NULL,
    NULL,
    'Verified'
  ),
  (
    'rpt-002',
    'proj-pune-001',
    'act-l6-civ-01',
    'task-002',
    'user-wrk-1',
    '2026-09-02',
    100.0,
    'Tied remaining stirrups for Pier P3 Column A and B reinforcement zones. Cover blocks checked to be 50mm clear as per spec. No deviations observed.',
    NULL,
    NULL,
    'Verified'
  ),
  (
    'rpt-003',
    'proj-pune-001',
    'act-l6-civ-02',
    'task-003',
    'user-sup-1',
    '2026-09-03',
    100.0,
    'Erected all outer shuttering panels for Pier P3 Column B. Panels aligned to within 3mm tolerance. Internal bracing installed and checked by Rahul Sharma (Civil Supervisor).',
    NULL,
    NULL,
    'Verified'
  ),
  (
    'rpt-004',
    'proj-pune-001',
    'act-l6-civ-02',
    'task-004',
    'user-sup-1',
    '2026-09-04',
    60.0,
    'Alignment and bracing of formwork is 60% complete. Inner panels still require 2 additional bracing struts. Concrete pour has been rescheduled to tomorrow pending full bracing completion.',
    'Inner panel bracing incomplete — 2 struts pending delivery from store. Concrete pour delayed by 1 day.',
    NULL,
    'Pending Review'
  ),
  (
    'rpt-005',
    'proj-pune-001',
    'act-l6-pip-01',
    'task-005',
    'user-wrk-1',
    '2026-09-05',
    100.0,
    'Lifted and positioned pipe spool segments S-01 through S-04 on Rack Line 24 at elevation +6.5m. All joints pre-fitted and tack welded. No crane incidents. Rigging checklist completed.',
    NULL,
    NULL,
    'Verified'
  ),
  (
    'rpt-006',
    'proj-pune-001',
    'act-l6-pip-01',
    'task-006',
    'user-sup-3',
    '2026-09-06',
    50.0,
    'Root welding for spool joints S-05 completed. Weld joint S-06 is 50% through root pass. Welder qualification IQW-22 confirmed. NDT inspection scheduled for tomorrow.',
    'Welder for joint S-06 reported fatigue at 50% completion. Additional welder Suresh (IQW-18) deployed for remaining passes.',
    NULL,
    'Pending Review'
  ),
  (
    'rpt-007',
    'proj-pune-001',
    'act-l6-civ-01',
    'task-001',
    'user-sup-2',
    '2026-09-07',
    70.0,
    'Electrical cable tray support brackets installed at +3.5m elevation on Pier P3 face. 70% of brackets fixed; remaining 30% pending galvanising touch-up from contractor.',
    'Galvanising contractor delayed — 30% bracket installation pushed to 2026-09-09.',
    NULL,
    'Pending Review'
  ),
  (
    'rpt-008',
    'proj-pune-001',
    'act-l6-civ-01',
    'task-002',
    'user-wrk-1',
    '2026-09-08',
    35.0,
    'Commenced rebar inspection for Pier P4 Column A. 35% of rebar joints visually inspected and cleared. Remaining 65% to be completed tomorrow morning before concrete pour scheduled at 14:00.',
    NULL,
    NULL,
    'Pending Review'
  ),
  (
    'rpt-009',
    'proj-pune-001',
    'act-l6-pip-01',
    'task-005',
    'user-sup-3',
    '2026-09-09',
    80.0,
    'NDT inspection for joints S-05 and S-06 passed TOFD scan. Remaining spool segment S-07 positioned and tack welded. Overall Line 24 spool erection now at 80% completion.',
    NULL,
    NULL,
    'Verified'
  )
ON CONFLICT (id) DO NOTHING;

-- Verify insertion
SELECT
  dr.id,
  dr.report_date,
  u.name AS worker_name,
  p.name AS project_name,
  sa.name AS activity_name,
  dt.task_name,
  dr.progress_percentage,
  dr.status,
  LEFT(dr.description, 80) AS description_preview
FROM daily_reports dr
LEFT JOIN users u ON dr.worker_id = u.id
LEFT JOIN projects p ON dr.project_id = p.id
LEFT JOIN schedule_activities sa ON dr.activity_id = sa.id
LEFT JOIN daily_tasks dt ON dr.daily_task_id = dt.id
ORDER BY dr.report_date DESC;
