"""
schemas.py
==========
Pydantic data contracts for the Pench Tiger ML pipeline.

Design rules:
- Each schema represents exactly one pipeline stage boundary.
- bbox coordinates are ALWAYS absolute xyxy pixel integers (x1, y1, x2, y2).
- Normalized coordinates are stored separately and never silently substituted.
- Metadata from upstream (media_id, station_id, timestamp, lat/lon) is
  propagated through every schema so individual records remain traceable.
- No schema knows about database ORM, GIS, or Re-ID internals.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, model_validator


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class MediaType(str, Enum):
    """Camera-trap media type."""
    image = "image"
    video = "video"


class DetectorClass(str, Enum):
    """MegaDetector V6 output categories (class_id mapping)."""
    animal = "animal"    # class_id = 0
    person = "person"    # class_id = 1
    vehicle = "vehicle"  # class_id = 2
    empty = "empty"      # no detection above threshold


# ---------------------------------------------------------------------------
# Stage 0 — Upstream contract (output of blank-filter developer's pipeline)
# ---------------------------------------------------------------------------

class UpstreamAnimalRecord(BaseModel):
    """
    Input contract consumed from the blank-filtering module.

    This schema represents a single retained media record where the upstream
    blank-filter has determined that an animal is present.  My pipeline must
    not depend on *how* the blank filter reached this conclusion — only on
    what it provides here.

    Fields
    ------
    media_id        : Unique identifier for this media item.
    source_file     : Absolute or relative path to the image/video file.
    station_id      : Camera-trap station identifier (e.g. "ST_021").
    timestamp       : Capture date/time in UTC.
    latitude        : GPS latitude (decimal degrees).  None if unavailable.
    longitude       : GPS longitude (decimal degrees).  None if unavailable.
    media_type      : "image" or "video".
    animal_detected : Always True for records passed to this pipeline.
    animal_confidence: MegaDetector confidence from upstream triage stage.
    """

    media_id: str = Field(..., description="Unique media identifier from upstream")
    source_file: str = Field(..., description="Absolute path to the source image or video")
    station_id: str = Field(..., description="Camera-trap station identifier")
    timestamp: datetime = Field(..., description="Capture timestamp (UTC)")
    latitude: Optional[float] = Field(None, description="GPS latitude in decimal degrees")
    longitude: Optional[float] = Field(None, description="GPS longitude in decimal degrees")
    media_type: MediaType = Field(MediaType.image, description="image or video")
    animal_detected: bool = Field(True, description="Must be True; only retained records reach this pipeline")
    animal_confidence: float = Field(..., ge=0.0, le=1.0, description="Upstream blank-filter confidence score")

    @model_validator(mode="after")
    def animal_must_be_detected(self) -> "UpstreamAnimalRecord":
        if not self.animal_detected:
            raise ValueError("UpstreamAnimalRecord must have animal_detected=True. "
                             "Blanks should not reach this pipeline stage.")
        return self


# ---------------------------------------------------------------------------
# Stage 1 — TigerDetector output (MegaDetector V6 detection result)
# ---------------------------------------------------------------------------

class BoundingBox(BaseModel):
    """
    Absolute pixel bounding box in xyxy format.

    Coordinates match the ORIGINAL image dimensions — they are NOT normalised.
    Use normalized_x1/y1/x2/y2 when you need values relative to image size.
    Never silently convert between coordinate conventions.
    """

    x1: float = Field(..., description="Left edge — absolute pixel coordinate")
    y1: float = Field(..., description="Top edge — absolute pixel coordinate")
    x2: float = Field(..., description="Right edge — absolute pixel coordinate")
    y2: float = Field(..., description="Bottom edge — absolute pixel coordinate")

    # Normalised equivalents (populated if image dimensions are known)
    norm_x1: Optional[float] = Field(None, ge=0.0, le=1.0)
    norm_y1: Optional[float] = Field(None, ge=0.0, le=1.0)
    norm_x2: Optional[float] = Field(None, ge=0.0, le=1.0)
    norm_y2: Optional[float] = Field(None, ge=0.0, le=1.0)

    @property
    def width(self) -> float:
        return self.x2 - self.x1

    @property
    def height(self) -> float:
        return self.y2 - self.y1

    @property
    def area(self) -> float:
        return self.width * self.height


class AnimalDetection(BaseModel):
    """
    A single detection returned by MegaDetector V6 for one image.

    MegaDetector identifies *animals*, *persons*, or *vehicles*.
    It does NOT identify species.  Species classification is the
    responsibility of SpeciesClassifier in the next stage.
    """

    bbox: BoundingBox = Field(..., description="Absolute xyxy bounding box")
    confidence: float = Field(..., ge=0.0, le=1.0, description="MegaDetector detection confidence")
    detector_class: DetectorClass = Field(..., description="MegaDetector category: animal/person/vehicle")
    detector_version: str = Field("MDV6-yolov9-c", description="Exact MegaDetector variant used")


class DetectionResult(BaseModel):
    """
    Full output of TigerDetector for one upstream record.

    Contains the original metadata plus all animal detections found.
    Multiple detections can occur when more than one animal appears
    in the same frame.
    """

    # Propagated upstream metadata
    media_id: str
    source_file: str
    station_id: str
    timestamp: datetime
    latitude: Optional[float]
    longitude: Optional[float]
    media_type: MediaType

    # Detection results
    detections: list[AnimalDetection] = Field(default_factory=list)
    threshold_used: float = Field(..., description="Confidence threshold applied to filter detections")
    image_width: Optional[int] = Field(None, description="Original image width in pixels")
    image_height: Optional[int] = Field(None, description="Original image height in pixels")

    @property
    def has_animal(self) -> bool:
        """True if at least one animal-class detection is present."""
        return any(d.detector_class == DetectorClass.animal for d in self.detections)

    @property
    def animal_detections(self) -> list[AnimalDetection]:
        """Filter to animal-class detections only."""
        return [d for d in self.detections if d.detector_class == DetectorClass.animal]


# ---------------------------------------------------------------------------
# Stage 2 — SpeciesClassifier output
# ---------------------------------------------------------------------------

class SpeciesLabel(str, Enum):
    """
    Species classification outcome for a single animal crop.

    "tiger"     : High confidence the crop contains Panthera tigris.
    "non_tiger" : Confirmed non-tiger animal.
    "uncertain" : Confidence insufficient for a definitive call.
                  These go to human review rather than auto-rejection.
    """
    tiger = "tiger"
    non_tiger = "non_tiger"
    uncertain = "uncertain"


class SpeciesClassificationResult(BaseModel):
    """
    Output of SpeciesClassifier for one cropped animal detection.

    The classifier acts on a single crop extracted from DetectionResult.
    It does not re-run MegaDetector — it receives the crop as input.
    """

    # Source traceability
    media_id: str
    source_file: str
    station_id: str
    timestamp: datetime
    latitude: Optional[float]
    longitude: Optional[float]

    # Which detection this crop came from
    detection_bbox: BoundingBox = Field(..., description="The bbox used to extract the crop")
    detection_confidence: float = Field(..., description="MegaDetector confidence for this detection")
    detector_version: str = Field("MDV6-yolov9-c")

    # Species classification
    species_label: SpeciesLabel = Field(..., description="Classification outcome")
    species_confidence: float = Field(..., ge=0.0, le=1.0, description="Species classifier confidence")
    classifier_version: str = Field("stub-v0", description="Species classifier model identifier")
    species_threshold_used: float = Field(..., description="Threshold applied to determine tiger/non_tiger/uncertain")

    @property
    def is_tiger(self) -> bool:
        return self.species_label == SpeciesLabel.tiger

    @property
    def needs_review(self) -> bool:
        return self.species_label == SpeciesLabel.uncertain


# ---------------------------------------------------------------------------
# Stage 3 — TigerCropResult (output of full Stage A pipeline)
# ---------------------------------------------------------------------------

class PoseOrientation(str, Enum):
    left = "left"
    right = "right"
    frontal = "frontal"
    rear = "rear"
    unknown = "unknown"

class TigerCropResult(BaseModel):
    """
    Final output of Stage A for one confirmed (or uncertain) tiger detection.

    Contains all metadata needed by downstream stages:
      - Stage B: FlankSegmenter
      - Stage C: MegaDescriptor Re-ID
      - DB persistence layer
      - Human review queue

    crop_file_path is the path where the extracted crop has been saved on disk.
    It is None if the crop could not be saved (e.g. bbox outside image bounds).
    """

    # Source traceability
    media_id: str
    source_file: str
    station_id: str
    timestamp: datetime
    latitude: Optional[float]
    longitude: Optional[float]

    # Detection
    detection_bbox: BoundingBox
    detection_confidence: float
    detector_version: str = "MDV6-yolov9-c"

    # Species classification
    species_label: SpeciesLabel
    species_confidence: float
    classifier_version: str

    # Crop (from MegaDetector)
    crop_file_path: Optional[str] = Field(None, description="Absolute path to saved crop image")
    
    # Flank Segmentation / Pose (Populated by Stage B)
    flank_file_path: Optional[str] = Field(None, description="Absolute path to saved flank crop")
    orientation: Optional[PoseOrientation] = Field(None, description="left, right, frontal, rear, or unknown")
    is_usable_flank: bool = Field(True, description="False if frontal/rear/heavily occluded")

    # Pipeline flags
    forwarded_to_flank: bool = Field(False, description="True once FlankSegmenter has consumed this")
    needs_human_review: bool = Field(False, description="True for uncertain species classification")


# ---------------------------------------------------------------------------
# Stage 4 — StripeMatcher output (Re-ID)
# ---------------------------------------------------------------------------

class ReviewStatus(str, Enum):
    """
    Review routing status for an identified tiger.
    """
    auto_match = "auto_match"          # High confidence match
    human_review = "human_review"      # Ambiguous match, requires verification
    new_individual = "new_individual"  # Low confidence, automatically enrolled as new


class IdentificationResult(TigerCropResult):
    """
    Final output of Stage C for a single tiger crop.
    Inherits all metadata from TigerCropResult and adds identity information.

    This is the terminal ML schema. Downstream consumers (backend, database)
    receive this object as JSON. The ML service does NOT persist it.
    """
    tiger_id: str = Field(..., description="The assigned or matched tiger ID (e.g. TGR001)")
    match_confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence of the identity match")
    review_status: ReviewStatus = Field(..., description="Routing status for this identification")
    matched_features_count: int = Field(0, description="Number of geometric features matched (SIFT/ORB)")
    model_versions: dict = Field(
        default_factory=lambda: {
            "detector": "MDV6-yolov9-c",
            "species_classifier": "speciesnet-v1",
            "reid": "sift-ransac-v1",
        },
        description="Version strings for each model used in inference",
    )
