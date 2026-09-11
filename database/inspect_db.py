import psycopg2

conn = psycopg2.connect(
    host='db.hkacancuyzvltoexeunw.supabase.co',
    port=5432,
    dbname='postgres',
    user='postgres',
    password='Aditipatil@040107',
    sslmode='require'
)
cur = conn.cursor()

# Check existing data
print("=== USERS ===")
cur.execute("SELECT id, name, email, role FROM users LIMIT 10;")
for row in cur.fetchall():
    print(row)

print("\n=== PROJECTS ===")
cur.execute("SELECT id, name, code FROM projects LIMIT 10;")
for row in cur.fetchall():
    print(row)

print("\n=== SCHEDULE ACTIVITIES (first 5) ===")
cur.execute("SELECT id, activity_id, name, wbs_level FROM schedule_activities LIMIT 5;")
for row in cur.fetchall():
    print(row)

print("\n=== DAILY TASKS (first 5) ===")
cur.execute("SELECT id, task_name, planned_date FROM daily_tasks LIMIT 5;")
for row in cur.fetchall():
    print(row)

print("\n=== DAILY REPORTS COUNT ===")
cur.execute("SELECT COUNT(*) FROM daily_reports;")
print(cur.fetchone())

cur.close()
conn.close()
