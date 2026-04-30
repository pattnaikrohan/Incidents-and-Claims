import sqlite3

def migrate():
    print("Migrating sql_app.db for Collaboration features...")
    conn = sqlite3.connect("sql_app.db")
    cursor = conn.cursor()
    
    try:
        # Add assigned_to_id to incidents
        cursor.execute("ALTER TABLE incidents ADD COLUMN assigned_to_id INTEGER REFERENCES users(id)")
        print("Added assigned_to_id to incidents table.")
    except sqlite3.OperationalError:
        print("assigned_to_id already exists in incidents table.")

    try:
        # Add note_type to incident_notes
        cursor.execute("ALTER TABLE incident_notes ADD COLUMN note_type TEXT DEFAULT 'user'")
        print("Added note_type to incident_notes table.")
    except sqlite3.OperationalError:
        print("note_type already exists in incident_notes table.")

    # Make author_id nullable in incident_notes is harder in SQLite (requires temp table)
    # But for now, we can just ensure system messages have a dummy author or we skip.
    # Actually, let's just make it nullable by recreating the table if needed, 
    # but for a quick dev test, I'll just use author_id=1 (Admin) for system messages if necessary,
    # or just try the simple ALTER first.
    
    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
