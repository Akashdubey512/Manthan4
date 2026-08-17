import os
import io
import numpy as np
from PIL import Image
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.utils import img_to_array

try:
    from sklearn.metrics.pairwise import cosine_similarity
except ImportError:
    # Pure numpy cosine similarity fallback
    def cosine_similarity(a, b):
        a = np.array(a)
        b = np.array(b)
        dot = np.dot(a, b.T)
        norm_a = np.linalg.norm(a, axis=1, keepdims=True)
        norm_b = np.linalg.norm(b, axis=1, keepdims=True)
        return dot / (np.dot(norm_a, norm_b.T) + 1e-8)


class TigerIdentifier:
    """
    Individual Tiger Re-Identification using MobileNetV2 feature embeddings
    and Cosine Similarity clustering / matching.
    """

    def __init__(self, threshold: float = 0.60, image_size: tuple = (224, 224)):
        self.threshold = threshold
        self.image_size = image_size

        print("[INFO] Initializing MobileNetV2 Feature Extractor for Tiger Re-ID...")
        self.feature_model = MobileNetV2(
            weights="imagenet",
            include_top=False,
            pooling="avg",
            input_shape=(224, 224, 3)
        )
        print("[INFO] Tiger Re-ID feature extractor loaded successfully.")

        # In-memory catalogue: { "Tiger_001": [emb1, emb2, ...], "Tiger_002": [...] }
        self.tiger_embeddings = {}
        self.next_tiger_id = 1

    def _load_and_preprocess(self, image_input):
        """Helper to convert path, bytes, or PIL Image into normalized preprocessed tensor."""
        if isinstance(image_input, str):
            img = Image.open(image_input).convert("RGB")
        elif isinstance(image_input, bytes):
            img = Image.open(io.BytesIO(image_input)).convert("RGB")
        elif isinstance(image_input, Image.Image):
            img = image_input.convert("RGB")
        else:
            raise ValueError(f"Unsupported image input type: {type(image_input)}")

        img = img.resize(self.image_size)
        img_array = img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        return preprocess_input(img_array)

    def get_embedding(self, image_input) -> np.ndarray:
        """Extract a 1280-dim L2-normalized feature embedding vector."""
        preprocessed = self._load_and_preprocess(image_input)
        embedding = self.feature_model.predict(preprocessed, verbose=0)[0]
        # L2-normalization for cosine distance
        norm = np.linalg.norm(embedding)
        return embedding / (norm + 1e-8)

    def create_tiger(self, embedding: np.ndarray, custom_id: str = None) -> str:
        """Register a new individual in the database."""
        if custom_id:
            tiger_id = custom_id
        else:
            tiger_id = f"Tiger_{self.next_tiger_id:03d}"
            self.next_tiger_id += 1

        if tiger_id not in self.tiger_embeddings:
            self.tiger_embeddings[tiger_id] = []

        self.tiger_embeddings[tiger_id].append(embedding)
        return tiger_id

    def enroll_tiger(self, image_input, tiger_id: str) -> dict:
        """Explicitly enroll an image for a known tiger ID (e.g., 'T-045' or 'Tiger_001')."""
        embedding = self.get_embedding(image_input)
        self.create_tiger(embedding, custom_id=tiger_id)
        return {
            "tiger_id": tiger_id,
            "total_embeddings": len(self.tiger_embeddings[tiger_id]),
            "status": "enrolled"
        }

    def identify(self, image_input, threshold: float = None) -> dict:
        """
        Identify a tiger against known embeddings catalogue.
        Returns:
            tiger_id: str
            similarity: float (0.0 to 1.0)
            status: 'matched' or 'new_tiger'
            all_scores: dict of top match candidate similarities
        """
        t = threshold if threshold is not None else self.threshold
        embedding = self.get_embedding(image_input)

        # If no tigers exist yet in catalogue, enroll as the first tiger
        if not self.tiger_embeddings:
            tiger_id = self.create_tiger(embedding)
            return {
                "tiger_id": tiger_id,
                "similarity": 1.0,
                "status": "new_tiger",
                "all_scores": {tiger_id: 1.0}
            }

        best_tiger = None
        best_similarity = -1.0
        candidate_scores = {}

        # Compare against all known individuals
        for tiger_id, embeddings in self.tiger_embeddings.items():
            similarities = cosine_similarity([embedding], embeddings)[0]
            max_sim = float(np.max(similarities))
            candidate_scores[tiger_id] = round(max_sim, 4)

            if max_sim > best_similarity:
                best_similarity = max_sim
                best_tiger = tiger_id

        # Sort candidate scores descending
        sorted_scores = dict(sorted(candidate_scores.items(), key=lambda item: item[1], reverse=True))

        if best_similarity >= t:
            # Sighting matched to existing tiger — append new embedding to catalogue
            self.tiger_embeddings[best_tiger].append(embedding)
            return {
                "tiger_id": best_tiger,
                "similarity": round(best_similarity, 4),
                "status": "matched",
                "all_scores": sorted_scores
            }
        else:
            # Novel pattern / unseen tiger — register as new individual
            new_id = self.create_tiger(embedding)
            return {
                "tiger_id": new_id,
                "similarity": round(best_similarity, 4),
                "status": "new_tiger",
                "all_scores": sorted_scores
            }

    def list_known_tigers(self) -> dict:
        """Returns catalogue summary."""
        return {
            "total_individuals": len(self.tiger_embeddings),
            "tigers": {
                tid: len(embs) for tid, embs in self.tiger_embeddings.items()
            }
        }
