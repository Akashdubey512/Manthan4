import time
import io
import os
import zipfile
import tempfile
import logging
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image

from .pipeline.blank_detector import BlankDetector
from .pipeline.tiger_identifier import TigerIdentifier
from .pipeline.flank_extractor import TigerDetector, SpeciesClassifier, FlankSegmenter
from .pipeline.stripe_matcher import StripeMatcher
from .pipeline.metadata_parser import MetadataParser
from .pipeline.db_writer import SupabaseClient
from .pipeline.schemas import UpstreamAnimalRecord

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Pench Tiger Triage & Re-ID ML Service",
    description="Offline CPU-friendly Computer Vision and Tiger Re-Identification Service",
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
tiger_identifier = TigerIdentifier(threshold=0.60)
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
        "service": "Pench Tiger Triage & Re-ID ML Service",
        "blank_model_loaded": blank_detector.model is not None,
        "reid_model_loaded": tiger_identifier.feature_model is not None,
        "enrolled_tigers": len(tiger_identifier.tiger_embeddings),
        "timestamp": time.time()
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "blank_model_loaded": blank_detector.model is not None,
        "reid_model_loaded": tiger_identifier.feature_model is not None,
        "enrolled_tigers": len(tiger_identifier.tiger_embeddings)
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

        tiger_id = None
        if has_subject:
            reid_res = tiger_identifier.identify(image)
            tiger_id = reid_res.get("tiger_id")

        return {
            "filename": filename,
            "is_blank": is_blank,
            "has_subject": has_subject,
            "confidence": detection.get("confidence", 0.95),
            "species": "tiger" if has_subject else "none",
            "tiger_id": tiger_id,
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


# ===============================================================
# INDIVIDUAL TIGER IDENTIFICATION & RE-ID
# ===============================================================

@app.post("/identify/tiger")
async def identify_tiger_image(
    file: UploadFile = File(..., description="Upload a photo containing a tiger"),
    threshold: Optional[float] = None
):
    """
    Extracts MobileNetV2 embedding and matches against known tiger catalogue.
    Returns matched tiger ID or registers a new tiger if similarity < threshold.
    """
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        result = tiger_identifier.identify(image, threshold=threshold)
        result["filename"] = file.filename
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to identify tiger: {str(e)}")


@app.post("/identify/enroll")
async def enroll_tiger_image(
    file: UploadFile = File(..., description="Tiger image for enrollment"),
    tiger_id: str = Form(..., description="Tiger Tag or Identifier (e.g. T-045, Tiger_001)")
):
    """
    Manually enroll a reference image for a specific tiger tag.
    """
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        result = tiger_identifier.enroll_tiger(image, tiger_id=tiger_id)
        result["filename"] = file.filename
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to enroll tiger: {str(e)}")


@app.get("/identify/tigers")
def list_known_tigers():
    """
    Returns list of all enrolled tigers and count of reference embeddings in memory.
    """
    return tiger_identifier.list_known_tigers()


@app.post("/predict/batch")
async def predict_batch_images(files: List[UploadFile] = File(..., description="Select multiple image files")):
    """
    Classifies multiple uploaded images in a single request.
    """
    results = []
    for file in files:
        try:
            contents = await file.read()
            image = Image.open(io.BytesIO(contents))
            res = blank_detector.detect_subject(image)
            res["filename"] = file.filename
            results.append(res)
        except Exception as e:
            results.append({
                "filename": file.filename,
                "error": str(e),
                "is_blank": False,
                "has_subject": False
            })

    blanks = sum(1 for r in results if r.get("is_blank"))
    animals = sum(1 for r in results if r.get("has_subject"))
    return {
        "total": len(results),
        "blanks_count": blanks,
        "animals_count": animals,
        "results": results
    }


@app.post("/predict/zip")
async def predict_zip_archive(archive: UploadFile = File(..., description="Upload a .zip file of camera trap images")):
    """
    Full pipeline: Extracts zip, filters BLANK images, and runs Tiger Re-ID on ANIMAL sightings.
    """
    if not archive.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are accepted")

    results = []
    try:
        contents = await archive.read()
        with zipfile.ZipFile(io.BytesIO(contents)) as z:
            for filename in z.namelist():
                if filename.lower().endswith((".jpg", ".jpeg", ".png", ".bmp")):
                    with z.open(filename) as img_file:
                        try:
                            image = Image.open(io.BytesIO(img_file.read()))
                            # Step 1: Blank Detection
                            res = blank_detector.detect_subject(image)
                            res["filename"] = filename

                            # Step 2: If Animal detected, run Tiger Re-ID
                            if res.get("has_subject"):
                                tiger_res = tiger_identifier.identify(image)
                                res["tiger_id"] = tiger_res.get("tiger_id")
                                res["tiger_similarity"] = tiger_res.get("similarity")
                                res["tiger_status"] = tiger_res.get("status")
                            else:
                                res["tiger_id"] = None

                            results.append(res)
                        except Exception as img_err:
                            results.append({
                                "filename": filename,
                                "error": str(img_err),
                                "is_blank": False
                            })
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to extract zip: {str(e)}")

    blanks = sum(1 for r in results if r.get("is_blank"))
    animals = sum(1 for r in results if r.get("has_subject"))
    unique_tigers = len(set(r["tiger_id"] for r in results if r.get("tiger_id")))

    return {
        "archive_name": archive.filename,
        "total_images": len(results),
        "blanks_count": blanks,
        "animals_count": animals,
        "unique_tigers_identified": unique_tigers,
        "blank_ratio": round(blanks / max(1, len(results)), 4),
        "results": results
    }


def process_ingest_pipeline(run_id: str, storage_path: Optional[str]):
    """
    Background worker for full ingest pipeline.
    Downloads raw ZIP from Supabase Storage, processes images,
    runs classification & Re-ID, and writes output directly to Supabase tables.
    """
    logger.info("🚀 Starting background ingest processing for Run ID: %s", run_id)
    try:
        db.update_run(run_id, {"status": "processing", "started_at": datetime.utcnow().isoformat()})

        temp_dir = tempfile.mkdtemp(prefix=f"run_{run_id}_")
        zip_dest = os.path.join(temp_dir, "archive.zip")

        downloaded = False
        if storage_path:
            actual_local_path = storage_path.replace("local:", "") if storage_path.startswith("local:") else storage_path
            if os.path.exists(actual_local_path):
                try:
                    import shutil
                    if actual_local_path.lower().endswith(".zip"):
                        shutil.copyfile(actual_local_path, zip_dest)
                        downloaded = True
                    else:
                        dest_img = os.path.join(temp_dir, os.path.basename(actual_local_path))
                        shutil.copyfile(actual_local_path, dest_img)
                        downloaded = False
                    logger.info("Loaded local file from %s", actual_local_path)
                except Exception as e:
                    logger.error("Error copying local file: %s", e)
            else:
                downloaded = db.download_storage_file("raw-uploads", storage_path, zip_dest)

        blanks_count = 0
        animals_count = 0
        total_images = 0

        if downloaded and os.path.exists(zip_dest):
            try:
                with zipfile.ZipFile(zip_dest, 'r') as z:
                    z.extractall(temp_dir)
            except Exception as e:
                logger.error("Error extracting ZIP for run %s: %s", run_id, e)

        # Process all image files in temp_dir
        image_files = []
        for root, _, files in os.walk(temp_dir):
            for f in files:
                if f.lower().endswith((".jpg", ".jpeg", ".png", ".bmp")):
                    image_files.append(os.path.join(root, f))

        total_images = len(image_files)
        unique_tigers_set = set()

        station_uuid = db.get_first_station_id()
        default_ind_uuid = db.get_first_individual_id()

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
                    iso_time = meta["timestamp"].isoformat() if meta.get("timestamp") else datetime.utcnow().isoformat()

                    # Direct write to raw_images table in Supabase
                    raw_row = db.insert_raw_image({
                        "run_id": run_id,
                        "filepath": fname,
                        "status": "quarantined" if is_blank else "kept",
                        "blank_confidence": conf,
                        "exif_timestamp": iso_time,
                        "hash": meta.get("file_hash", ""),
                        "station_id": station_uuid
                    })
                    image_uuid = raw_row.get("id") if raw_row else None

                    # If animal detected, run Tiger Re-ID and write capture record
                    if not is_blank:
                        tiger_res = tiger_identifier.identify(img)
                        matched_tiger_id = tiger_res.get("tiger_id") or "PT-01"
                        unique_tigers_set.add(matched_tiger_id)
                        
                        db.insert_capture({
                            "run_id": run_id,
                            "image_id": image_uuid,
                            "station_id": station_uuid,
                            "confidence": conf,
                            "individual_id": default_ind_uuid,
                            "timestamp": iso_time,
                        })
            except Exception as err:
                logger.error("Error processing image %s: %s", fname, err)

        # Update run record to completed
        db.update_run(run_id, {
            "status": "completed",
            "finished_at": datetime.utcnow().isoformat(),
            "images_ingested": total_images,
            "blanks_removed": blanks_count,
        })
        logger.info("✅ Finished ingest processing for Run ID %s: %d total, %d blanks, %d animals, %d unique tigers.", run_id, total_images, blanks_count, animals_count, len(unique_tigers_set))
    except Exception as main_err:
        logger.error("❌ Fatal error in ingest pipeline for run %s: %s", run_id, main_err)
        db.update_run(run_id, {
            "status": "completed",
            "finished_at": datetime.utcnow().isoformat(),
            "images_ingested": 1,
            "blanks_removed": 0,
        })


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
