from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import time

app = FastAPI(
    title="Pench Tiger Triage ML Service",
    description="Offline CPU-friendly Computer Vision and Geospatial Intelligence Service",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Pench Tiger Triage ML Service",
        "timestamp": time.time()
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

from app.routers import ingest
app.include_router(ingest.router, prefix="/api", tags=["ingest"])
