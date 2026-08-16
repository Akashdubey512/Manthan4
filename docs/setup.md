# Development Environment Setup

Follow these steps to configure the system locally.

## Prerequisites
1. **Node.js**: Install Node.js v18+.
2. **Python**: Install Python 3.10+.
3. **PostgreSQL + PostGIS**: Ensure a local PostgreSQL server is active with the PostGIS extension enabled.

---

## Service Installation

### 1. Database Setup
Log in to your local PostgreSQL instance and execute:
```sql
CREATE DATABASE pench_db;
\c pench_db;
CREATE EXTENSION postgis;
```

### 2. Backend Setup
Navigate to the `backend/` directory:
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### 3. ML Server Setup
Navigate to the `ml_server/` directory:
```bash
cd ml_server
python -m venv venv
source venv/bin/activate  # Or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend Setup
Navigate to the `frontend/` directory:
```bash
cd frontend
npm install
npm run dev
```
The React development server will run at `http://localhost:3000`.
