import sqlite3
def check_data():
    conn = sqlite3.connect('sql_app.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id, status FROM incidents')
    rows = cursor.fetchall()
    print(f"Total incidents: {len(rows)}")
    for row in rows:
        print(f"ID: {row[0]}, Status: {row[1]}")
    conn.close()

if __name__ == "__main__":
    check_data()
