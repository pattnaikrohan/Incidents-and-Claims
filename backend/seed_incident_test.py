import sqlite3
from datetime import datetime

def seed_incident():
    print("Seeding test incident into sql_app.db...")
    conn = sqlite3.connect("sql_app.db")
    cursor = conn.cursor()
    
    # Insert a test incident
    cursor.execute("""
        INSERT INTO incidents (
            type, location, description, status, creator_id, branch_id, 
            vault, incident_number_str, date
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
    """, (
        'Cargo Damage', 'Rotterdam Port', 'Test incident for collaboration and chat workflow.', 
        'Open', 1, 1, 'Global Vault', 'INC-TEST-999', datetime.utcnow().isoformat()
    ))
    
    incident_id = cursor.lastrowid
    
    # Add an initial system note
    cursor.execute("""
        INSERT INTO incident_notes (
            incident_id, message, timestamp, note_type
        ) VALUES (?, ?, ?, ?)
    """, (
        incident_id, "Incident created by System.", datetime.utcnow().isoformat(), 'system'
    ))
    
    conn.commit()
    conn.close()
    print(f"Test Incident created with ID: {incident_id}")

if __name__ == "__main__":
    seed_incident()
