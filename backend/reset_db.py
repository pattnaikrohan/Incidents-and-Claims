import sqlite3
import os

def reset():
    db_file = "sql_app.db"
    print(f"Attempting to reset {db_file}...")
    
    if os.path.exists(db_file):
        try:
            conn = sqlite3.connect(db_file)
            cursor = conn.cursor()
            # Disable foreign keys to drop safely
            cursor.execute("PRAGMA foreign_keys = OFF")
            
            # Get all tables
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()
            
            for table in tables:
                if table[0] != 'sqlite_sequence':
                    print(f"Dropping table: {table[0]}")
                    cursor.execute(f"DROP TABLE IF EXISTS {table[0]}")
            
            conn.commit()
            conn.close()
            print("All tables dropped.")
        except Exception as e:
            print(f"Cleanup failed: {e}")
    else:
        print("Database doesn't exist.")

if __name__ == "__main__":
    reset()
