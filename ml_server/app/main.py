import time
import io
import os
import zipfile
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image

from .pipeline.blank_detector import BlankDetector
from .pipeline.tiger_identifier import TigerIdentifier
from fastapi import Form

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

from fastapi.openapi.utils import get_openapi

# Initialize model singletons
detector = BlankDetector()
identifier = TigerIdentifier(threshold=0.60)

class IngestRequest(BaseModel):
    run_id: str
    storage_path: Optional[str] = None


@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Pench Tiger Triage & Re-ID ML Service",
        "blank_model_loaded": detector.model is not None,
        "reid_model_loaded": identifier.feature_model is not None,
        "enrolled_tigers": len(identifier.tiger_embeddings),
        "timestamp": time.time()
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "blank_model_loaded": detector.model is not None,
        "reid_model_loaded": identifier.feature_model is not None,
        "enrolled_tigers": len(identifier.tiger_embeddings)
    }


# ===============================================================
# BLANK / ANIMAL CLASSIFICATION
# ===============================================================

@app.post("/predict/blank")
async def predict_single_image(file: UploadFile = File(..., description="Select a single image file")):
    """
    Classifies a single image into ANIMAL or BLANK with confidence score.
    """
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        result = detector.detect_subject(image)
        result["filename"] = file.filename
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process image: {str(e)}")


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
            res = detector.detect_subject(image)
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
        result = identifier.identify(image, threshold=threshold)
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
        result = identifier.enroll_tiger(image, tiger_id=tiger_id)
        result["filename"] = file.filename
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to enroll tiger: {str(e)}")


@app.get("/identify/tigers")
def list_known_tigers():
    """
    Returns list of all enrolled tigers and count of reference embeddings in memory.
    """
    return identifier.list_known_tigers()


# ===============================================================
# END-TO-END PIPELINE (BLANK FILTER -> TIGER RE-ID)
# ===============================================================

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
                            res = detector.detect_subject(image)
                            res["filename"] = filename

                            # Step 2: If Animal detected, run Tiger Re-ID
                            if res.get("has_subject"):
                                tiger_res = identifier.identify(image)
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
    """
    print(f"[INFO] Processing ingest pipeline for Run ID: {run_id}, storage: {storage_path}")
    pass


@app.post("/ingest/start")
def start_ingest(req: IngestRequest, background_tasks: BackgroundTasks):
    """
    Endpoint triggered by Node.js orchestrator when a new run ZIP is uploaded.
    """
    background_tasks.add_task(process_ingest_pipeline, req.run_id, req.storage_path)
    return {
        "status": "accepted",
        "run_id": req.run_id,
        "message": "Ingestion job queued"
    }


# Custom OpenAPI to guarantee Swagger UI renders proper File Picker inputs for arrays
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    # Fix schemas for multipart file arrays
    for schema in openapi_schema.get("components", {}).get("schemas", {}).values():
        if "properties" in schema:
            for prop in schema["properties"].values():
                if prop.get("type") == "array" and "items" in prop:
                    prop["items"]["format"] = "binary"
                    prop["items"]["type"] = "string"
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi



