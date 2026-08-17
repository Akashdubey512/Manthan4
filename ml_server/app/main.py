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

from fastapi.openapi.utils import get_openapi

# Initialize blank detector singleton
detector = BlankDetector()

class IngestRequest(BaseModel):
    run_id: str
    storage_path: Optional[str] = None


@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Pench Tiger Triage ML Service",
        "model_loaded": detector.model is not None,
        "timestamp": time.time()
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "model_loaded": detector.model is not None
    }


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


@app.post("/predict/zip")
async def predict_zip_archive(archive: UploadFile = File(..., description="Upload a .zip file of camera trap images")):
    """
    Extracts all images from a .zip archive and classifies each into ANIMAL or BLANK.
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
                            res = detector.detect_subject(image)
                            res["filename"] = filename
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
    return {
        "archive_name": archive.filename,
        "total_images": len(results),
        "blanks_count": blanks,
        "animals_count": animals,
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


