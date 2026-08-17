"""
db_writer.py
============
Direct Supabase Database & Storage integration for Python ML Server.
Communicates via Supabase REST API & Storage API using SUPABASE_SERVICE_ROLE_KEY.
"""

import os
import requests
import logging
from datetime import datetime
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class SupabaseClient:
    def __init__(self, url: Optional[str] = None, key: Optional[str] = None):
        self.url = (url or os.getenv("SUPABASE_URL", "")).rstrip('/')
        self.key = key or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        self.headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

    def update_run(self, run_id: str, updates: Dict[str, Any]) -> bool:
        """Updates the status and metadata for a run row in the `runs` table."""
        if not self.url or not self.key:
            logger.warning("Supabase credentials missing, skipping update_run for %s", run_id)
            return False

        endpoint = f"{self.url}/rest/v1/runs?id=eq.{run_id}"
        try:
            res = requests.patch(endpoint, json=updates, headers=self.headers)
            if res.status_code in (200, 204):
                logger.info("Updated run %s: %s", run_id, updates)
                return True
            else:
                logger.error("Failed to update run %s: HTTP %d %s", run_id, res.status_code, res.text)
                return False
        except Exception as e:
            logger.error("Error updating run %s: %s", run_id, e)
            return False

    def insert_raw_image(self, data: Dict[str, Any]) -> bool:
        """Inserts a processed image record into the `raw_images` table."""
        if not self.url or not self.key:
            return False

        endpoint = f"{self.url}/rest/v1/raw_images"
        try:
            res = requests.post(endpoint, json=data, headers=self.headers)
            if res.status_code in (200, 201):
                return True
            else:
                logger.error("Failed to insert raw_image: HTTP %d %s", res.status_code, res.text)
                return False
        except Exception as e:
            logger.error("Error inserting raw_image: %s", e)
            return False

    def insert_capture(self, data: Dict[str, Any]) -> bool:
        """Inserts a detection/capture record into the `captures` table."""
        if not self.url or not self.key:
            return False

        endpoint = f"{self.url}/rest/v1/captures"
        try:
            res = requests.post(endpoint, json=data, headers=self.headers)
            if res.status_code in (200, 201):
                return True
            else:
                logger.error("Failed to insert capture: HTTP %d %s", res.status_code, res.text)
                return False
        except Exception as e:
            logger.error("Error inserting capture: %s", e)
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
