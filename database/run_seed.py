import psycopg2
import uuid
from datetime import datetime, timedelta

conn = psycopg2.connect(
    host='db.hkacancuyzvltoexeunw.supabase.co',
    port=5432,
    dbname='postgres',
    user='postgres',
    password='Aditipatil@040107',
    sslmode='require'
)
cur = conn.cursor()

# Fetch actual IDs from the database
cur.execute("SELECT id, name, email, role FROM users;")
users = {row[3]: row for row in cur.fetchall()}
print("Users:", {k: v[1] for k, v in users.items()})

cur.execute("SELECT id, name, code FROM projects LIMIT 1;")
project = cur.fetchone()
project_id = project[0]
print("Project:", project[1], "| ID:", project_id)

cur.execute("SELECT id, activity_id, name, wbs_level FROM schedule_activities WHERE wbs_level = 'L6' LIMIT 10;")
l6_acts = cur.fetchall()
print("L6 Activities:", [(a[1], a[2]) for a in l6_acts])

cur.execute("SELECT id, task_name, planned_date, assigned_worker_id FROM daily_tasks ORDER BY planned_date LIMIT 15;")
tasks = cur.fetchall()
print("Tasks:", [(t[0][:8], t[1][:40], t[2]) for t in tasks])

# Pick real user IDs
employer_user = next((v for k, v in users.items() if k == 'employer'), None)
worker_user = next((v for k, v in users.items() if k == 'worker'), None)
sup_users = [v for k, v in users.items() if k == 'supervisor']

all_workers = [worker_user] + sup_users if worker_user else sup_users

# Build daily_reports seed data using real IDs
reports_to_insert = []

descriptions = [
    "Completed pile boring and drilling for Pile P1. Reached design depth of 18m. No groundwater ingress encountered. Rebar cage positioned and secured.",
    "Pile P2 boring completed to 18m depth. Concrete pour initiated at 14:00 hrs. Slump test passed at 120mm. Final concrete volume 3.2 cubic metres.",
    "Reinforcement cage installation for Pile P3 completed successfully. Cover blocks (60mm) fixed at 1.5m intervals as per drawing. QC inspection passed.",
    "Pile cap rebar binding 85% complete. Corner bar overlaps tied per BBS drawing. Pending: installation of top mesh layer before formwork.",
    "Concrete pour for pile cap completed. 12 cubic metres poured between 07:00-11:30. Vibration compaction done at 300mm intervals. Curing compound applied.",
    "Pier reinforcement cage assembled and lifted into position using crane. All splicing lengths verified per drawing SUB-01. Inspector sign-off obtained.",
    "Pier shuttering erected and aligned. Plumb checked on all 4 faces — within 5mm tolerance. Concrete pour scheduled for tomorrow 07:00.",
    "Superstructure beam casting completed for span S1-S2. 22 cubic metres of M40 concrete poured. No honeycombing observed. De-shuttering in 3 days.",
    "Bearings installed on Pier P2 and P3. Orientation and seating checked against drawing BR-DET-09. Grouting to follow after alignment confirmation.",
    "Deck slab reinforcement binding at 65% completion. Bottom mesh and spacers fixed for Zone A. Top mesh binding to commence after inspection tomorrow.",
]

issues = [
    None,
    None,
    None,
    "Top mesh layer installation pending — awaiting additional rebar delivery scheduled for tomorrow morning.",
    None,
    None,
    None,
    "Minor form misalignment noted at column head — corrected on-site before pour. No rework required.",
    "Grouting materials not on site — procurement raised. Bearing alignment confirmed and marked.",
    "Rebar delivery partial — 2 bundles short. Balance quantity expected by 2026-09-10.",
]

statuses = [
    "Verified", "Verified", "Verified", "Pending Review",
    "Verified", "Verified", "Pending Review", "Verified",
    "Pending Review", "Pending Review"
]

progress_values = [100.0, 100.0, 100.0, 85.0, 100.0, 100.0, 100.0, 100.0, 100.0, 65.0]

for i, task in enumerate(tasks[:10]):
    task_id = task[0]
    task_name = task[1]
    planned_date = task[2]
    assigned_worker_id = task[3]

    # Pick activity from L6 acts round-robin
    activity_id = l6_acts[i % len(l6_acts)][0] if l6_acts else None

    # Pick worker: use assigned worker if exists, else cycle through workers
    if assigned_worker_id:
        worker_id = assigned_worker_id
    elif all_workers:
        worker_id = all_workers[i % len(all_workers)][0]
    else:
        continue

    report_id = str(uuid.uuid4())

    reports_to_insert.append({
        'id': report_id,
        'project_id': project_id,
        'activity_id': activity_id,
        'daily_task_id': task_id,
        'worker_id': worker_id,
        'report_date': planned_date,
        'progress_percentage': progress_values[i],
        'description': descriptions[i],
        'issues': issues[i],
        'image_url': None,
        'status': statuses[i],
    })

print(f"\nInserting {len(reports_to_insert)} daily reports...")

for r in reports_to_insert:
    try:
        cur.execute("""
            INSERT INTO daily_reports
                (id, project_id, activity_id, daily_task_id, worker_id, report_date,
                 progress_percentage, description, issues, image_url, status)
            VALUES
                (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, (
            r['id'], r['project_id'], r['activity_id'], r['daily_task_id'],
            r['worker_id'], r['report_date'], r['progress_percentage'],
            r['description'], r['issues'], r['image_url'], r['status']
        ))
        print(f"  Inserted report for task: {r['daily_task_id'][:8]}... date={r['report_date']} progress={r['progress_percentage']}%")
    except Exception as e:
        print(f"  ERROR: {e}")
        conn.rollback()

conn.commit()

# Verify
cur.execute("""
    SELECT dr.id, dr.report_date, u.name, dr.progress_percentage, dr.status
    FROM daily_reports dr
    LEFT JOIN users u ON dr.worker_id = u.id
    ORDER BY dr.report_date
""")
rows = cur.fetchall()
print(f"\n=== daily_reports table now has {len(rows)} records ===")
for row in rows:
    print(f"  {row[1]} | {row[2]} | {row[3]}% | {row[4]}")

cur.close()
conn.close()
print("\nSeeding complete!")
