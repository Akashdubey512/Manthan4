"""
metadata_parser.py
==================
Stage G — Camera-Trap Metadata Extraction and Standardization.

Responsibilities:
    - Extract EXIF timestamps, correcting for clock drift.
    - Extract GPS coordinates from image metadata.
    - Compute file hashes for duplicate detection.
    - Return standardized dictionaries to pass into UpstreamAnimalRecord schemas.
"""

import hashlib
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from pathlib import Path

try:
    from PIL import Image
    from PIL.ExifTags import TAGS, GPSTAGS
except ImportError:
    Image = None

logger = logging.getLogger(__name__)

class MetadataParser:
    def __init__(self, clock_drift_seconds: int = 0):
        self.clock_drift_seconds = clock_drift_seconds

    def compute_file_hash(self, file_path: str) -> str:
        """Computes SHA256 hash of the file for duplicate detection."""
        hasher = hashlib.sha256()
        try:
            with open(file_path, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hasher.update(chunk)
            return hasher.hexdigest()
        except Exception as e:
            logger.error("Failed to hash %s: %s", file_path, e)
            return ""

    def _get_exif_data(self, image_path: str) -> Dict[str, Any]:
        """Extracts EXIF tags from an image using PIL."""
        exif_data = {}
        if Image is None:
            return exif_data
            
        try:
            with Image.open(image_path) as img:
                exif = img._getexif()
                if exif:
                    for tag_id, value in exif.items():
                        tag = TAGS.get(tag_id, tag_id)
                        exif_data[tag] = value
        except Exception as e:
            logger.warning("Failed to extract EXIF from %s: %s", image_path, e)
        return exif_data

    def _get_gps_info(self, exif_data: Dict[str, Any]) -> Dict[str, Any]:
        gps_info = {}
        if "GPSInfo" in exif_data:
            for key in exif_data["GPSInfo"].keys():
                decode = GPSTAGS.get(key, key)
                gps_info[decode] = exif_data["GPSInfo"][key]
        return gps_info

    def _convert_to_degrees(self, value) -> float:
        """Converts EXIF GPS coordinate format to decimal degrees."""
        d0, d1 = value[0] if isinstance(value[0], tuple) else (value[0], 1)
        m0, m1 = value[1] if isinstance(value[1], tuple) else (value[1], 1)
        s0, s1 = value[2] if isinstance(value[2], tuple) else (value[2], 1)
        
        d = float(d0) / float(d1)
        m = float(m0) / float(m1)
        s = float(s0) / float(s1)
        
        return d + (m / 60.0) + (s / 3600.0)

    def extract_metadata(self, file_path: str) -> Dict[str, Any]:
        """
        Extracts EXIF and GPS data from the file.
        
        Returns a dictionary with:
        - timestamp (datetime)
        - latitude (float, optional)
        - longitude (float, optional)
        - file_hash (str)
        """
        exif = self._get_exif_data(file_path)
        
        # 1. Timestamp extraction
        timestamp = None
        time_str = exif.get("DateTimeOriginal") or exif.get("DateTime")
        if time_str:
            try:
                # EXIF format is typically "YYYY:MM:DD HH:MM:SS"
                timestamp = datetime.strptime(str(time_str), "%Y:%m:%d %H:%M:%S")
                # Apply clock drift
                if self.clock_drift_seconds != 0:
                    timestamp += timedelta(seconds=self.clock_drift_seconds)
            except ValueError:
                pass
        
        # Fallback to file creation time if EXIF missing
        if not timestamp:
            try:
                timestamp = datetime.fromtimestamp(Path(file_path).stat().st_ctime)
            except Exception:
                timestamp = datetime.utcnow()

        # 2. GPS extraction
        lat = None
        lon = None
        gps_info = self._get_gps_info(exif)
        
        if "GPSLatitude" in gps_info and "GPSLatitudeRef" in gps_info and \
           "GPSLongitude" in gps_info and "GPSLongitudeRef" in gps_info:
            try:
                lat = self._convert_to_degrees(gps_info["GPSLatitude"])
                if gps_info["GPSLatitudeRef"] != "N":
                    lat = -lat
                    
                lon = self._convert_to_degrees(gps_info["GPSLongitude"])
                if gps_info["GPSLongitudeRef"] != "E":
                    lon = -lon
            except Exception as e:
                logger.warning("Error parsing GPS data: %s", e)

        # 3. Hash
        file_hash = self.compute_file_hash(file_path)

        return {
            "timestamp": timestamp,
            "latitude": lat,
            "longitude": lon,
            "file_hash": file_hash,
            "camera_model": str(exif.get("Model", "Unknown")),
        }
