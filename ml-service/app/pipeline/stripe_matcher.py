"""
stripe_matcher.py
=================
Stage C and D — Individual Tiger Identification and Catalogue Enrollment.

Responsibilities:
    - Extract SIFT/ORB features from isolated flank crops.
    - Match query flanks against a catalogue of known individuals.
    - Perform geometric verification (RANSAC).
    - Output IdentificationResult with a confidence-based review status.
    - Dynamically enroll new individuals when confidence is low.
"""

import cv2
import numpy as np
import logging
import os
from pathlib import Path
from typing import Optional

from app.schemas import TigerCropResult, IdentificationResult, ReviewStatus

logger = logging.getLogger(__name__)

class StripeMatcher:
    """
    Performs individual tiger identification using SIFT keypoint matching.
    """
    def __init__(
        self,
        catalogue_dir: str,
        high_confidence_threshold: int = 40,
        medium_confidence_threshold: int = 15,
    ) -> None:
        """
        Parameters
        ----------
        catalogue_dir : str
            Directory containing subdirectories for each known tiger (e.g. TGR001/, TGR002/).
            Reference flanks are stored in these subdirectories.
        high_confidence_threshold : int
            Minimum number of inlier matches (post-RANSAC) to auto-match.
        medium_confidence_threshold : int
            Minimum number of inlier matches for human review. Below this, enroll as new.
        """
        self.catalogue_dir = Path(catalogue_dir)
        self.catalogue_dir.mkdir(parents=True, exist_ok=True)
        self.high_thr = high_confidence_threshold
        self.medium_thr = medium_confidence_threshold
        
        # Initialize SIFT detector and FLANN matcher
        self.sift = cv2.SIFT_create()
        FLANN_INDEX_KDTREE = 1
        index_params = dict(algorithm=FLANN_INDEX_KDTREE, trees=5)
        search_params = dict(checks=50)
        self.matcher = cv2.FlannBasedMatcher(index_params, search_params)
        
        self.catalogue_features = {} # Dict[tiger_id, List[Tuple[kp, des]]]
        self._load_catalogue()

    def _load_catalogue(self):
        """Pre-computes SIFT features for all reference images in the catalogue."""
        logger.info("Loading reference catalogue from %s...", self.catalogue_dir)
        for tiger_dir in self.catalogue_dir.iterdir():
            if not tiger_dir.is_dir():
                continue
            tiger_id = tiger_dir.name
            self.catalogue_features[tiger_id] = []
            
            for img_path in tiger_dir.glob("*.jpg"):
                img = cv2.imread(str(img_path), cv2.IMREAD_GRAYSCALE)
                if img is None:
                    continue
                kp, des = self.sift.detectAndCompute(img, None)
                if des is not None:
                    self.catalogue_features[tiger_id].append((kp, des))
        logger.info("Loaded features for %d known individuals.", len(self.catalogue_features))

    def _extract_features(self, image_path: str):
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            raise ValueError(f"Could not read image: {image_path}")
        return self.sift.detectAndCompute(img, None)

    def _match_descriptors(self, des1, des2):
        """Matches two sets of descriptors and returns number of inliers."""
        if des1 is None or des2 is None or len(des1) < 2 or len(des2) < 2:
            return 0, []
            
        matches = self.matcher.knnMatch(des1, des2, k=2)
        
        # Lowe's ratio test
        good_matches = []
        for m_n in matches:
            if len(m_n) != 2:
                continue
            m, n = m_n
            if m.distance < 0.7 * n.distance:
                good_matches.append(m)
                
        return good_matches

    def _geometric_verification(self, kp1, kp2, good_matches):
        if len(good_matches) < 4:
            return 0
            
        pts1 = np.float32([kp1[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)
        pts2 = np.float32([kp2[m.trainIdx].pt for m in good_matches]).reshape(-1, 1, 2)
        
        # Find homography using RANSAC
        _, mask = cv2.findHomography(pts1, pts2, cv2.RANSAC, 5.0)
        if mask is None:
            return 0
        return int(np.sum(mask))

    def _generate_new_tiger_id(self) -> str:
        """Generates the next available tiger ID, e.g. TGR001."""
        existing_ids = [d.name for d in self.catalogue_dir.iterdir() if d.is_dir() and d.name.startswith("TGR")]
        if not existing_ids:
            return "TGR001"
        
        max_num = 0
        for tid in existing_ids:
            try:
                num = int(tid.replace("TGR", ""))
                max_num = max(max_num, num)
            except ValueError:
                pass
        return f"TGR{max_num + 1:03d}"

    def enroll_new_individual(self, tiger_id: str, flank_img_path: str):
        """Saves a new reference flank to the catalogue."""
        tiger_dir = self.catalogue_dir / tiger_id
        tiger_dir.mkdir(parents=True, exist_ok=True)
        
        import shutil
        dest_path = tiger_dir / Path(flank_img_path).name
        shutil.copy2(flank_img_path, dest_path)
        
        # Update features in memory
        kp, des = self._extract_features(str(dest_path))
        if des is not None:
            if tiger_id not in self.catalogue_features:
                self.catalogue_features[tiger_id] = []
            self.catalogue_features[tiger_id].append((kp, des))
            logger.info("Enrolled %s into catalogue.", tiger_id)

    def identify(self, flank_result: TigerCropResult) -> IdentificationResult:
        """
        Runs the identification pipeline for a given flank.
        """
        if not flank_result.crop_file_path or not Path(flank_result.crop_file_path).exists():
            raise FileNotFoundError("Flank image is missing.")
            
        kp_query, des_query = self._extract_features(flank_result.crop_file_path)
        
        best_match_id = None
        best_inliers = 0
        
        if des_query is not None:
            for tiger_id, references in self.catalogue_features.items():
                max_inliers_for_tiger = 0
                for kp_ref, des_ref in references:
                    good_matches = self._match_descriptors(des_query, des_ref)
                    inliers = self._geometric_verification(kp_query, kp_ref, good_matches)
                    if inliers > max_inliers_for_tiger:
                        max_inliers_for_tiger = inliers
                        
                if max_inliers_for_tiger > best_inliers:
                    best_inliers = max_inliers_for_tiger
                    best_match_id = tiger_id

        # Evaluate Confidence
        if best_inliers >= self.high_thr:
            status = ReviewStatus.auto_match
            final_id = best_match_id
            # Confidence maps 40+ inliers to ~0.90+
            confidence = min(0.85 + (best_inliers - self.high_thr) * 0.005, 1.0)
            
        elif best_inliers >= self.medium_thr:
            status = ReviewStatus.human_review
            final_id = best_match_id
            confidence = 0.5 + (best_inliers - self.medium_thr) / (self.high_thr - self.medium_thr) * 0.35
            
        else:
            status = ReviewStatus.new_individual
            final_id = self._generate_new_tiger_id()
            confidence = 0.95 # Confident it is a new individual
            self.enroll_new_individual(final_id, flank_result.crop_file_path)
            
        logger.info("Identify Result: %s | Status: %s | Inliers: %d", final_id, status.value, best_inliers)

        return IdentificationResult(
            **flank_result.model_dump(),
            tiger_id=final_id,
            match_confidence=confidence,
            review_status=status,
            matched_features_count=best_inliers
        )
