import requests

def test_list_and_details():
    # 1. Login to get token
    login_url = "http://localhost:8000/api/auth/login"
    login_data = {
        "username": "full.access@aaw.com",
        "password": "Access2026!"
    }
    
    print("Logging in...")
    try:
        r_login = requests.post(login_url, data=login_data)
        if r_login.status_code != 200:
            print("Login Failed:", r_login.text)
            return
        
        token = r_login.json()["access_token"]
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # 2. Get Incidents List
        list_url = "http://localhost:8000/api/incidents/"
        print("Sending GET to", list_url)
        r_list = requests.get(list_url, headers=headers)
        print("List Status:", r_list.status_code)
        if r_list.status_code != 200:
            print("List Response:", r_list.text)
        else:
            print("List count:", len(r_list.json()))
        
        # 3. Get Incident Details
        detail_url = "http://localhost:8000/api/incidents/HR-1193688504773"
        print("Sending GET to", detail_url)
        r_detail = requests.get(detail_url, headers=headers)
        print("Detail Status:", r_detail.status_code)
        if r_detail.status_code != 200:
            print("Detail Response:", r_detail.text)
            
    except Exception as e:
        print("Request failed with exception:", e)

if __name__ == "__main__":
    test_list_and_details()
