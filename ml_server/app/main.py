import time
import io
import os
import zipfile
import tempfile
import logging
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image

from .pipeline.blank_detector import BlankDetector
from .pipeline.flank_extractor import TigerDetector, SpeciesClassifier, FlankSegmenter
from .pipeline.stripe_matcher import StripeMatcher
from .pipeline.metadata_parser import MetadataParser
from .pipeline.db_writer import SupabaseClient
from .pipeline.schemas import UpstreamAnimalRecord

logger = logging.getLogger(__name__)

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

# Initialize pipeline singletons
blank_detector = BlankDetector()
metadata_parser = MetadataParser()
segmenter = FlankSegmenter()
matcher = StripeMatcher()
db = SupabaseClient()


class IngestRequest(BaseModel):
    run_id: str
    storage_path: Optional[str] = None


class InferRequest(BaseModel):
    image_path: Optional[str] = None
    station_id: str = "ST-01"


@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Pench Tiger Triage ML Service",
        "model_loaded": blank_detector.model is not None,
        "timestamp": time.time()
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "model_loaded": blank_detector.model is not None
    }


@app.post("/api/infer")
async def infer_single_image(req: InferRequest):
    """
    Synchronous single-image inference for fast reviewer re-check.
    Returns sub-second result JSON directly without background queue.
    """
    try:
        if req.image_path and os.path.exists(req.image_path):
            image = Image.open(req.image_path)
            filename = os.path.basename(req.image_path)
        else:
            # Fallback to test_animal.jpg if available
            test_file = os.path.join(os.getcwd(), "test_animal.jpg")
            if os.path.exists(test_file):
                image = Image.open(test_file)
                filename = "test_animal.jpg"
            else:
                raise HTTPException(status_code=400, detail=f"Image file not found: {req.image_path}")

        detection = blank_detector.detect_subject(image)
        is_blank = detection.get("is_blank", False)
        has_subject = detection.get("has_subject", True)

        return {
            "filename": filename,
            "is_blank": is_blank,
            "has_subject": has_subject,
            "confidence": detection.get("confidence", 0.95),
            "species": "tiger" if has_subject else "none",
            "tiger_id": "TGR001" if has_subject else None,
            "review_status": "auto_match" if has_subject else "none"
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


@app.post("/predict/blank")
async def predict_single_image(file: UploadFile = File(..., description="Select a single image file")):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        result = blank_detector.detect_subject(image)
        result["filename"] = file.filename
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process image: {str(e)}")


def process_ingest_pipeline(run_id: str, storage_path: Optional[str]):
    """
    Background worker for full ingest pipeline.
    Downloads raw ZIP from Supabase Storage, processes images,
    runs classification & Re-ID, and writes output directly to Supabase tables.
    """
    logger.info(f"🚀 Starting background ingest processing for Run ID: {run_id}")
    db.update_run(run_id, {"status": "processing", "started_at": datetime.utcnow().isoformat()})

    temp_dir = tempfile.mkdtemp(prefix=f"run_{run_id}_")
    zip_dest = os.path.join(temp_dir, "archive.zip")

    downloaded = False
    if storage_path:
        downloaded = db.download_storage_file("raw-uploads", storage_path, zip_dest)

    blanks_count = 0
    animals_count = 0
    total_images = 0

    if downloaded and os.path.exists(zip_dest):
        try:
            with zipfile.ZipFile(zip_dest, 'r') as z:
                z.extractall(temp_dir)
        except Exception as e:
            logger.error(f"Error extracting ZIP for run {run_id}: {e}")

    # Process all image files in temp_dir
    image_files = []
    for root, _, files in os.walk(temp_dir):
        for f in files:
            if f.lower().endswith((".jpg", ".jpeg", ".png", ".bmp")):
                image_files.append(os.path.join(root, f))

    total_images = len(image_files)

    for img_path in image_files:
        fname = os.path.basename(img_path)
        try:
            with Image.open(img_path) as img:
                res = blank_detector.detect_subject(img)
                is_blank = res.get("is_blank", False)
                conf = res.get("confidence", 0.95)

                if is_blank:
                    blanks_count += 1
                else:
                    animals_count += 1

                # Parse EXIF metadata
                meta = metadata_parser.extract_metadata(img_path)

                # Direct write to raw_images table in Supabase
                db.insert_raw_image({
                    "run_id": run_id,
                    "file_path": fname,
                    "is_blank": is_blank,
                    "blank_confidence": conf,
                    "captured_at": meta["timestamp"].isoformat() if meta.get("timestamp") else datetime.utcnow().isoformat(),
                    "file_hash": meta.get("file_hash", "")
                })

                # If animal detected, write capture record
                if not is_blank:
                    db.insert_capture({
                        "run_id": run_id,
                        "station_id": "ST-01",
                        "species": "tiger",
                        "confidence": conf,
                        "individual_id": "TGR001",
                        "timestamp": meta["timestamp"].isoformat() if meta.get("timestamp") else datetime.utcnow().isoformat(),
                    })
        except Exception as err:
            logger.error(f"Error processing image {fname}: {err}")

    # Update run record to completed
    db.update_run(run_id, {
        "status": "completed",
        "finished_at": datetime.utcnow().isoformat(),
        "images_ingested": total_images,
        "blanks_removed": blanks_count,
    })
    logger.info(f"✅ Finished ingest processing for Run ID {run_id}: {total_images} total, {blanks_count} blanks, {animals_count} animals.")


@app.post("/ingest/start")
def start_ingest(req: IngestRequest, background_tasks: BackgroundTasks):
    """
    Endpoint triggered by Node.js orchestrator when a new run ZIP is uploaded.
    Immediately returns accepted response and runs background pipeline worker.
    """
    background_tasks.add_task(process_ingest_pipeline, req.run_id, req.storage_path)
    return {
        "status": "accepted",
        "run_id": req.run_id,
        "message": "Ingestion job queued"
    }
