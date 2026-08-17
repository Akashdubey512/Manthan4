"""
schemas.py
==========
Pydantic data contracts for the Pench Tiger ML pipeline.
"""

from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, model_validator


class MediaType(str, Enum):
    image = "image"
    video = "video"


class DetectorClass(str, Enum):
    animal = "animal"
    person = "person"
    vehicle = "vehicle"
    empty = "empty"


class UpstreamAnimalRecord(BaseModel):
    media_id: str
    source_file: str
    station_id: str
    timestamp: datetime
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    media_type: MediaType = MediaType.image
    animal_detected: bool = True
    animal_confidence: float = 0.99


class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float
    norm_x1: Optional[float] = None
    norm_y1: Optional[float] = None
    norm_x2: Optional[float] = None
    norm_y2: Optional[float] = None

    @property
    def width(self) -> float:
        return self.x2 - self.x1

    @property
    def height(self) -> float:
        return self.y2 - self.y1


class AnimalDetection(BaseModel):
    bbox: BoundingBox
    confidence: float
    detector_class: DetectorClass = DetectorClass.animal
    detector_version: str = "MDV6-yolov9-c"


class DetectionResult(BaseModel):
    media_id: str
    source_file: str
    station_id: str
    timestamp: datetime
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    media_type: MediaType = MediaType.image
    detections: list[AnimalDetection] = Field(default_factory=list)
    threshold_used: float = 0.15


class SpeciesLabel(str, Enum):
    tiger = "tiger"
    non_tiger = "non_tiger"
    uncertain = "uncertain"


class SpeciesClassificationResult(BaseModel):
    media_id: str
    source_file: str
    station_id: str
    timestamp: datetime
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    detection_bbox: BoundingBox
    detection_confidence: float
    species_label: SpeciesLabel
    species_confidence: float
    classifier_version: str = "speciesnet-v1"


class PoseOrientation(str, Enum):
    left = "left"
    right = "right"
    frontal = "frontal"
    rear = "rear"
    unknown = "unknown"


class TigerCropResult(BaseModel):
    media_id: str
    source_file: str
    station_id: str
    timestamp: datetime
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    detection_bbox: BoundingBox
    detection_confidence: float
    species_label: SpeciesLabel
    species_confidence: float
    classifier_version: str = "speciesnet-v1"
    crop_file_path: Optional[str] = None
    flank_file_path: Optional[str] = None
    orientation: Optional[PoseOrientation] = PoseOrientation.unknown
    is_usable_flank: bool = True
    needs_human_review: bool = False


class ReviewStatus(str, Enum):
    auto_match = "auto_match"
    human_review = "human_review"
    new_individual = "new_individual"


class IdentificationResult(TigerCropResult):
    tiger_id: str
    match_confidence: float
    review_status: ReviewStatus
    matched_features_count: int = 0
    model_versions: dict = Field(
        default_factory=lambda: {
            "detector": "MDV6-yolov9-c",
            "species_classifier": "speciesnet-v1",
            "reid": "sift-ransac-v1",
        }
    )
