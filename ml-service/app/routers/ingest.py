"""
ingest.py
=========
FastAPI Router — ML-only inference endpoint.

This router is the external API surface of the ML Service.
It runs the ML pipeline (Stage A → B → C) and returns a JSON result.

It does NOT:
  - Write to any database (that is the backend team's responsibility)
  - Compute GIS home ranges or deviations (that is the backend team's responsibility)
  - Touch any frontend or Express routes
"""

from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
import logging
from pathlib import Path
from datetime import datetime

from app.pipeline.flank_extractor import TigerDetector, SpeciesClassifier, FlankSegmenter, run_stage_a
from app.pipeline.stripe_matcher import StripeMatcher
from app.schemas import UpstreamAnimalRecord, MediaType, SpeciesLabel

logger = logging.getLogger(__name__)

router = APIRouter()

# ---------------------------------------------------------------------------
# ML model singletons — loaded once at startup, reused across requests.
# In a production deployment, these would be dependency-injected.
# ---------------------------------------------------------------------------
detector = TigerDetector(confidence_threshold=0.15)
classifier = SpeciesClassifier(
    tiger_threshold=0.85,
    uncertain_threshold=0.50,
    classifier_version="speciesnet-v1",
)
segmenter = FlankSegmenter()
matcher = StripeMatcher(catalogue_dir="sample_data/catalogue")


class SingleImageRequest(BaseModel):
    """Request body for single-image inference."""
    image_path: str
    station_id: str = "UNKNOWN"
    media_id: str | None = None


class BatchProcessRequest(BaseModel):
    """Request body for batch inference on a directory."""
    folder_path: str
    station_id: str


def _process_single_image(image_path: Path, station_id: str, media_id: str | None = None) -> dict:
    """
    Run the full ML pipeline on one image and return a result dict.

    Pipeline:
        Stage A: MegaDetector → animal crop → SpeciesNet → tiger gate
        Stage B: Flank extraction (center crop heuristic)
        Stage C: Stripe matching / Re-ID

    The result is a plain dict suitable for JSON serialization.
    No database writes. No GIS computations.
    """
    mid = media_id or image_path.stem

    record = UpstreamAnimalRecord(
        media_id=mid,
        source_file=str(image_path),
        station_id=station_id,
        timestamp=datetime.now(),
        animal_detected=True,
        animal_confidence=0.99,
    )

    # Stage A — Detection and Species Gating
    crop_results = run_stage_a(record, detector, classifier)

    results = []
    for crop in crop_results:
        entry = {
            "media_id": crop.media_id,
            "species": crop.species_label.value,
            "species_confidence": round(crop.species_confidence, 4),
            "tiger_decision": crop.species_label.value,
            "tiger_crop": crop.crop_file_path,
            "flank_crop": None,
            "individual_id": None,
            "identity_confidence": None,
            "review_status": None,
            "model_versions": {
                "detector": crop.detector_version,
                "species_classifier": crop.classifier_version,
                "reid": None,
            },
        }

        # Stage B — Flank extraction (only for tiger or uncertain)
        if crop.species_label in (SpeciesLabel.tiger, SpeciesLabel.uncertain):
            flank_result = segmenter.segment(crop)
            entry["flank_crop"] = flank_result.flank_file_path
            entry["orientation"] = flank_result.orientation.value if flank_result.orientation else "unknown"
            entry["is_usable_flank"] = flank_result.is_usable_flank

            # Stage C — Re-ID (only for confirmed tigers and usable flanks)
            if crop.species_label == SpeciesLabel.tiger and flank_result.is_usable_flank:
                id_result = matcher.identify(flank_result)
                entry["individual_id"] = id_result.tiger_id
                entry["identity_confidence"] = round(id_result.match_confidence, 4)
                entry["review_status"] = id_result.review_status.value
                entry["model_versions"]["reid"] = "sift-ransac-v1"

        results.append(entry)

    return {
        "media_id": mid,
        "source_file": str(image_path),
        "station_id": station_id,
        "detections": results,
        "detection_count": len(results),
    }


@router.post("/infer")
async def infer_single(request: SingleImageRequest):
    """
    Run the ML pipeline on a single image.
    Returns the full ML result JSON — no database side effects.
    """
    img = Path(request.image_path)
    if not img.exists():
        return {"error": f"Image not found: {request.image_path}"}
    return _process_single_image(img, request.station_id, request.media_id)


@router.post("/process-batch")
async def process_batch(request: BatchProcessRequest, background_tasks: BackgroundTasks):
    """
    Triggers ML pipeline on all images in a directory.
    Runs in background. Results are logged, not stored to a database.
    """
    background_tasks.add_task(_run_batch, request.folder_path, request.station_id)
    return {"message": "Batch ML processing started.", "folder": request.folder_path}


def _run_batch(folder_path: str, station_id: str):
    p = Path(folder_path)
    if not p.exists() or not p.is_dir():
        logger.error("Folder not found: %s", folder_path)
        return

    valid_exts = {".jpg", ".jpeg", ".png"}
    for img_file in sorted(p.iterdir()):
        if img_file.suffix.lower() in valid_exts:
            try:
                result = _process_single_image(img_file, station_id)
                logger.info("Processed %s: %d detections", img_file.name, result["detection_count"])
            except Exception as e:
                logger.error("Error processing %s: %s", img_file, e)
    logger.info("Batch ML processing complete for %s", folder_path)
