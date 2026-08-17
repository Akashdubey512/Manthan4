"""
flank_extractor.py
==================
Stage A and Stage B ML pipeline for the Pench Tiger Intelligence System.

Pipeline ownership:
    TigerDetector      → Stage A, Step 1: Animal detection via MegaDetector V6
    SpeciesClassifier  → Stage A, Step 2: Tiger vs non-tiger species classification
    FlankSegmenter     → Stage B (interface stub only — not implemented yet)

Authorship boundary:
    This file does NOT touch:
      - blank_detector.py           (upstream blank-filtering, other developer)
      - quarantine_manager.py       (upstream staged deletion, other developer)
      - metadata_parser.py          (upstream EXIF extraction, other developer)
      - stripe_matcher.py           (downstream Re-ID, Stage C)
      - any database / GIS module

Input to this module:
    UpstreamAnimalRecord (defined in schemas.py)
    — one record per retained image where upstream confirmed animal_detected=True

Output from this module:
    list[TigerCropResult]
    — one entry per confirmed-tiger or uncertain-species detection

Design notes:
    - Confidence thresholds are configurable; no production value is hard-coded.
    - MegaDetector is loaded once and reused across calls (singleton pattern).
    - bbox coordinates are always absolute xyxy pixel values.
    - Normalised coordinates are computed separately and never silently substituted.
    - SpeciesClassifier is intentionally model-agnostic at this stage; a stub
      implementation is in place until a trained species classifier is available
      (see docs/model_choices.md, which does not yet prescribe a species model).
    - FlankSegmenter defines the downstream interface only; implementation
      is deferred to Stage B.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Optional

import numpy as np
from PIL import Image

from app.schemas import (
    AnimalDetection,
    BoundingBox,
    DetectionResult,
    DetectorClass,
    MediaType,
    SpeciesClassificationResult,
    SpeciesLabel,
    TigerCropResult,
    UpstreamAnimalRecord,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# MegaDetector class_id → DetectorClass mapping (from observed output)
_MD_CLASS_MAP: dict[int, DetectorClass] = {
    0: DetectorClass.animal,
    1: DetectorClass.person,
    2: DetectorClass.vehicle,
}

# Default MegaDetector variant.  Change to MDV6-yolov9-e / MDV6-yolov10-c etc.
# for higher accuracy at the cost of inference speed.
_DEFAULT_MDV6_VERSION = "MDV6-yolov9-c"

# Default crop output directory (relative to project root).
# Crops are written alongside the source images by default.
_DEFAULT_CROP_SUBDIR = "tiger_crops"


# ---------------------------------------------------------------------------
# Class 1 — TigerDetector
# ---------------------------------------------------------------------------

class TigerDetector:
    """
    Wraps MegaDetector V6 for animal detection on camera-trap images.

    Responsibilities:
        - Load and hold the MegaDetector V6 model (loaded once, reused).
        - Accept an UpstreamAnimalRecord as input.
        - Run GPU/CPU inference on the source image.
        - Return a DetectionResult with all detections above `confidence_threshold`.

    What this class does NOT do:
        - It does NOT identify tiger species.  MegaDetector outputs
          animal/person/vehicle only.  Species classification is the
          responsibility of SpeciesClassifier.
        - It does NOT modify or duplicate the upstream blank-filter.
        - It does NOT perform any database writes.

    Parameters
    ----------
    confidence_threshold : float
        Minimum MegaDetector confidence score for a detection to be retained.
        This is configurable and intentionally has no hard-coded production
        default.  Set it based on empirical evaluation on Pench data.
    version : str
        MegaDetector V6 variant.  Choices as per PytorchWildlife:
        MDV6-yolov9-c (fast), MDV6-yolov9-e (accurate),
        MDV6-yolov10-c, MDV6-yolov10-e, MDV6-rtdetr-c
    device : str
        "cuda" or "cpu".  Defaults to CUDA if available.
    """

    def __init__(
        self,
        confidence_threshold: float,
        version: str = _DEFAULT_MDV6_VERSION,
        device: Optional[str] = None,
    ) -> None:
        if not (0.0 < confidence_threshold <= 1.0):
            raise ValueError(
                f"confidence_threshold must be in (0, 1], got {confidence_threshold}"
            )
        self.confidence_threshold = confidence_threshold
        self.version = version

        # Resolve device
        try:
            import torch
            self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        except ImportError:
            self.device = "cpu"

        self._model = None  # lazy-loaded on first detect() call
        logger.info(
            "TigerDetector initialised | version=%s device=%s threshold=%.3f",
            self.version, self.device, self.confidence_threshold,
        )

    def _load_model(self) -> None:
        """Load MegaDetector V6 weights (called once on first use)."""
        if self._model is not None:
            return
        try:
            from PytorchWildlife.models import detection as pw_detection
            self._model = pw_detection.MegaDetectorV6(
                device=self.device,
                pretrained=True,
                version=self.version,
            )
            logger.info("MegaDetector V6 (%s) loaded on %s", self.version, self.device)
        except Exception as exc:
            logger.error("Failed to load MegaDetector V6: %s", exc)
            raise

    def detect(self, record: UpstreamAnimalRecord) -> DetectionResult:
        """
        Run MegaDetector V6 on the image described by `record`.

        Parameters
        ----------
        record : UpstreamAnimalRecord
            Retained-animal record from the upstream blank-filter.

        Returns
        -------
        DetectionResult
            All detections above `self.confidence_threshold`, with
            absolute xyxy bounding boxes and propagated metadata.
        """
        self._load_model()

        source = record.source_file
        if not Path(source).exists():
            raise FileNotFoundError(f"Source image not found: {source}")

        # --- Get image dimensions for normalised coordinate computation ---
        img_width: Optional[int] = None
        img_height: Optional[int] = None
        try:
            with Image.open(source) as pil_img:
                img_width, img_height = pil_img.size  # (W, H)
        except Exception as exc:
            logger.warning("Could not read image dimensions for %s: %s", source, exc)

        # --- Run MegaDetector inference ---
        raw = self._model.single_image_detection(source)

        # --- Parse raw output into typed detections ---
        detections: list[AnimalDetection] = []
        raw_dets = raw.get("detections")

        if raw_dets is not None and len(raw_dets.xyxy) > 0:
            for idx in range(len(raw_dets.xyxy)):
                conf = float(raw_dets.confidence[idx])
                if conf < self.confidence_threshold:
                    continue  # below threshold — skip

                class_id = int(raw_dets.class_id[idx])
                detector_class = _MD_CLASS_MAP.get(class_id, DetectorClass.animal)

                x1, y1, x2, y2 = (float(v) for v in raw_dets.xyxy[idx])

                # Compute normalised coordinates only when image size is known
                norm_x1 = norm_y1 = norm_x2 = norm_y2 = None
                if img_width and img_height:
                    norm_x1 = x1 / img_width
                    norm_y1 = y1 / img_height
                    norm_x2 = x2 / img_width
                    norm_y2 = y2 / img_height

                bbox = BoundingBox(
                    x1=x1, y1=y1, x2=x2, y2=y2,
                    norm_x1=norm_x1, norm_y1=norm_y1,
                    norm_x2=norm_x2, norm_y2=norm_y2,
                )
                detections.append(AnimalDetection(
                    bbox=bbox,
                    confidence=conf,
                    detector_class=detector_class,
                    detector_version=self.version,
                ))

        logger.info(
            "Detected %d object(s) above threshold %.3f in %s",
            len(detections), self.confidence_threshold, source,
        )

        return DetectionResult(
            media_id=record.media_id,
            source_file=record.source_file,
            station_id=record.station_id,
            timestamp=record.timestamp,
            latitude=record.latitude,
            longitude=record.longitude,
            media_type=record.media_type,
            detections=detections,
            threshold_used=self.confidence_threshold,
            image_width=img_width,
            image_height=img_height,
        )


# ---------------------------------------------------------------------------
# Class 2 — SpeciesClassifier
# ---------------------------------------------------------------------------

class SpeciesClassifier:
    """
    Classifies an animal crop as tiger / non_tiger / uncertain.

    Responsibilities:
        - Accept a crop (numpy array or file path) extracted from a
          DetectionResult bounding box.
        - Return a SpeciesClassificationResult.

    Current implementation: STUB / SpeciesNet-ready adapter
        docs/model_choices.md does not prescribe a species classifier model.
        The planned Re-ID model (stripe_matcher.py) uses SIFT/ORB/RANSAC for
        individual ID — that operates on confirmed tiger flanks, not species.

        Architecture:
            SpeciesClassifier
                └── _classify_stub()      ← current: conservative fallback
                └── _classify_speciesnet() ← next: SpeciesNet adapter

        When classifier_version == 'stub-v0':
            Returns (uncertain, 0.0).  All crops go to human review.
        When classifier_version == 'speciesnet-v1':
            Loads google/speciesnet and runs the crop through it.
            Returns the camera-trap species label and confidence.

        Microsoft's MegaDetector documentation explicitly recommends
        SpeciesNet as the downstream species classifier for camera-trap
        pipelines (https://github.com/agentmorris/MegaDetector).
        SpeciesNet is trained on 65M+ images covering 2,000+ labels.

        This interface is stable — swapping in SpeciesNet does not
        require changes to TigerDetector or run_stage_a().

    Interface:
        The method signature and return schema are fixed so that a real model
        can be dropped in by replacing _classify_crop() without changing any
        calling code.

    Parameters
    ----------
    tiger_threshold : float
        Minimum classifier confidence to label a crop as "tiger".
    uncertain_threshold : float
        Below this confidence the label is "uncertain" (human review).
        Between uncertain_threshold and tiger_threshold → "non_tiger".
    classifier_version : str
        Identifier string for the model version (propagated to schema).
    """

    def __init__(
        self,
        tiger_threshold: float,
        uncertain_threshold: float,
        classifier_version: str = "stub-v0",
    ) -> None:
        if not (0.0 < uncertain_threshold < tiger_threshold <= 1.0):
            raise ValueError(
                "Thresholds must satisfy 0 < uncertain_threshold "
                f"< tiger_threshold <= 1.  Got: uncertain={uncertain_threshold}, "
                f"tiger={tiger_threshold}"
            )
        self.tiger_threshold = tiger_threshold
        self.uncertain_threshold = uncertain_threshold
        self.classifier_version = classifier_version

        logger.info(
            "SpeciesClassifier initialised | version=%s tiger_thr=%.3f uncertain_thr=%.3f",
            self.classifier_version, self.tiger_threshold, self.uncertain_threshold,
        )

        if self.classifier_version == "stub-v0":
            logger.warning(
                "SpeciesClassifier is running in STUB mode.  "
                "All crops will be labelled 'uncertain' until a real "
                "species model is integrated.  See docs/model_choices.md."
            )

    # ------------------------------------------------------------------
    # Internal dispatch
    # ------------------------------------------------------------------

    def _classify_crop(self, crop: np.ndarray) -> tuple[SpeciesLabel, float]:
        """
        Dispatch to the appropriate backend based on classifier_version.

        Parameters
        ----------
        crop : np.ndarray
            RGB image array of the animal crop (H x W x 3, uint8).

        Returns
        -------
        (SpeciesLabel, float)
            Classification label and confidence score.
            This contract is stable across all backends.
        """
        if self.classifier_version == "stub-v0":
            return self._classify_stub(crop)
        elif self.classifier_version == "speciesnet-v1":
            return self._classify_speciesnet(crop)
        else:
            raise NotImplementedError(
                f"Unknown classifier_version='{self.classifier_version}'. "
                "Supported: 'stub-v0', 'speciesnet-v1'."
            )

    def _classify_stub(self, crop: np.ndarray) -> tuple[SpeciesLabel, float]:
        """
        Conservative stub — returns uncertain for every crop.

        Used during Stage A.2 (batch detection quality evaluation) before
        a real species classifier is integrated.
        """
        # Intentional: all uncertain crops flow to human review.
        return SpeciesLabel.uncertain, 0.0

    def _classify_speciesnet(self, crop: np.ndarray) -> tuple[SpeciesLabel, float]:
        """
        SpeciesNet adapter — Stage A.3.

        SpeciesNet (google/speciesnet) is the recommended downstream species
        classifier for MegaDetector pipelines.  It is trained on 65M+ images
        covering 2,000+ taxonomic labels including Panthera tigris.
        """
        import os
        import tempfile
        from PIL import Image

        if not hasattr(self, '_speciesnet_model'):
            from speciesnet import SpeciesNet, DEFAULT_MODEL
            # We must use components="all" because predict() fails internally without a detector loaded
            logger.info("Initialising SpeciesNet classifier (model=%s)...", DEFAULT_MODEL)
            self._speciesnet_model = SpeciesNet(model_name=DEFAULT_MODEL, components="all")

        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            # Write the numpy crop array to disk for SpeciesNet to read
            Image.fromarray(crop).save(tmp_path, "JPEG", quality=95)
            
            # Predict — returns {"predictions": [{"prediction": "uuid;class;order;family;genus;species;common", "prediction_score": float, ...}]}
            results = self._speciesnet_model.predict(filepaths=[tmp_path])
            
            if not results or "predictions" not in results:
                return SpeciesLabel.uncertain, 0.0
            
            preds_list = results["predictions"]
            if not preds_list:
                return SpeciesLabel.uncertain, 0.0
            
            item = preds_list[0]
            prediction_str = item.get("prediction", "")
            conf = float(item.get("prediction_score", 0.0))
            
            # Parse taxonomy: "uuid;class;order;family;genus;species;common_name"
            # We check for "panthera;tigris" in the prediction string
            parts = prediction_str.lower().split(";")
            is_tiger = ("panthera" in parts and "tigris" in parts)
            
            if conf < self.uncertain_threshold:
                return SpeciesLabel.uncertain, conf
            elif is_tiger and conf >= self.tiger_threshold:
                return SpeciesLabel.tiger, conf
            elif is_tiger:
                # Tiger detected but below tiger_threshold → uncertain
                return SpeciesLabel.uncertain, conf
            else:
                return SpeciesLabel.non_tiger, conf

        except Exception as exc:
            logger.error("SpeciesNet inference failed on crop: %s", exc)
            return SpeciesLabel.uncertain, 0.0
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def classify(
        self,
        detection: AnimalDetection,
        source_image_path: str,
        record: UpstreamAnimalRecord,
    ) -> SpeciesClassificationResult:
        """
        Classify a single animal detection crop.

        Parameters
        ----------
        detection : AnimalDetection
            The detection to classify (provides bbox coordinates).
        source_image_path : str
            Path to the full source image.
        record : UpstreamAnimalRecord
            Original upstream record (for metadata propagation).

        Returns
        -------
        SpeciesClassificationResult
        """
        # Extract crop from source image using absolute xyxy bbox
        try:
            with Image.open(source_image_path) as pil_img:
                bbox = detection.bbox
                # PIL crop expects (left, upper, right, lower) — same as xyxy
                crop_pil = pil_img.crop((
                    int(bbox.x1), int(bbox.y1),
                    int(bbox.x2), int(bbox.y2),
                ))
                crop_np = np.array(crop_pil.convert("RGB"))
        except Exception as exc:
            logger.error("Failed to extract crop from %s: %s", source_image_path, exc)
            label, conf = SpeciesLabel.uncertain, 0.0
        else:
            label, conf = self._classify_crop(crop_np)

        return SpeciesClassificationResult(
            media_id=record.media_id,
            source_file=record.source_file,
            station_id=record.station_id,
            timestamp=record.timestamp,
            latitude=record.latitude,
            longitude=record.longitude,
            detection_bbox=detection.bbox,
            detection_confidence=detection.confidence,
            detector_version=detection.detector_version,
            species_label=label,
            species_confidence=conf,
            classifier_version=self.classifier_version,
            species_threshold_used=self.tiger_threshold,
        )


# ---------------------------------------------------------------------------
# Class 3 — FlankSegmenter (Stage B Implementation)
# ---------------------------------------------------------------------------

class FlankSegmenter:
    """
    Stage B — Flank region segmentation for Re-ID preparation.

    Responsibilities:
        - Accept a TigerCropResult (confirmed tiger crop).
        - Isolate the flank region within the crop using a heuristic.
        - Return a flank image suitable for MegaDescriptor / SIFT Re-ID.
        - Preserve media_id and bbox lineage for traceability.
        - Fail gracefully if flank extraction fails.
    """
from app.schemas import PoseOrientation

class FlankSegmenter:
    """
    Stage B: Flank Extraction and Orientation Detection.
    
    Implements a zero-dependency heuristic to:
    1. Reject poor quality, heavily occluded, or too-small crops.
    2. Reject frontal/rear poses based on aspect ratio.
    3. Estimate Left/Right orientation using vertical edge density (Sobel).
    4. Fallback to a geometric 70% center crop for the usable flank.
    """

    def __init__(
        self,
        center_crop_ratio: float = 0.7,
        flank_output_dir: Optional[str] = None
    ) -> None:
        self.center_crop_ratio = center_crop_ratio
        self.flank_output_dir = flank_output_dir
        
        logger.info(
            "FlankSegmenter initialised | fallback center_crop_ratio=%.2f",
            self.center_crop_ratio
        )

    def _estimate_orientation(self, img_pil) -> PoseOrientation:
        """
        Smallest defensible orientation heuristic using vertical edge density.
        Tigers have vertical stripes on their body/flank. The head has fewer.
        By comparing the vertical edge density of the left third vs right third,
        we can guess which side the flank is on.
        """
        import numpy as np
        import cv2
        
        # Convert PIL to grayscale numpy array
        img_np = np.array(img_pil.convert('L'))
        h, w = img_np.shape
        
        # Crop out the center 60% horizontally to avoid extreme background edges
        margin = int(w * 0.2)
        center = img_np[:, margin:w-margin]
        ch, cw = center.shape
        
        # Calculate vertical edges (Sobel X) to find stripes
        sobelx = cv2.Sobel(center, cv2.CV_64F, 1, 0, ksize=3)
        abs_sobelx = np.absolute(sobelx)
        
        # Split into left and right halves of the cropped center
        half = cw // 2
        left_half = abs_sobelx[:, :half]
        right_half = abs_sobelx[:, half:]
        
        left_score = np.sum(left_half) / (left_half.size + 1e-6)
        right_score = np.sum(right_half) / (right_half.size + 1e-6)
        
        # If the scores are very close, it's ambiguous
        if abs(left_score - right_score) / max(left_score, right_score, 1) < 0.1:
            return PoseOrientation.unknown
            
        # The half with HIGHER vertical edge score is the BODY.
        # If BODY is on RIGHT, head is on LEFT => facing left => RIGHT FLANK exposed
        if right_score > left_score:
            return PoseOrientation.right
        else:
            return PoseOrientation.left

    def segment(self, crop_result: TigerCropResult) -> TigerCropResult:
        """
        Accepts a TigerCropResult and isolates the flank region.

        Updates flank_file_path, orientation, and is_usable_flank.
        Returns a modified copy of the TigerCropResult.
        """
        if not crop_result.crop_file_path or not Path(crop_result.crop_file_path).exists():
            logger.error("No valid crop file path provided for flank segmentation")
            return crop_result

        out_dir = self.flank_output_dir or str(Path(crop_result.source_file).parent / "flank_crops")
        os.makedirs(out_dir, exist_ok=True)

        new_result = crop_result.model_copy(deep=True)
        new_result.forwarded_to_flank = True
        
        try:
            with Image.open(crop_result.crop_file_path) as img:
                w, h = img.size
                
                # --- Rejection Rules ---
                
                # 1. Very small or poor-quality crops
                if crop_result.detection_confidence < 0.40:
                    new_result.is_usable_flank = False
                    new_result.orientation = PoseOrientation.unknown
                    logger.info("Rejected crop %s: Low detection confidence (severe occlusion/blur)", crop_result.media_id)
                    return new_result
                    
                if w < 150 or h < 150:
                    new_result.is_usable_flank = False
                    new_result.orientation = PoseOrientation.unknown
                    logger.info("Rejected crop %s: Too small (insufficient visible flank)", crop_result.media_id)
                    return new_result
                    
                # 2. Frontal/Rear views based on aspect ratio
                # A tiger standing side-on is horizontal. If it's vertical, it's facing us or walking away.
                if h >= w * 1.15:
                    new_result.is_usable_flank = False
                    new_result.orientation = PoseOrientation.frontal # or rear, functionally same for rejection
                    logger.info("Rejected crop %s: Frontal/Rear view (aspect ratio)", crop_result.media_id)
                    return new_result
                
                # --- Orientation Estimation ---
                orientation = self._estimate_orientation(img)
                new_result.orientation = orientation
                new_result.is_usable_flank = True
                
                # --- Geometric Flank Extraction (CPU Fallback) ---
                margin_w = int(w * (1.0 - self.center_crop_ratio) / 2.0)
                margin_h = int(h * (1.0 - self.center_crop_ratio) / 2.0)
                flank_box = (margin_w, margin_h, w - margin_w, h - margin_h)
                
                flank_img = img.crop(flank_box).convert("RGB")
                flank_filename = Path(crop_result.crop_file_path).stem + "_flank.jpg"
                flank_path = str(Path(out_dir) / flank_filename)
                
                flank_img.save(flank_path, "JPEG", quality=95)
                new_result.flank_file_path = flank_path
                
                return new_result

        except Exception as exc:
            logger.error("Flank segmentation failed for %s: %s", crop_result.media_id, exc)
            return new_result


# ---------------------------------------------------------------------------
# Stage A pipeline — convenience orchestrator
# ---------------------------------------------------------------------------

def run_stage_a(
    record: UpstreamAnimalRecord,
    detector: TigerDetector,
    classifier: SpeciesClassifier,
    crop_output_dir: Optional[str] = None,
) -> list[TigerCropResult]:
    """
    Full Stage A pipeline for one upstream retained-animal record.

    Steps:
        1. TigerDetector  → run MegaDetector V6, get animal detections
        2. For each animal detection:
           a. SpeciesClassifier → classify crop as tiger/non_tiger/uncertain
           b. Save crop to disk if tiger or uncertain
           c. Build TigerCropResult

    Parameters
    ----------
    record : UpstreamAnimalRecord
        A single retained image record from the upstream blank-filter.
    detector : TigerDetector
        Initialised TigerDetector instance.
    classifier : SpeciesClassifier
        Initialised SpeciesClassifier instance.
    crop_output_dir : str, optional
        Directory where crops are saved.  Defaults to a `tiger_crops/`
        subfolder alongside the source image.

    Returns
    -------
    list[TigerCropResult]
        One entry per animal detection that is either confirmed tiger
        or uncertain (non-tiger detections are excluded from results).
    """
    results: list[TigerCropResult] = []

    # Step 1 — Detect animals
    detection_result = detector.detect(record)

    if not detection_result.has_animal:
        logger.info(
            "No animal-class detections above threshold in %s", record.source_file
        )
        return results

    # Resolve crop output directory
    if crop_output_dir is None:
        crop_output_dir = str(
            Path(record.source_file).parent / _DEFAULT_CROP_SUBDIR
        )
    os.makedirs(crop_output_dir, exist_ok=True)

    # Step 2 — Classify each animal detection
    for det_idx, detection in enumerate(detection_result.animal_detections):
        # 2a — Species classification
        species_result = classifier.classify(
            detection=detection,
            source_image_path=record.source_file,
            record=record,
        )

        # 2b — Skip confirmed non-tiger detections
        if species_result.species_label == SpeciesLabel.non_tiger:
            logger.debug(
                "Detection %d in %s classified as non_tiger (conf=%.3f) — skipping",
                det_idx, record.media_id, species_result.species_confidence,
            )
            continue

        # 2c — Save crop for tiger / uncertain detections
        crop_path: Optional[str] = None
        crop_width: Optional[int] = None
        crop_height: Optional[int] = None

        try:
            with Image.open(record.source_file) as pil_img:
                bbox = detection.bbox
                crop_pil = pil_img.crop((
                    int(bbox.x1), int(bbox.y1),
                    int(bbox.x2), int(bbox.y2),
                )).convert("RGB")
                crop_width, crop_height = crop_pil.size

                crop_filename = (
                    f"{record.media_id}_det{det_idx:02d}_"
                    f"{species_result.species_label.value}.jpg"
                )
                crop_path = str(Path(crop_output_dir) / crop_filename)
                crop_pil.save(crop_path, "JPEG", quality=95)
                logger.info("Saved crop: %s", crop_path)

        except Exception as exc:
            logger.error(
                "Failed to save crop for %s det %d: %s",
                record.media_id, det_idx, exc,
            )

        results.append(TigerCropResult(
            media_id=record.media_id,
            source_file=record.source_file,
            station_id=record.station_id,
            timestamp=record.timestamp,
            latitude=record.latitude,
            longitude=record.longitude,
            detection_bbox=detection.bbox,
            detection_confidence=detection.confidence,
            detector_version=detection.detector_version,
            species_label=species_result.species_label,
            species_confidence=species_result.species_confidence,
            classifier_version=species_result.classifier_version,
            crop_file_path=crop_path,
            crop_width=crop_width,
            crop_height=crop_height,
            forwarded_to_flank=False,
            needs_human_review=species_result.needs_review,
        ))

    logger.info(
        "Stage A complete for %s: %d result(s) forwarded",
        record.media_id, len(results),
    )
    return results
