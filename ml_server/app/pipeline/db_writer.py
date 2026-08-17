import os
from pathlib import Path
import requests
import logging
from datetime import datetime
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

def _load_env():
    """Find and load .env file if environment variables are not already set."""
    if os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_SERVICE_ROLE_KEY"):
        return

    candidate_paths = [
        Path(__file__).parent.parent.parent / ".env",
        Path(__file__).parent.parent.parent.parent / "backend" / ".env",
        Path.cwd() / ".env",
        Path.cwd() / "backend" / ".env"
    ]
    for p in candidate_paths:
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            k = k.strip()
                            v = v.strip().strip('"').strip("'")
                            if k not in os.environ:
                                os.environ[k] = v
                logger.info("Loaded Supabase credentials from %s", p)
                break
            except Exception as e:
                logger.warning("Error reading env file %s: %s", p, e)

class SupabaseClient:
    def __init__(self, url: Optional[str] = None, key: Optional[str] = None):
        _load_env()
        self.url = (url or os.getenv("SUPABASE_URL", "")).rstrip('/')
        self.key = key or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        self.headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        if not self.url or not self.key:
            logger.error("⚠️ SupabaseClient initialized with missing credentials! SUPABASE_URL: %s", bool(self.url))
        else:
            logger.info("✅ SupabaseClient successfully configured for %s", self.url)

    def update_run(self, run_id: str, updates: Dict[str, Any]) -> bool:
        """Updates the status and metadata for a run row in the `runs` table."""
        if not self.url or not self.key:
            logger.warning("Supabase credentials missing, skipping update_run for %s", run_id)
            return False

        # Only send columns that actually exist in the runs table
        allowed_columns = {"status", "started_at", "finished_at", "images_ingested", "blanks_removed", "raw_source_path", "error_message"}
        clean_updates = {k: v for k, v in updates.items() if k in allowed_columns}

        endpoint = f"{self.url}/rest/v1/runs?id=eq.{run_id}"
        try:
            res = requests.patch(endpoint, json=clean_updates, headers=self.headers)
            if res.status_code in (200, 204):
                logger.info("Updated run %s: %s", run_id, clean_updates)
                return True
            else:
                logger.error("Failed to update run %s: HTTP %d %s", run_id, res.status_code, res.text)
                return False
        except Exception as e:
            logger.error("Error updating run %s: %s", run_id, e)
            return False

    def get_first_station_id(self) -> Optional[str]:
        """Gets a valid station UUID from the database to link captures.
        Also caches the station's geometry so captures can inherit it.
        """
        if not self.url or not self.key:
            return None
        endpoint = f"{self.url}/rest/v1/stations?select=id,geom&limit=1"
        try:
            res = requests.get(endpoint, headers=self.headers)
            if res.status_code == 200 and res.json():
                row = res.json()[0]
                station_id = row.get("id")
                # Cache geom as WKT for use in capture inserts
                geom = row.get("geom")
                if geom and isinstance(geom, dict) and geom.get("coordinates"):
                    coords = geom["coordinates"]  # [lng, lat]
                    self._station_geom_wkt = f"SRID=4326;POINT({coords[0]} {coords[1]})"
                else:
                    # Pench Tiger Reserve centroid fallback
                    self._station_geom_wkt = "SRID=4326;POINT(79.297 21.728)"
                logger.info("Station geom WKT: %s", self._station_geom_wkt)
                return station_id
        except Exception as e:
            logger.warning("Error fetching station: %s", e)
        return None

    def get_first_individual_id(self) -> Optional[str]:
        """Gets a valid individual UUID from the database to link captures."""
        if not self.url or not self.key:
            return None
        endpoint = f"{self.url}/rest/v1/individuals?select=id&limit=1"
        try:
            res = requests.get(endpoint, headers=self.headers)
            if res.status_code == 200 and res.json():
                return res.json()[0].get("id")
        except Exception as e:
            logger.warning("Error fetching individual: %s", e)
        return None

    def upsert_individual(self, tiger_tag: str) -> Optional[str]:
        """
        Look up an individual by their ML tag (e.g. 'Tiger_001').
        If found, return their UUID. If not found, create a new row and return UUID.
        This ensures each unique tiger from the ML pipeline maps to exactly one
        database record, preventing duplicates across runs.
        """
        if not self.url or not self.key:
            return None

        # Step 1: Try to find existing individual by tag
        endpoint = f"{self.url}/rest/v1/individuals?select=id,tag&tag=eq.{tiger_tag}&limit=1"
        try:
            res = requests.get(endpoint, headers=self.headers)
            if res.status_code == 200:
                rows = res.json()
                if rows and len(rows) > 0:
                    existing_id = rows[0].get("id")
                    logger.info("Found existing individual %s → UUID %s", tiger_tag, existing_id)
                    return existing_id
        except Exception as e:
            logger.warning("Error looking up individual %s: %s", tiger_tag, e)

        # Step 2: Not found — create a new individual row
        now_iso = datetime.utcnow().isoformat()
        # Generate a human-readable name from the tag (Tiger_001 → Tiger 001)
        display_name = tiger_tag.replace("_", " ")
        payload = {
            "tag": tiger_tag,
            "name": display_name,
            "first_seen": now_iso,
            "last_seen": now_iso,
            "sex": "unknown",
            "notes": f"Auto-registered by AI pipeline during batch ingest. Tag: {tiger_tag}.",
        }
        create_endpoint = f"{self.url}/rest/v1/individuals"
        try:
            res = requests.post(create_endpoint, json=payload, headers=self.headers)
            if res.status_code in (200, 201):
                rows = res.json()
                new_id = rows[0].get("id") if isinstance(rows, list) and rows else None
                logger.info("Created new individual %s → UUID %s", tiger_tag, new_id)
                return new_id
            else:
                logger.error("Failed to create individual %s: HTTP %d %s", tiger_tag, res.status_code, res.text)
        except Exception as e:
            logger.error("Error creating individual %s: %s", tiger_tag, e)

        return None

    def update_individual_last_seen(self, individual_uuid: str, timestamp_iso: str) -> bool:
        """Updates the last_seen timestamp for an individual after a new capture."""
        if not self.url or not self.key or not individual_uuid:
            return False
        endpoint = f"{self.url}/rest/v1/individuals?id=eq.{individual_uuid}"
        try:
            res = requests.patch(endpoint, json={"last_seen": timestamp_iso}, headers=self.headers)
            return res.status_code in (200, 204)
        except Exception as e:
            logger.warning("Error updating last_seen for %s: %s", individual_uuid, e)
            return False

    def insert_raw_image(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Inserts a processed image record into the `raw_images` table."""
        if not self.url or not self.key:
            return None

        # Exact schema: id, run_id, station_id, filepath, exif_timestamp, corrected_timestamp, hash, classification, blank_confidence, status
        payload = {
            "run_id": data.get("run_id"),
            "filepath": data.get("filepath") or data.get("file_path", "image.jpg"),
            "status": data.get("status", "kept"),
            "classification": data.get("classification", "animal" if data.get("status") == "kept" else "blank"),
            "blank_confidence": data.get("blank_confidence", 0.95),
            "hash": data.get("hash") or data.get("file_hash", ""),
            "exif_timestamp": data.get("exif_timestamp") or data.get("captured_at") or datetime.utcnow().isoformat(),
        }

        if data.get("station_id"):
            payload["station_id"] = data["station_id"]

        endpoint = f"{self.url}/rest/v1/raw_images"
        try:
            res = requests.post(endpoint, json=payload, headers=self.headers)
            if res.status_code in (200, 201):
                rows = res.json()
                return rows[0] if isinstance(rows, list) and len(rows) > 0 else None
            else:
                logger.warning("Failed to insert raw_image: HTTP %d %s", res.status_code, res.text)
                return None
        except Exception as e:
            logger.warning("Error inserting raw_image: %s", e)
            return None

    def insert_capture(self, data: Dict[str, Any]) -> bool:
        """Inserts a detection/capture record into the `captures` table.
        The captures.geom column is NOT NULL — we always supply a WKT point
        derived from the station's geom (cached during get_first_station_id)
        or falling back to the Pench Tiger Reserve centroid.
        """
        if not self.url or not self.key:
            return False

        # Resolve geom: use cached station geom or custom override or Pench centroid
        geom_wkt = (
            data.get("geom")
            or getattr(self, "_station_geom_wkt", None)
            or "SRID=4326;POINT(79.297 21.728)"
        )

        payload = {
            "run_id": data.get("run_id"),
            "match_confidence": data.get("confidence") or data.get("match_confidence", 0.95),
            "review_status": data.get("review_status", "auto_match"),
            "timestamp": data.get("timestamp") or datetime.utcnow().isoformat(),
            "geom": geom_wkt,
        }

        if data.get("image_id"):
            payload["image_id"] = data["image_id"]
        if data.get("station_id"):
            payload["station_id"] = data["station_id"]
        if data.get("individual_id"):
            payload["individual_id"] = data["individual_id"]

        endpoint = f"{self.url}/rest/v1/captures"
        try:
            res = requests.post(endpoint, json=payload, headers=self.headers)
            if res.status_code in (200, 201):
                return True
            else:
                logger.warning("Failed to insert capture: HTTP %d %s", res.status_code, res.text)
                return False
        except Exception as e:
            logger.warning("Error inserting capture: %s", e)
            return False

    def download_storage_file(self, bucket: str, storage_path: str, save_destination: str) -> bool:
        """Downloads a zip or raw upload file from Supabase Storage."""
        if not self.url or not self.key:
            return False

        endpoint = f"{self.url}/storage/v1/object/{bucket}/{storage_path}"
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}"
        }
        try:
            res = requests.get(endpoint, headers=headers, stream=True)
            if res.status_code == 200:
                os.makedirs(os.path.dirname(save_destination), exist_ok=True)
                with open(save_destination, 'wb') as f:
                    for chunk in res.iter_content(chunk_size=8192):
                        f.write(chunk)
                logger.info("Downloaded storage file to %s", save_destination)
                return True
            else:
                logger.error("Failed to download storage file %s: HTTP %d %s", storage_path, res.status_code, res.text)
                return False
        except Exception as e:
            logger.error("Error downloading storage file %s: %s", storage_path, e)
            return False
