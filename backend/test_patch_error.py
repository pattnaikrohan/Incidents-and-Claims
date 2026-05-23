import requests
import json

def test_patch():
    # 1. Login as HR user on port 8001
    login_url = "http://localhost:8001/api/auth/login"
    login_data = {
        "username": "people.safety@aaw.com",
        "password": "Access2026!"
    }
    
    print("Logging in to 8001...")
    r_login = requests.post(login_url, data=login_data)
    if r_login.status_code != 200:
        print("Login Failed:", r_login.text)
        return
    
    token = r_login.json()["access_token"]
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "id": "HR-1193688504773",
        "type": "Human Resources Incident",
        "location": "Melbourne",
        "description": "HR Test incident description",
        "job_number": "",
        "status": "Open - Incident Logged",
        "creator_id": 1,
        "branch_id": 4,
        "date": "2026-05-15",
        "customer_name": None,
        "notes": "Tero vester error currus.",
        "category": "hr",
        "incident_number_str": "HR-1193688504773",
        "branch_department": "People & Safety",
        "business_unit": "AAW Group Holdings",
        "employee_involved": "Absconditus vomer",
        "formal_claim_issued": "No",
        "cor_required": "No",
        "management_escalation": "No",
        "responsible_party": "",
        "risk_level": "",
        "created_at": "2026-05-15T17:54:05Z",
        "date_of_incident": "2026-05-15",
        "date_logged": "2026-05-15",
        "logged_by": "full_access",
        "employee_name": "Absconditus vomer",
        "incident_type": "Human Resources Incident",
        "witnesses": "Uberrime tubineus",
        "immediate_action": "Ars commodi",
        "investigation_required": "Yes",
        "investigation_outcome": "Investigation completed successfully.",
        "corrective_action": "No action needed.",
        "legal_counsel_engaged": "No",
        "close_out_date": "2025-07-21",
        "incident_summary": "Degusto contra aggredior odit.",
        "root_cause": "",
        "dept_section_updated": True
    }
    
    patch_url = "http://localhost:8001/api/incidents/HR-1193688504773"
    print(f"Sending PATCH to {patch_url}...")
    r_patch = requests.patch(patch_url, headers=headers, json=payload)
    print("PATCH Status:", r_patch.status_code)
    print("PATCH Response:", r_patch.text)

if __name__ == "__main__":
    test_patch()
