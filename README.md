# Automated Camera Trap Triage & Tiger Movement Intelligence System
## Pench Tiger Reserve Hackathon

This system provides an offline-first, CPU-optimized solution to ingest, filter, identify, and analyze camera trap data to track tiger movement, calculate occupancy, and flag movement deviations (e.g., proximity to villages, centroid shifts) in real time.

---

## 1. System Architecture

The project splits into a React Frontend, Node/Express Backend Orchestrator, PostgreSQL (+ PostGIS) Database, and a Python FastAPI ML Service.

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   React     │ ───▶ │  Express (Node)   │ ───▶ │   PostgreSQL     │
│  Frontend   │ ◀─── │   REST API        │ ◀─── │  (+ PostGIS)     │
└─────────────┘      └────────┬──────────┘      └─────────────────┘
                               │
                               │ HTTP / JSON REST
                               ▼
                      ┌──────────────────┐
                      │  Python ML Service│
                      │  (FastAPI)       │
                      │  - Blank Filter  │
                      │  - ID Matching   │
                      │  - Occupancy KDE │
                      │  - Alert Rules   │
                      └──────────────────┘
```

---

## 2. Directory Layout

```
pench-tiger-system/
├── frontend/                          # React + Vite Client
├── backend/                           # Node.js + Express Orchestrator
├── ml_server/                         # Python FastAPI AI/ML Pipeline
├── docs/                              # Explanatory documentation
├── sample_data/                       # Seed image samples
└── docker-compose.yml                 # Orchestrated runner
```

---

## 3. Tech Stack

- **Frontend**: React 18, React Router, Leaflet Maps, Tailwind CSS (or Custom CSS variables), Axios
- **Backend**: Node.js, Express, Sequelize ORM, PostgreSQL + PostGIS extension
- **ML Service**: Python 3.10+, FastAPI, OpenCV, Pillow, NumPy, SciPy (for KDE/MCP home range calculations), Shapely, SQLite/PostgreSQL connectors

---

## 4. Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (if running bare-metal)
- Python 3.10+ (if running bare-metal)
- PostgreSQL with PostGIS extension installed

### Run via Docker Compose
```bash
docker-compose up --build
```
This spawns:
- Postgres at port `5432`
- Express API at port `5000`
- Python FastAPI at port `8000`
- Vite React client at port `3000`
