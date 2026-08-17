import os
import numpy as np
from PIL import Image
from ..predict import load_model, predict_image, THRESHOLD, IMG_SIZE
# pyrefly: ignore [missing-import]
from tensorflow.keras.utils import img_to_array

try:
    # pyrefly: ignore [missing-import]
    import cv2
except ImportError:
    cv2 = None


class BlankDetector:
    def __init__(self, threshold=THRESHOLD):
        self.threshold = threshold
        try:
            self.model = load_model()
            print("[INFO] MobileNetV2 Blank Detector model loaded successfully.")
        except Exception as e:
            print(f"[WARN] Could not load model: {e}")
            self.model = None


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

    def detect_subject(self, image_input):
        """
        Detects whether an image contains an animal or is blank.
        Accepts:
            image_input: file path (str) OR PIL Image object
        Returns:
            dict with { has_subject: bool, is_blank: bool, blank_confidence: float, animal_confidence: float, prediction: str }
        """
        if self.model is None:
            # Fallback if model could not be loaded
            return {
                "has_subject": True,
                "is_blank": False,
                "blank_confidence": 0.0,
                "animal_confidence": 1.0,
                "prediction": "UNKNOWN"
            }

        try:
            if isinstance(image_input, str):
                label, prob = predict_image(self.model, image_input, threshold=self.threshold)
            else:
                img = image_input.convert("RGB").resize((IMG_SIZE, IMG_SIZE))
                img_array = img_to_array(img) / 255.0
                img_array = np.expand_dims(img_array, axis=0)
                prob = float(self.model.predict(img_array, verbose=0)[0][0])
                label = "BLANK" if prob >= self.threshold else "ANIMAL"

            is_blank = (label == "BLANK")
            return {
                "has_subject": not is_blank,
                "is_blank": is_blank,
                "blank_confidence": round(prob, 4),
                "animal_confidence": round(1.0 - prob, 4),
                "prediction": label
            }
        except Exception as e:
            print(f"Error in detect_subject: {e}")
            return {
                "has_subject": False,
                "is_blank": True,
                "blank_confidence": 1.0,
                "animal_confidence": 0.0,
                "error": str(e)
            }

