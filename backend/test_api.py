import requests

# Test auth missing
resp = requests.post(
    "http://127.0.0.1:8001/api/incidents/", 
    json={"type": "Cargo Damage", "location": "London", "description": "Water damage", "job_number": "LON1234"}
)
print("No Auth:", resp.status_code, resp.json())

# Get dummy token
token_resp = requests.post(
    "http://127.0.0.1:8001/api/auth/login",
    data={"username": "test@mfiles.com", "password": "password"}
)
print("Login Status:", token_resp.status_code)
print("Login Body:", token_resp.text)

if token_resp.status_code == 200:
    token = token_resp.json()["access_token"]
    
    resp = requests.post(
        "http://127.0.0.1:8001/api/incidents/", 
        headers={"Authorization": f"Bearer {token}"},
        json={"type": "Cargo Damage", "location": "NYC", "description": "Test", "job_number": "LON1234"}
    )
    print("Create:", resp.status_code, resp.json())
    
    # Test Dashboard Metrics
    dash_resp = requests.get(
        "http://127.0.0.1:8001/api/dashboard/statistics",
        headers={"Authorization": f"Bearer {token}"}
    )
    print("Dashboard:", dash_resp.status_code, dash_resp.json())
