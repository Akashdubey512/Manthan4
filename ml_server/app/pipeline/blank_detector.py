import cv2
import numpy as np
from PIL import Image

class BlankDetector:
    def __init__(self, confidence_threshold=0.3):
        self.confidence_threshold = confidence_threshold
        # Pretrained weight paths will be cached local in model_store

    def frame_difference_check(self, image_path_1, image_path_2, threshold=25):
        """
        Simple motion detection fallback: compares two sequential images from the same camera.
        Returns percentage area changed.
        """
        img1 = cv2.imread(image_path_1, cv2.IMREAD_GRAYSCALE)
        img2 = cv2.imread(image_path_2, cv2.IMREAD_GRAYSCALE)
        
        if img1 is None or img2 is None:
            return 0.0
            
        # Resize to common small size for fast diff
        img1 = cv2.resize(img1, (640, 480))
        img2 = cv2.resize(img2, (640, 480))
        
        diff = cv2.absdiff(img1, img2)
        _, thresh = cv2.threshold(diff, threshold, 255, cv2.THRESH_BINARY)
        non_zero_ratio = np.sum(thresh == 255) / thresh.size
        return float(non_zero_ratio)

    def detect_subject(self, image_path):
        """
        Stub for MegaDetector / motion detector.
        Returns:
            has_subject: bool
            confidence: float
            bbox: list of [ymin, xmin, ymax, xmax]
        """
        # Placeholder for MegaDetector v5/v6 weights inference
        # In mock mode, we look for non-uniform image statistics
        try:
            with Image.open(image_path) as img:
                entropy = img.entropy()
                # Dummy metric: lower entropy is more likely blank
                if entropy < 4.0:
                    return False, 0.15, []
                else:
                    return True, 0.85, [0.2, 0.2, 0.8, 0.8]
        except Exception:
            return False, 0.0, []
