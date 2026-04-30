# AAW Group - Incident & Claims Management System

A professional enterprise solution for logging, tracking, and managing global logistics incidents. This system features Role-Based Access Control (RBAC), cascading organizational dropdowns, and a sleek, high-fidelity dashboard.

## 🚀 Project Structure

- **/frontend**: React + TypeScript + Vite + Tailwind CSS.
- **/backend**: FastAPI (Python) + SQLAlchemy + SQLite/Postgres.
- **/.github**: CI/CD workflows for Azure Static Web Apps.

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Lucide Icons, Recharts, Axios.
- **Backend**: FastAPI, JWT Authentication, Bcrypt hashing, SQLite (Dev).
- **Deployment**: Azure Static Web Apps (Frontend) + Azure App Service (Backend).

## ⚙️ Local Setup

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Initialize the database with test accounts
python init_db.py
# Start the server
uvicorn app.main:app --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## 🔒 Security & Access Matrix

The system enforces a strict visibility matrix:
- **Full Access**: Global visibility across all business units and categories.
- **Business Unit Access**: Visibility limited to all branches within a specific BU.
- **Branch Access**: Visibility limited strictly to the user's assigned branch.
- **Specialized Access**: (HR, IT, Finance, Risk) sees relevant categories across all branches.

## 📦 Deployment

The project is configured for **Azure Static Web Apps**. 
Ensure the `AZURE_STATIC_WEB_APPS_API_TOKEN` is set in your GitHub repository secrets.

---
© 2026 AAW Group. All rights reserved.
