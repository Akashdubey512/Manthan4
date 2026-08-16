# Model Choices & Optimization Strategy

This document details the selection of offline-friendly, CPU-optimized model architectures designed to operate reliably in Pench Tiger Reserve field offices without internet or GPU access.

---

## 1. Blank & Subject Detection: MegaDetector v5 / v6
- **Choice**: MegaDetector (Microsoft AI for Earth)
- **Why**: MegaDetector is specifically optimized for camera trap images. It distinguishes between animals, humans, vehicles, and empty frames with high recall.
- **CPU Optimization**: The model is exported to ONNX format, allowing fast CPU inference. Input images are resized to `640x640` dynamically before inference, preserving processing power.

---

## 2. Stripe Pattern Matching: Classical Keypoints (SIFT / ORB) + Geometric Validation (RANSAC)
- **Choice**: Scale-Invariant Feature Transform (SIFT) / Oriented FAST and Rotated BRIEF (ORB)
- **Why**: Deep learning metric embedding models require substantial compute to compare against large catalogues. The classical **HotSpotter** and **Wild-ID** approaches use SIFT pattern extractors coupled with RANSAC geometric verification.
- **Advantages**: 
  - 100% offline and deterministic.
  - Runs in milliseconds on single CPU cores.
  - Highly robust to lighting changes and flank tilt angle variations.

---

## 3. Spatial Analysis: Kernel Density Estimation (KDE) & Minimum Convex Polygon (MCP)
- **Choice**: SciPy Stats KDE + Shapely MCP
- **Why**: Standard home-range telemetry computations are cheap and performant. Using `geopandas` and `scipy`, we generate 95% and 50% utilization contour isopleths directly on standard CPU setups and persist them as GeoJSON features in PostGIS database columns.
