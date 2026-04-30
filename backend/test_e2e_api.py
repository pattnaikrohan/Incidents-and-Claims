import requests
import json
import sqlite3
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 1. Initialize local SQLite DB with a test user directly
def seed_user():
    print("Setting up test user in backend database...")
    conn = sqlite3.connect("sql_app.db")
    cursor = conn.cursor()
    
    # Ensure tables exist
    cursor.execute('''CREATE TABLE IF NOT EXISTS branches (
                        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, business_unit TEXT)''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE,
                        name TEXT, hashed_password TEXT, role TEXT, branch_id INTEGER)''')
    
    # Insert branch if missing
    cursor.execute("SELECT id FROM branches WHERE id=1")
    if not cursor.fetchone():
        cursor.execute("INSERT INTO branches (id, name, business_unit) VALUES (1, 'HQ', 'Global')")
        
    # Insert user if missing
    cursor.execute("SELECT id FROM users WHERE email='e2e_test@example.com'")
    if not cursor.fetchone():
        hashed = pwd_context.hash("password")
        cursor.execute("INSERT INTO users (email, name, hashed_password, role, branch_id) VALUES (?, ?, ?, ?, ?)",
                       ('e2e_test@example.com', 'E2E Tester', hashed, 'compliance_officer', 1))
    
    conn.commit()
    conn.close()

BASE_URL = "http://127.0.0.1:8000/api"

def run_tests():
    seed_user()
    
    print("=========================================")
    print("Initiating 1000% Confidence E2E Pipeline Check")
    print("=========================================\n")
    
    try:
        auth_response = requests.post(
            f"http://127.0.0.1:8000/auth/login",
            data={"username": "e2e_test@example.com", "password": "password"}
        )
        if auth_response.status_code == 200:
            token = auth_response.json().get("access_token")
            print("✅ Authentication: SUCCESS (Bearer Token Acquired)")
            headers = {"Authorization": f"Bearer {token}"}
        else:
            print(f"❌ Authentication FAILED: {auth_response.text}")
            return
    except Exception as e:
        print(f"❌ Backend is unreachable: {e}")
        return

    # 2. Test SQL Server Enrichment (Job REAL-LOCAL-001)
    payload = {
        "type": "Cargo Damage",
        "location": "Sydney Terminal",
        "description": "E2E Automated Verification Test",
        "job_number": "REAL-LOCAL-001",
        "vault": "Global Vault",
        "creator_id": 1,
        "branch_id": 1
    }
    
    print("\nSimulating Frontend Payload Submission...")
    create_response = requests.post(f"{BASE_URL}/incidents/", json=payload, headers=headers)
    
    if create_response.status_code == 200:
        data = create_response.json()
        incident_id = data.get("incident_id")
        print(f"✅ Incident Creation: SUCCESS (ID: {incident_id})")
        print(f"✅ Message: {data.get('message')}")
        
        # 3. Verify Enrichment Data
        fetch_response = requests.get(f"{BASE_URL}/incidents/{incident_id}", headers=headers)
        if fetch_response.status_code == 200:
             record = fetch_response.json()
             bol = record.get("bill_of_lading")
             customer = record.get("customer_name")
             vessel = record.get("vessel_details")
             
             print("\n--- Validating SQL Server Data Enrichment ---")
             if bol == 'BOL-AAW-SQL-777':
                 print(f"✅ Bill of Lading Enriched: {bol}")
             else:
                 print(f"❌ Bill of Lading Failed: expected BOL-AAW-SQL-777, got {bol}")
                 
             if customer == 'Premium Client AU':
                 print(f"✅ Customer Enriched: {customer}")
             else:
                 print(f"❌ Customer Failed: expected Premium Client AU, got {customer}")
                 
             if vessel == 'MSC ISABELLA':     
                 print(f"✅ Vessel Enriched: {vessel}")
             else:
                 print(f"❌ Vessel Failed: got {vessel}")
        else:
             print("❌ Failed to fetch incident after creation.")
    else:
        print(f"❌ Incident Creation FAILED: {create_response.text}")
        
    print("\n=========================================")
    print("E2E Validation Complete.")
    print("=========================================")

if __name__ == "__main__":
    run_tests()
