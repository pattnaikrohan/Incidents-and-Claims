import sqlite3
def check_schema():
    conn = sqlite3.connect('sql_app.db')
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(incidents)")
    cols = [c[1] for c in cursor.fetchall()]
    print(f"Columns in incidents: {cols}")
    conn.close()

if __name__ == "__main__":
    check_schema()
