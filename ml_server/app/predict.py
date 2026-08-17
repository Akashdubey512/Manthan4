"""
=====================================================================
ANIMAL vs BLANK CLASSIFIER — INFERENCE SCRIPT
=====================================================================
Loads the trained .keras model and predicts on new images.

Usage:
    python predict.py path/to/image.jpg
    python predict.py path/to/folder_of_images/

Requirements:
    pip install tensorflow pillow numpy
=====================================================================
"""

import os
import sys
import numpy as np
import tensorflow as tf
from tensorflow.keras.utils import load_img, img_to_array

# ---------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------
DEFAULT_MODEL_NAMES = [
    "animal_blank_model_final.keras",
    "animal_blank_model.keras",
    "animal_blank_model.h5",
]

def resolve_model_path():
    app_dir = os.path.dirname(__file__)
    for name in DEFAULT_MODEL_NAMES:
        candidate = os.path.join(app_dir, name)
        if os.path.exists(candidate):
            return candidate
    return os.path.join(app_dir, "animal_blank_model_final.keras")

MODEL_PATH = resolve_model_path()
IMG_SIZE = 224
THRESHOLD = 0.45  # prob >= threshold -> BLANK, else ANIMAL

# class_indices from training: {'animal': 0, 'blank': 1}
# so sigmoid output close to 1 = blank, close to 0 = animal


def load_model(model_path=None):
    """Load the trained model once and reuse it for all predictions."""
    path = model_path or resolve_model_path()
    if not os.path.exists(path):
        raise FileNotFoundError(f"Model file not found at: {path}")
    return tf.keras.models.load_model(path)



def predict_image(model, image_path, threshold=THRESHOLD):
    """Predict a single image. Returns (label, blank_probability)."""
    img = load_img(image_path, target_size=(IMG_SIZE, IMG_SIZE))
    img_array = img_to_array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)

    prob = model.predict(img_array, verbose=0)[0][0]
    label = "BLANK" if prob >= threshold else "ANIMAL"
    return label, float(prob)


def predict_folder(model, folder_path, threshold=THRESHOLD):
    """Predict all images in a folder. Returns list of (filename, label, prob)."""
    files = [
        f for f in os.listdir(folder_path)
        if f.lower().endswith((".jpg", ".jpeg", ".png"))
    ]

    if not files:
        print("No images found in folder.")
        return []

    batch = np.stack([
        img_to_array(load_img(os.path.join(folder_path, f), target_size=(IMG_SIZE, IMG_SIZE))) / 255.0
        for f in files
    ])

    probs = model.predict(batch, verbose=0).ravel()

    results = []
    for f, p in zip(files, probs):
        label = "BLANK" if p >= threshold else "ANIMAL"
        results.append((f, label, float(p)))

    return results


def predict_with_tta(model, image_path, threshold=THRESHOLD):
    """Test-Time Augmentation: averages predictions across flipped/cropped
    variants of the same image for a small accuracy boost."""
    img = load_img(image_path, target_size=(IMG_SIZE, IMG_SIZE))
    base_arr = img_to_array(img) / 255.0

    variants = [base_arr, np.fliplr(base_arr)]

    h, w = base_arr.shape[:2]
    crop = base_arr[int(h * 0.1):int(h * 0.9), int(w * 0.1):int(w * 0.9)]
    crop_resized = tf.image.resize(crop, (IMG_SIZE, IMG_SIZE)).numpy()
    variants.append(crop_resized)

    preds = [model.predict(np.expand_dims(v, 0), verbose=0)[0][0] for v in variants]
    avg_prob = float(np.mean(preds))

    label = "BLANK" if avg_prob >= threshold else "ANIMAL"
    return label, avg_prob


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python predict.py <image_path_or_folder>")
        sys.exit(1)

    target_path = sys.argv[1]
    model = load_model()

    if os.path.isdir(target_path):
        results = predict_folder(model, target_path)
        print(f"\n{'File':<30} {'Prediction':<10} {'Blank Prob':<10}")
        print("-" * 50)
        for filename, label, prob in results:
            print(f"{filename:<30} {label:<10} {prob:.4f}")

    elif os.path.isfile(target_path):
        label, prob = predict_image(model, target_path)
        print(f"Prediction: {label}")
        print(f"Blank probability: {round(prob, 4)}")
        print(f"Animal probability: {round(1 - prob, 4)}")

    else:
        print(f"Path not found: {target_path}")
