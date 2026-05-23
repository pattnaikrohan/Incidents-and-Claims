"""
Migration script to add missing Cargo & Equipment form fields to the incidents table.
These fields were being submitted but never stored because the DB model didn't have them.
"""
import sqlite3

def migrate():
    conn = sqlite3.connect("sql_app.db")
    cursor = conn.cursor()
    
    # Get existing columns
    cursor.execute("PRAGMA table_info(incidents)")
    existing_columns = {row[1] for row in cursor.fetchall()}
    
    # New columns to add
    new_columns = {
        "role_performed": "TEXT",
        "claim_types": "TEXT",
        "incident_types": "TEXT",
        "incident_summary": "TEXT",
        "scope_of_work": "TEXT",
        "mode": "TEXT",
        "cargo_description": "TEXT",
        "cargo_value": "TEXT",
        "claim_estimate": "TEXT",
        "origin": "TEXT",
        "destination": "TEXT",
        "origin_agent": "TEXT",
        "destination_agent": "TEXT",
        "carrier": "TEXT",
        "coloader": "TEXT",
        "transport_company": "TEXT",
        "container_numbers": "TEXT",
        "mbl_mawb_number": "TEXT",
        "hbl_hawb_number": "TEXT",
        "mbl_mawb_issued": "TEXT",
        "hbl_hawb_issued": "TEXT",
        "system_job_number": "TEXT",
        "short_description": "TEXT",
        "date_of_incident": "TEXT",
        "logged_by": "TEXT",
        "business_unit": "TEXT",
        "branch_department": "TEXT",
    }
    
    added = []
    skipped = []
    
    for col_name, col_type in new_columns.items():
        if col_name not in existing_columns:
            try:
                cursor.execute(f"ALTER TABLE incidents ADD COLUMN {col_name} {col_type}")
                added.append(col_name)
            except Exception as e:
                print(f"  Error adding {col_name}: {e}")
        else:
            skipped.append(col_name)
    
    conn.commit()
    conn.close()
    
    print(f"Migration complete!")
    print(f"  Added {len(added)} columns: {', '.join(added) if added else 'none'}")
    print(f"  Skipped {len(skipped)} (already exist): {', '.join(skipped) if skipped else 'none'}")

if __name__ == "__main__":
    migrate()
