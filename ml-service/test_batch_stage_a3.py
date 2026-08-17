"""
Stage A.3 — End-to-End Tiger Gate Evaluation  (v3 — flat-dataset follow-up)
============================================================================
Runs MegaDetector + SpeciesNet over the flat `sample_data/dataset/` folder.

CRITICAL DESIGN NOTE (unchanged since v1):
    Ground-truth species labels are for EVALUATION ONLY. They are NEVER
    passed to the inference engine. The model receives only image pixels.
    Only AFTER prediction do we compare predicted label vs ground truth.

WHAT CHANGED IN v3 AND WHY
---------------------------
The dataset on disk changed shape since v2. `sample_data/` no longer
contains per-species folders (`panthera_tigris/`, `panthera_leo/`, ...).
It now looks like this (confirmed by direct inspection):

    sample_data/
    +-- dataset/            <- 1,376 flat image files, ONLY inference input.
    |                          No subfolders. Two filename conventions mixed:
    |                          4-digit stems (0000.jpg .. 1999.jpg) and
    |                          UUID-style stems (5858bf2b-...jpg). Nothing in
    |                          any filename or path indicates species.
    +-- tiger_crops/        <- OUTPUT ONLY. Never scanned as input.
    +-- batch_results.csv, stage_a3_*.csv   <- OUTPUT ONLY (prior runs).

This means every structural assumption in v2 is gone:
  - There is no `CLASSES` folder-name -> species-label mapping to iterate.
  - There is no per-class image count, so the old "800-balanced vs 840-full"
    (MAX_PER_CLASS_BALANCED) comparison is meaningless and has been REMOVED.
  - Ground truth can no longer be attached to an image by folder membership
    at scan time. It must come from a completely separate, post-hoc join
    against a ground-truth manifest, run strictly AFTER inference.

v3 implements that separation explicitly, as two physically distinct
phases (see PHASE 1 / PHASE 2 below), plus a mandatory collision check on
the manifest join key before any join is performed (see "MANIFEST JOIN
SAFETY" below) — this was flagged as a hard prerequisite before writing any
join logic, and the check *did* find a serious problem: see the numbers
below, captured directly from `wcs_stage_a_manifest.csv`.

INPUT ROOT
----------
Sole runtime input directory: `sample_data/dataset/`. Scanned NON-
RECURSIVELY. Files are matched by extension only (`.jpg`, `.jpeg`, `.png`,
case-insensitive) — species/category is never inferred from a filename or
path. `sample_data/` itself is never scanned, which automatically excludes
`tiger_crops/` and all `*.csv` output files without needing explicit
exclusion rules.

MANIFEST JOIN SAFETY  (mandatory check performed before any join)
-------------------------------------------------------------------
`wcs_stage_a_manifest.csv` is the sole authoritative ground-truth source
(per explicit instruction; the three smaller manifest CSVs
`wcs_stage_a_balanced_manifest.csv`, `wcs_stage_a_200_balanced_manifest.csv`,
`wcs_stage_a_200_missing.csv` are historical subset artifacts and are NOT
read by this script).

The manifest's `file_name` column is a nested path
(`animals/0399/1925.jpg`); the flat dataset only has the basename
(`1925.jpg`). A basename join is only safe where `Path(file_name).name` is
unique across the manifest.

Collision check result, run directly against the manifest
(1,284 rows, 976 unique basenames):

    duplicate basenames total ......... 253
      same-category duplicates ........  48   (label unambiguous; only the
                                                specific seq/location record
                                                picked is arbitrary)
      CROSS-CATEGORY duplicates ....... 205   (the species label ITSELF is
                                                ambiguous from basename alone)

Example of a cross-category collision (this is a real manifest row, not a
hypothetical): `1586.jpg` appears as BOTH `animals/0325/1586.jpg`
(panthera tigris) AND `animals/0192/1586.jpg` (panthera leo). Flattening
destroyed the `animals/XXXX/` directory information that would disambiguate
these, and no other stable identifier survives in the flat dataset
filename. There is therefore no safe way to recover the correct label for
these 205 basenames from the flat dataset alone.

Per instruction, this script does NOT guess. `load_manifest()` partitions
the manifest into:
  - a "safe" basename -> category map, containing only the 723 manifest
    entries whose basename is globally unique, and
  - an "ambiguous" set of the 253 colliding basenames, which is reported
    and explicitly EXCLUDED from the ground-truth join rather than
    resolved by picking one arbitrarily.
This is reported both to stdout and to `manifest_basename_collisions.csv`
(written next to the other Stage-A3 output CSVs) so the exclusion is
auditable, not silent.

PHASE SEPARATION  (absolute; enforced structurally, not just by convention)
-----------------------------------------------------------------------------
    PHASE 1 -- INFERENCE
        sample_data/dataset/*.{jpg,jpeg,png}  (all 1,376 files currently
                                                present; no cap, no class
                                                balancing -- there are no
                                                classes to balance)
                -> MegaDetector -> SpeciesNet -> prediction rows
        NO GROUND TRUTH IS READ, IMPORTED, OR REFERENCED IN THIS PHASE.
        `process_image()` and `run_pass()` take no ground-truth parameter
        and the per-image result dataclass (`ImageResult`) has no
        ground-truth field.

    PHASE 2 -- EVALUATION
        prediction rows + wcs_stage_a_manifest.csv (safe subset only)
                -> join on Path(source_file).name
                -> metrics, reported separately from Phase 1
        This phase is a distinct function (`evaluate_predictions()`),
        called only after a full Phase-1 pass has completed, and its
        output never feeds back into any inference call.

Per evaluation, three buckets are always reported (never silently
collapsed into one another):
    dataset images found   : 1,376 (all files under sample_data/dataset/)
    manifest matches       : images whose basename hit the SAFE manifest map
    ambiguous (excluded)   : images whose basename hit a colliding manifest
                              entry -- label unknown, excluded from metrics
    unmatched               : images with no manifest entry at all -- these
                              are legitimate flat-dataset images with no
                              ground truth available; not silently discarded,
                              just not scored.

WHAT CARRIED OVER UNCHANGED FROM v2
-------------------------------------
  [Finding 1 fix / DETECTION_MODE]
    "all" (default, mirrors production: every animal detection is
    classified; image is predicted-tiger if ANY detection gates tiger) vs
    "best" (old buggy single-highest-confidence-detection behaviour, kept
    only for side-by-side comparison). Unchanged from v2, now iterates the
    flat file list instead of the per-class dict.

  [Q2 components="all" vs components="classifier"]
    Unchanged mechanism (`run_classifier_components_comparison`), now
    iterating the flat file list. Ground truth is optionally attached to
    the output CSV via the same post-hoc safe-basename join used in
    PHASE 2, purely for downstream readability -- it is looked up only
    AFTER both classifier variants have already produced their labels for
    that image, so it still never touches inference.

  [det_conf_thres pass-through bug / SweepAwareTigerDetector]
    Unchanged. TigerDetector.detect() calls
    `self._model.single_image_detection(source)` without `det_conf_thres`,
    so PytorchWildlife's own default (0.2) silently overrides
    `TigerDetector(confidence_threshold=...)` below that value.
    `SweepAwareTigerDetector` patches this locally, for evaluation
    purposes only, without touching flank_extractor.py.

  [Q3 / Re-ID auto-enrollment]
    stripe_matcher.py is still not imported, modified, or exercised here.
    Stage C remains out of scope for this pass.

WHAT WAS REMOVED FROM v2
----------------------------
  - `CLASSES` folder-name -> species-label dict (no folders exist anymore).
  - `MAX_PER_CLASS_BALANCED` and the entire "800-balanced vs 840-full"
    (Q1) comparison block -- there is no "per class" concept left to cap
    or compare against. If a quick-smoke-test subset is ever wanted again,
    that would be a new, explicitly class-agnostic `MAX_IMAGES` toggle
    (see below) -- added here, OFF by default (processes all 1,376).
  - `folder_name` / `gt_label` parameters from `process_image()`,
    `build_record()`, and `run_pass()` -- ground truth cannot be known at
    inference time anymore and must not be threaded through these calls.
  - `media_id` no longer embeds a folder or species name (it was
    `f"{folder_name}__{img_path.stem}"`); it is now just `img_path.stem`,
    since flat-dataset filenames are already unique on disk.

Metrics reported per configuration (evaluated/matched subset only):
    Total images, Animal detected, Detection recall, Predicted tiger/
    non-tiger/uncertain, Correct/False tiger gate, End-to-end recall,
    SpeciesNet calls, elapsed time -- plus the three-bucket manifest-match
    breakdown described above.
"""

from __future__ import annotations

import csv
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Literal, Optional

sys.path.insert(0, ".")

from app.schemas import UpstreamAnimalRecord
from app.pipeline.flank_extractor import TigerDetector, SpeciesClassifier

# ---------------------------------------------------------------------------
# Dataset / manifest configuration
# ---------------------------------------------------------------------------

REPO_ROOT = Path(r"C:\Users\VIVEK\OneDrive\Desktop\MANTHAN\Manthan4")

# Sole runtime input directory. Scanned NON-RECURSIVELY. Never `sample_data/`
# itself -- that would risk picking up tiger_crops/ or *.csv output files.
DATASET_ROOT = REPO_ROOT / "sample_data" / "dataset"

# CSVs are written next to the dataset, as before (sample_data/, not
# sample_data/dataset/ -- keeps output out of the scanned input root).
OUTPUT_DIR = REPO_ROOT / "sample_data"

# Sole authoritative ground-truth manifest. The smaller manifest CSVs
# (wcs_stage_a_balanced_manifest.csv, wcs_stage_a_200_balanced_manifest.csv,
# wcs_stage_a_200_missing.csv) are historical subset artifacts and are
# intentionally NOT read by this script.
MANIFEST_PATH = REPO_ROOT / "wcs_stage_a_manifest.csv"

# Case-insensitive; species is never inferred from filename/path.
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}

# manifest `category` -> internal ground-truth label used in reports.
# Unknown categories fall back to the raw category string (never crash).
CATEGORY_LABEL_MAP = {
    "panthera tigris": "tiger",
    "panthera leo": "lion",
    "panthera pardus": "leopard",
    "panthera onca": "jaguar",
}

TIGER_THRESHOLD = 0.85
UNCERTAIN_THRESHOLD = 0.50

# The threshold sweep. Current production ("documented") value is 0.15 --
# see the det_conf_thres note above for why that has not actually been in
# effect in production.
SWEEP_THRESHOLDS = [0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.40, 0.50]
BASELINE_THRESHOLD = 0.15  # used for the baseline run and the Q2 comparison

# Class-agnostic smoke-test toggle (NEW in v3, replaces the old
# per-class MAX_PER_CLASS_BALANCED cap, which no longer makes sense with a
# flat folder). None = process all images currently in DATASET_ROOT (1,376
# at time of writing). Set to an int to cap the run for a quick smoke test;
# the cap applies to the flat file list directly, with no class-balancing
# semantics of any kind.
MAX_IMAGES: Optional[int] = None

# ---------------------------------------------------------------------------
# Run toggles -- flip these to control what this execution does.
# Running everything in one go on CPU will be slow (SpeciesNet ~0.3-0.5s per
# crop per the audit doc); toggle off what you don't need for a given run.
# ---------------------------------------------------------------------------

RUN_BASELINE = True                     # full-dataset baseline @ BASELINE_THRESHOLD
RUN_DETECTION_MODE_COMPARISON = True    # Finding 1 fix, "all" vs "best"
RUN_THRESHOLD_SWEEP = True              # MegaDetector threshold sweep, mode="all"
RUN_CLASSIFIER_COMPONENTS_COMPARISON = True  # Q2, at BASELINE_THRESHOLD


# ---------------------------------------------------------------------------
# Fix for the det_conf_thres bug (see NEW FINDING above).
# This subclass does NOT touch flank_extractor.py. It only ensures that,
# for the purposes of THIS evaluation script, MegaDetector's own internal
# call actually receives the threshold we think we're testing.
# ---------------------------------------------------------------------------

class SweepAwareTigerDetector(TigerDetector):
    """TigerDetector with the det_conf_thres pass-through bug fixed locally.

    Production flank_extractor.py is intentionally left untouched (see
    module docstring). This subclass monkeypatches only the loaded model
    instance's `single_image_detection` bound method so that
    `det_conf_thres` defaults to `self.confidence_threshold` instead of
    PytorchWildlife's hard-coded 0.2. `self.confidence_threshold` can be
    mutated between calls (e.g. across a threshold sweep) without
    reloading the model, since the patched wrapper reads it dynamically
    at call time.
    """

    def detect(self, record: UpstreamAnimalRecord):
        self._load_model()
        if not getattr(self, "_sweep_patched", False):
            original_fn = self._model.single_image_detection

            def patched(source, *args, **kwargs):
                kwargs.setdefault("det_conf_thres", self.confidence_threshold)
                return original_fn(source, *args, **kwargs)

            self._model.single_image_detection = patched
            self._sweep_patched = True
        return super().detect(record)


# ---------------------------------------------------------------------------
# Dataset enumeration -- flat, non-recursive, no species anywhere in scan.
# ---------------------------------------------------------------------------

def list_dataset_images(max_images: Optional[int] = None) -> list[Path]:
    """Non-recursive listing of every image file directly under
    DATASET_ROOT, matched by extension only. Never recurses into
    subfolders (there are none in the current dataset, but this must not
    assume that stays true), and never scans DATASET_ROOT.parent, which
    would risk pulling in tiger_crops/ or *.csv output files.
    """
    if not DATASET_ROOT.is_dir():
        raise FileNotFoundError(f"Dataset root not found: {DATASET_ROOT}")

    images = sorted(
        p for p in DATASET_ROOT.iterdir()
        if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS
    )
    if max_images is not None:
        images = images[:max_images]
    return images


# ---------------------------------------------------------------------------
# Manifest loading + mandatory collision check (see module docstring).
# ---------------------------------------------------------------------------

@dataclass
class ManifestJoinTable:
    safe_basename_to_label: dict[str, str]       # join-safe: unique basenames only
    ambiguous_basenames: dict[str, list[str]]     # basename -> list of distinct categories seen
    total_manifest_rows: int
    unique_basenames: int


def load_manifest(path: Path) -> ManifestJoinTable:
    """Loads the authoritative manifest and partitions it into a join-safe
    basename->label map and a reported (never-guessed) ambiguous set.

    A basename is safe to join on only if it is globally unique across the
    manifest. Where a basename collides across DIFFERENT categories, the
    ground-truth label itself is ambiguous from basename alone (the
    animals/XXXX/ directory that would disambiguate it was destroyed by
    flattening) -- these are never arbitrarily resolved to one category.
    Where a basename collides within the SAME category, the label is not
    ambiguous, but which specific manifest row (seq_id/location) it
    corresponds to is -- these are also treated as ambiguous and excluded,
    since this script only ever needs the label, and picking one row
    arbitrarily is exactly the "guessing" behaviour that was ruled out.
    """
    if not path.is_file():
        raise FileNotFoundError(f"Manifest not found: {path}")

    basename_categories: dict[str, list[str]] = {}
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    for row in rows:
        bn = Path(row["file_name"]).name
        basename_categories.setdefault(bn, []).append(row["category"])

    safe_map: dict[str, str] = {}
    ambiguous: dict[str, list[str]] = {}
    for bn, cats in basename_categories.items():
        if len(cats) == 1:
            category = cats[0]
            label = CATEGORY_LABEL_MAP.get(category, category)
            safe_map[bn] = label
        else:
            ambiguous[bn] = cats

    return ManifestJoinTable(
        safe_basename_to_label=safe_map,
        ambiguous_basenames=ambiguous,
        total_manifest_rows=len(rows),
        unique_basenames=len(basename_categories),
    )


def report_manifest_collisions(table: ManifestJoinTable) -> None:
    same_cat = sum(1 for cats in table.ambiguous_basenames.values() if len(set(cats)) == 1)
    cross_cat = len(table.ambiguous_basenames) - same_cat

    print(f"\n{'=' * 78}\nMANIFEST JOIN SAFETY CHECK ({MANIFEST_PATH.name})\n{'=' * 78}")
    print(f"Manifest rows total       : {table.total_manifest_rows}")
    print(f"Unique basenames          : {table.unique_basenames}")
    print(f"Join-safe basenames       : {len(table.safe_basename_to_label)}")
    print(f"Ambiguous basenames       : {len(table.ambiguous_basenames)}")
    print(f"  same-category collisions:  {same_cat}  (label unambiguous, row choice is not)")
    print(f"  CROSS-CATEGORY collisions: {cross_cat}  (label itself is ambiguous)")
    print("Ambiguous basenames are EXCLUDED from the ground-truth join, not resolved by")
    print("guessing. Full list written to manifest_basename_collisions.csv.")

    collisions_path = OUTPUT_DIR / "manifest_basename_collisions.csv"
    with open(collisions_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["basename", "num_manifest_entries", "categories_seen", "same_category"])
        for bn, cats in sorted(table.ambiguous_basenames.items()):
            writer.writerow([bn, len(cats), ";".join(cats), len(set(cats)) == 1])
    print(f"CSV saved to: {collisions_path}")


# ---------------------------------------------------------------------------
# PHASE 1 -- INFERENCE. No ground truth is read, imported, or referenced
# anywhere below this line until evaluate_predictions() (PHASE 2).
# ---------------------------------------------------------------------------

@dataclass
class ImageResult:
    media_id: str
    source_file: str
    animal_detected: bool = False
    num_detections: int = 0
    species_net_calls: int = 0
    image_label: str = "no_detect"  # "tiger" | "non_tiger" | "uncertain" | "no_detect" | "error"
    error: Optional[str] = None
    per_detection: list[tuple] = field(default_factory=list)  # (conf, label, sp_conf)


def build_record(media_id: str, img_path: Path) -> UpstreamAnimalRecord:
    return UpstreamAnimalRecord(
        media_id=media_id,
        source_file=str(img_path),
        station_id="ST_EVAL",
        timestamp=datetime.now(),
        animal_detected=True,
        animal_confidence=0.99,
    )


def aggregate_image_label(per_detection_labels: list[str]) -> str:
    """Mirrors production semantics: an image is 'tiger' if ANY detection
    gates tiger; 'uncertain' if none is tiger but any is uncertain;
    otherwise 'non_tiger'. Empty list -> handled by caller as 'no_detect'."""
    if any(lbl == "tiger" for lbl in per_detection_labels):
        return "tiger"
    if any(lbl == "uncertain" for lbl in per_detection_labels):
        return "uncertain"
    return "non_tiger"


def process_image(
    img_path: Path,
    detector,
    classifier: SpeciesClassifier,
    detection_mode: Literal["all", "best"],
) -> ImageResult:
    """Pure inference on a single image. Takes no ground-truth input of any
    kind -- there is no folder_name/gt_label parameter, unlike v2."""
    media_id = img_path.stem
    result = ImageResult(media_id=media_id, source_file=str(img_path))
    record = build_record(media_id, img_path)

    try:
        det_result = detector.detect(record)
        animal_dets = det_result.animal_detections

        if detection_mode == "best" and animal_dets:
            animal_dets = [max(animal_dets, key=lambda d: d.confidence)]

        if not animal_dets:
            result.image_label = "no_detect"
            return result

        result.animal_detected = True
        result.num_detections = len(animal_dets)

        per_det_labels = []
        for det in animal_dets:
            sp_result = classifier.classify(det, str(img_path), record)
            result.species_net_calls += 1
            per_det_labels.append(sp_result.species_label.value)
            result.per_detection.append(
                (det.confidence, sp_result.species_label.value, sp_result.species_confidence)
            )

        result.image_label = aggregate_image_label(per_det_labels)

    except Exception as exc:
        result.error = str(exc)
        result.image_label = "error"

    return result


def run_pass(
    images: list[Path],
    detector,
    classifier: SpeciesClassifier,
    detection_mode: Literal["all", "best"],
) -> list[ImageResult]:
    """PHASE 1 entry point: pure inference over the flat image list. No
    ground truth is consulted here."""
    return [process_image(img_path, detector, classifier, detection_mode) for img_path in images]


def write_inference_csv(results: list[ImageResult], path: Path) -> None:
    """Writes the PHASE-1-only inference output. Deliberately has no
    ground-truth column -- that would blur the inference/evaluation
    boundary this script exists to enforce."""
    fields = ["media_id", "source_file", "animal_detected", "num_detections",
              "species_net_calls", "image_label", "error"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for r in results:
            writer.writerow({k: getattr(r, k) for k in fields})
    print(f"CSV saved to: {path}")


# ---------------------------------------------------------------------------
# PHASE 2 -- EVALUATION. Ground truth is joined in here, strictly after
# Phase 1 inference has already produced `results`. Nothing below feeds
# back into any inference call.
# ---------------------------------------------------------------------------

@dataclass
class EvalRow:
    media_id: str
    source_file: str
    image_label: str
    match_status: str  # "matched" | "ambiguous_excluded" | "no_manifest_entry"
    ground_truth: Optional[str] = None
    is_correct_gating: Optional[bool] = None


def evaluate_predictions(
    results: list[ImageResult],
    manifest: ManifestJoinTable,
) -> list[EvalRow]:
    rows: list[EvalRow] = []
    for r in results:
        bn = Path(r.source_file).name
        if bn in manifest.safe_basename_to_label:
            gt = manifest.safe_basename_to_label[bn]
            if gt == "tiger":
                correct = (r.image_label == "tiger")
            else:
                correct = (r.image_label == "non_tiger")
            rows.append(EvalRow(r.media_id, r.source_file, r.image_label,
                                 "matched", ground_truth=gt, is_correct_gating=correct))
        elif bn in manifest.ambiguous_basenames:
            rows.append(EvalRow(r.media_id, r.source_file, r.image_label, "ambiguous_excluded"))
        else:
            rows.append(EvalRow(r.media_id, r.source_file, r.image_label, "no_manifest_entry"))
    return rows


def summarize_evaluation(eval_rows: list[EvalRow], label: str) -> dict:
    matched = [r for r in eval_rows if r.match_status == "matched"]
    ambiguous = [r for r in eval_rows if r.match_status == "ambiguous_excluded"]
    unmatched = [r for r in eval_rows if r.match_status == "no_manifest_entry"]

    print(f"\n{'=' * 78}\n{label}\n{'=' * 78}")
    print(f"dataset images found : {len(eval_rows)}")
    print(f"manifest matches     : {len(matched)}")
    print(f"ambiguous (excluded) : {len(ambiguous)}")
    print(f"unmatched            : {len(unmatched)}")

    by_class: dict[str, list[EvalRow]] = {}
    for r in matched:
        by_class.setdefault(r.ground_truth, []).append(r)

    header = (f"{'Class':<10} {'Total':>6} {'Tiger':>6} {'NonTgr':>6} {'Uncert':>6} "
              f"{'NoDet':>6} {'Correct':>7} {'False':>6} {'E2E':>7}")
    print(header)
    print("-" * len(header))

    totals = {"total": 0, "correct": 0, "false": 0}
    for gt_label in sorted(by_class.keys()):
        items = by_class[gt_label]
        total = len(items)
        tiger_ct = sum(1 for r in items if r.image_label == "tiger")
        nontgr_ct = sum(1 for r in items if r.image_label == "non_tiger")
        uncert_ct = sum(1 for r in items if r.image_label == "uncertain")
        nodet_ct = sum(1 for r in items if r.image_label == "no_detect")
        correct = sum(1 for r in items if r.is_correct_gating)
        false_g = total - correct
        e2e = correct / total if total else 0.0

        print(f"{gt_label:<10} {total:>6} {tiger_ct:>6} {nontgr_ct:>6} {uncert_ct:>6} "
              f"{nodet_ct:>6} {correct:>7} {false_g:>6} {e2e:>6.1%}")

        totals["total"] += total
        totals["correct"] += correct
        totals["false"] += false_g

    overall_e2e = totals["correct"] / totals["total"] if totals["total"] else 0.0
    print("-" * len(header))
    print(f"{'ALL':<10} {totals['total']:>6} {'':>6} {'':>6} {'':>6} {'':>6} "
          f"{totals['correct']:>7} {totals['false']:>6} {overall_e2e:>6.1%}")

    tiger_items = by_class.get("tiger", [])
    tiger_recall = (sum(1 for r in tiger_items if r.is_correct_gating)
                     / len(tiger_items)) if tiger_items else 0.0
    nontiger_items = [r for gt, items in by_class.items() if gt != "tiger" for r in items]
    false_tiger_gates = sum(1 for r in nontiger_items if r.image_label == "tiger")

    return {
        "label": label,
        "dataset_images_found": len(eval_rows),
        "manifest_matches": len(matched),
        "ambiguous_excluded": len(ambiguous),
        "unmatched": len(unmatched),
        "totals": totals,
        "overall_e2e_recall": overall_e2e,
        "tiger_recall": tiger_recall,
        "false_tiger_gates": false_tiger_gates,
    }


def write_eval_csv(eval_rows: list[EvalRow], path: Path) -> None:
    fields = ["media_id", "source_file", "image_label", "match_status",
              "ground_truth", "is_correct_gating"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for r in eval_rows:
            writer.writerow({k: getattr(r, k) for k in fields})
    print(f"CSV saved to: {path}")


def run_and_evaluate(
    images: list[Path],
    detector,
    classifier: SpeciesClassifier,
    detection_mode: Literal["all", "best"],
    manifest: ManifestJoinTable,
    run_label: str,
    csv_stem: str,
) -> dict:
    """Convenience wrapper: PHASE 1 (inference) followed by PHASE 2
    (evaluation), with output written for both, kept in physically separate
    CSVs so the boundary stays visible on disk, not just in code."""
    t0 = time.time()
    results = run_pass(images, detector, classifier, detection_mode)
    elapsed = time.time() - t0
    write_inference_csv(results, OUTPUT_DIR / f"{csv_stem}_predictions.csv")

    eval_rows = evaluate_predictions(results, manifest)
    write_eval_csv(eval_rows, OUTPUT_DIR / f"{csv_stem}_evaluation.csv")

    summary = summarize_evaluation(eval_rows, f"{run_label} | {elapsed:.1f}s")
    summary["elapsed_s"] = elapsed
    return summary


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("=" * 78)
    print("Stage A.3 -- End-to-End Tiger Gate Evaluation (v3, flat dataset)")
    print("=" * 78)
    print("Ground truth is joined in strictly after inference; models never see it.\n")

    images = list_dataset_images(MAX_IMAGES)
    print(f"Dataset root  : {DATASET_ROOT}")
    print(f"Images found  : {len(images)}" + (" (capped by MAX_IMAGES)" if MAX_IMAGES else ""))

    manifest = load_manifest(MANIFEST_PATH)
    report_manifest_collisions(manifest)

    # Standard (production-equivalent) classifier: components="all".
    classifier_all = SpeciesClassifier(
        tiger_threshold=TIGER_THRESHOLD,
        uncertain_threshold=UNCERTAIN_THRESHOLD,
        classifier_version="speciesnet-v1",
    )

    summary_rows = []

    # -----------------------------------------------------------------
    # Baseline -- full flat dataset @ BASELINE_THRESHOLD, mode="all".
    # -----------------------------------------------------------------
    if RUN_BASELINE:
        detector = SweepAwareTigerDetector(confidence_threshold=BASELINE_THRESHOLD)
        s = run_and_evaluate(
            images, detector, classifier_all, "all", manifest,
            run_label=f"BASELINE @ thr={BASELINE_THRESHOLD} | mode=all",
            csv_stem="stage_a3_baseline",
        )
        summary_rows.append(s)

    # -----------------------------------------------------------------
    # Finding-1 fix validation -- "all detections" vs "best only".
    # -----------------------------------------------------------------
    if RUN_DETECTION_MODE_COMPARISON:
        detector = SweepAwareTigerDetector(confidence_threshold=BASELINE_THRESHOLD)
        s = run_and_evaluate(
            images, detector, classifier_all, "best", manifest,
            run_label=f"DETECTION-MODE COMPARISON @ thr={BASELINE_THRESHOLD} | mode=BEST-ONLY (old/buggy)",
            csv_stem="stage_a3_best_only",
        )
        summary_rows.append(s)
        # The "mode=all" baseline result above is the corresponding
        # "all detections" comparator.

    # -----------------------------------------------------------------
    # MegaDetector threshold sweep, 0.05 -> 0.50, mode=all.
    # -----------------------------------------------------------------
    if RUN_THRESHOLD_SWEEP:
        sweep_results = []
        detector = SweepAwareTigerDetector(confidence_threshold=SWEEP_THRESHOLDS[0])
        for thr in SWEEP_THRESHOLDS:
            detector.confidence_threshold = thr  # re-read dynamically by the patch
            s = run_and_evaluate(
                images, detector, classifier_all, "all", manifest,
                run_label=f"THRESHOLD SWEEP thr={thr:.2f} | mode=all",
                csv_stem=f"stage_a3_sweep_thr{thr:.2f}",
            )
            s["threshold"] = thr
            sweep_results.append(s)

        print(f"\n{'=' * 78}\nTHRESHOLD SWEEP SUMMARY (flat dataset, mode=all)\n{'=' * 78}")
        hdr = (f"{'Thr':>5} {'Matches':>8} {'E2E Recall':>11} "
               f"{'TigerRecall':>12} {'FalseTgrGates':>14} {'Time(s)':>9}")
        print(hdr)
        print("-" * len(hdr))
        for s in sweep_results:
            print(f"{s['threshold']:>5.2f} {s['manifest_matches']:>8} {s['overall_e2e_recall']:>10.1%} "
                  f"{s['tiger_recall']:>11.1%} {s['false_tiger_gates']:>14} {s['elapsed_s']:>9.1f}")

    # -----------------------------------------------------------------
    # Q2 -- components="all" vs components="classifier", same crops.
    # -----------------------------------------------------------------
    if RUN_CLASSIFIER_COMPONENTS_COMPARISON:
        run_classifier_components_comparison(images, classifier_all, manifest)

    print("\nStage A.3 (v3) evaluation complete.")
    print("Q3 note: stripe_matcher.py was not imported or exercised by this run.")
    print("         Auto-enrollment disable is a design change deferred to Stage C.")


def run_classifier_components_comparison(
    images: list[Path],
    classifier_all: SpeciesClassifier,
    manifest: ManifestJoinTable,
) -> None:
    """Q2: controlled comparison of SpeciesNet components='all' vs
    components='classifier', fed the SAME MegaDetector crop for each
    detection, at BASELINE_THRESHOLD.

    Inference for both variants runs with NO ground truth involved. A
    ground-truth column is attached to each output row only when writing
    the CSV, via the same safe-basename join used in evaluate_predictions
    -- purely for downstream readability of this comparison, after both
    classifications for that image already exist.

    `classifier_all` is reused from main() (already-loaded components='all'
    instance) so this comparison doesn't load a second, redundant SpeciesNet.
    """
    from speciesnet import SpeciesNet, DEFAULT_MODEL

    print(f"\n{'=' * 78}\nQ2 -- SpeciesNet components='all' vs components='classifier'\n{'=' * 78}")

    print("Loading SpeciesNet(components='classifier')...")
    sn_classifier_only = SpeciesNet(model_name=DEFAULT_MODEL, components="classifier")
    model_type = getattr(sn_classifier_only.classifier.model_info, "type_", "unknown")
    print(f"classifier.model_info.type_ = '{model_type}' "
          f"({'bbox WILL be honoured' if model_type == 'always_crop' else 'bbox may be IGNORED -- see caveat in module docstring'})")

    detector = SweepAwareTigerDetector(confidence_threshold=BASELINE_THRESHOLD)

    rows = []
    agree = 0
    total_compared = 0

    for img_path in images:
        media_id = img_path.stem
        record = build_record(media_id, img_path)
        try:
            det_result = detector.detect(record)
        except Exception as exc:
            rows.append({"media_id": media_id, "source_file": str(img_path), "error": str(exc)})
            continue

        for det_idx, det in enumerate(det_result.animal_detections):
            # (a) components="all" -- current production path.
            sp_all = classifier_all.classify(det, str(img_path), record)

            # (b) components="classifier" -- fed OUR MegaDetector bbox.
            bbox = det.bbox
            if bbox.norm_x1 is None:
                continue  # image dims unknown; skip this detection for the comparison
            md_bbox = [bbox.norm_x1, bbox.norm_y1,
                       bbox.norm_x2 - bbox.norm_x1, bbox.norm_y2 - bbox.norm_y1]
            detections_dict = {str(img_path): {"detections": [{"bbox": md_bbox}]}}
            try:
                classify_out = sn_classifier_only.classify(
                    filepaths=[str(img_path)],
                    detections_dict=detections_dict,
                    run_mode="multi_thread",
                )
                preds = classify_out["predictions"][0]
                classes = preds.get("classifications", {}).get("classes", [])
                scores = preds.get("classifications", {}).get("scores", [])
                if classes:
                    top_label_str = classes[0].lower()
                    top_conf = float(scores[0])
                    parts = top_label_str.split(";")
                    is_tiger = ("panthera" in parts and "tigris" in parts)
                    if top_conf < UNCERTAIN_THRESHOLD:
                        classifier_only_label = "uncertain"
                    elif is_tiger and top_conf >= TIGER_THRESHOLD:
                        classifier_only_label = "tiger"
                    elif is_tiger:
                        classifier_only_label = "uncertain"
                    else:
                        classifier_only_label = "non_tiger"
                else:
                    classifier_only_label, top_conf = "uncertain", 0.0
            except Exception:
                classifier_only_label, top_conf = "error", 0.0

            total_compared += 1
            if classifier_only_label == sp_all.species_label.value:
                agree += 1

            bn = img_path.name
            gt = manifest.safe_basename_to_label.get(bn)
            if gt is None:
                gt = "ambiguous" if bn in manifest.ambiguous_basenames else "unmatched"

            rows.append({
                "media_id": media_id, "source_file": str(img_path), "det_idx": det_idx,
                "ground_truth": gt,
                "all_label": sp_all.species_label.value, "all_conf": round(sp_all.species_confidence, 3),
                "classifier_only_label": classifier_only_label, "classifier_only_conf": round(top_conf, 3),
                "agree": classifier_only_label == sp_all.species_label.value,
            })

    with open(OUTPUT_DIR / "stage_a3_components_comparison.csv", "w", newline="", encoding="utf-8") as f:
        fieldnames = ["media_id", "source_file", "det_idx", "ground_truth", "all_label", "all_conf",
                      "classifier_only_label", "classifier_only_conf", "agree", "error"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in rows:
            writer.writerow({k: r.get(k, "") for k in fieldnames})

    agreement_rate = agree / total_compared if total_compared else 0.0
    print(f"Detections compared : {total_compared}")
    print(f"Label agreement rate: {agreement_rate:.1%}")
    print(f"CSV saved to: {OUTPUT_DIR / 'stage_a3_components_comparison.csv'}")


if __name__ == "__main__":
    main()
