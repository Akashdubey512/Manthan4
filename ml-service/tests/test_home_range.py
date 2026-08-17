"""
Unit Tests for Phase 3: Occupancy & Home Range Estimation (home_range.py)
Validates:
1. Minimum Convex Polygon (MCP) with >=3 realistic Pench GPS coordinates
2. Single-point and two-point insufficient data fallback handling
3. Collinear coordinates handling
4. Kernel Density Estimation (KDE) 95% and 50% true utilization distribution
5. KDE nesting property: Area(95%) >= Area(50%)
6. Robustness against missing, duplicate, or out-of-range coordinates
7. Pairwise territory overlaps: disjoint, partial, and identical
8. RFC 7946 GeoJSON schema and centroid validity
"""

import pytest
from app.geo.home_range import (
    compute_mcp,
    compute_kde_isopleths,
    compute_territory_overlap,
    clean_and_validate_coordinates,
    DEFAULT_CRS,
)
from shapely.geometry import shape, Polygon, MultiPolygon


# ─── Realistic Synthetic GPS Coordinates (Pench Tiger Reserve region) ─────────
# Centered around Pench Core: 21.72° N, 79.30° E
SYNTHETIC_TIGER_A_POINTS = [
    (21.7250, 79.2900),
    (21.7310, 79.2940),
    (21.7280, 79.3050),
    (21.7190, 79.3010),
    (21.7210, 79.2880),
    (21.7260, 79.2950),
    (21.7240, 79.2980),
]

SYNTHETIC_TIGER_B_POINTS = [
    (21.7220, 79.3000),  # Overlaps with A
    (21.7290, 79.3080),
    (21.7250, 79.3180),
    (21.7150, 79.3120),
    (21.7180, 79.3050),
    (21.7200, 79.3100),
]

# Disjoint coordinates far to the south-east
SYNTHETIC_TIGER_DISJOINT_POINTS = [
    (21.6500, 79.4000),
    (21.6550, 79.4100),
    (21.6450, 79.4150),
    (21.6400, 79.4050),
]


# ─── 1. Data Cleaning & Robustness Tests ──────────────────────────────────────

def test_clean_and_validate_coordinates():
    raw_points = [
        (21.725, 79.290),
        (21.725, 79.290),  # Duplicate -> should be removed
        (999.0, 79.290),   # Out of bounds lat -> should be dropped
        (21.725, 200.0),   # Out of bounds lng -> should be dropped
        {"lat": 21.730, "lng": 79.295}, # Dict format
        [21.728, 79.300],  # List format
        None,              # None -> dropped
        "invalid",         # Invalid string -> dropped
    ]
    cleaned = clean_and_validate_coordinates(raw_points)
    assert len(cleaned) == 3
    assert (21.725, 79.290) in cleaned
    assert (21.730, 79.295) in cleaned
    assert (21.728, 79.300) in cleaned


# ─── 2. MCP Tests ─────────────────────────────────────────────────────────────

def test_mcp_valid_points():
    res = compute_mcp(SYNTHETIC_TIGER_A_POINTS)
    assert res["status"] == "estimated"
    assert res["method"] == "mcp"
    assert res["area_sq_km"] > 0.5  # Realistic territory area
    assert res["area_sq_km"] < 100.0
    assert res["points_count"] == len(SYNTHETIC_TIGER_A_POINTS)
    
    # Centroid check
    centroid = res["centroid"]
    assert centroid is not None
    assert 21.71 <= centroid["lat"] <= 21.74
    assert 79.28 <= centroid["lng"] <= 79.31

    # GeoJSON validity
    geojson = res["geojson"]
    assert geojson is not None
    assert geojson["type"] in ("Polygon", "MultiPolygon")
    geom = shape(geojson)
    assert geom.is_valid
    assert not geom.is_empty


def test_mcp_single_point_fallback():
    # Without buffer
    res_no_buf = compute_mcp([(21.725, 79.290)], fallback_buffer_meters=0.0)
    assert res_no_buf["status"] == "insufficient_points"
    assert res_no_buf["method"] == "mcp"
    assert res_no_buf["area_sq_km"] == 0.0
    assert res_no_buf["geojson"] is None
    assert res_no_buf["centroid"]["lat"] == 21.725

    # With buffer
    res_buf = compute_mcp([(21.725, 79.290)], fallback_buffer_meters=500.0)
    assert res_buf["status"] == "insufficient_points"
    assert res_buf["method"] == "fallback_buffer"
    assert res_buf["area_sq_km"] > 0.0
    assert res_buf["geojson"] is not None
    assert shape(res_buf["geojson"]).is_valid


def test_mcp_two_points_fallback():
    points = [(21.725, 79.290), (21.730, 79.295)]
    res = compute_mcp(points, fallback_buffer_meters=0.0)
    assert res["status"] == "insufficient_points"
    assert res["area_sq_km"] == 0.0
    assert res["geojson"] is None

    res_buf = compute_mcp(points, fallback_buffer_meters=300.0)
    assert res_buf["status"] == "insufficient_points"
    assert res_buf["method"] == "fallback_buffer"
    assert res_buf["area_sq_km"] > 0.0


def test_mcp_collinear_points():
    # Points lying on a straight line
    collinear = [(21.720, 79.290), (21.725, 79.290), (21.730, 79.290)]
    res = compute_mcp(collinear, fallback_buffer_meters=0.0)
    assert res["status"] == "insufficient_points"
    assert res["area_sq_km"] == 0.0
    assert res["geojson"] is None


# ─── 3. KDE Tests ─────────────────────────────────────────────────────────────

def test_kde_insufficient_points():
    # Less than 5 points
    points = [(21.725, 79.290), (21.730, 79.295), (21.728, 79.300)]
    res = compute_kde_isopleths(points)
    assert res["status"] == "insufficient_points"
    assert res["kde_95"] is None
    assert res["kde_50"] is None


def test_kde_valid_estimation_and_nesting():
    res = compute_kde_isopleths(SYNTHETIC_TIGER_A_POINTS, percentiles=(0.95, 0.50))
    assert res["status"] == "estimated"
    assert "kde_95" in res
    assert "kde_50" in res

    kde_95 = res["kde_95"]
    kde_50 = res["kde_50"]

    assert kde_95["status"] == "estimated"
    assert kde_50["status"] == "estimated"
    assert kde_95["area_sq_km"] > 0.0
    assert kde_50["area_sq_km"] > 0.0

    # Scientific property: 95% home range area must be >= 50% core territory area
    assert kde_95["area_sq_km"] >= kde_50["area_sq_km"]

    # Validate GeoJSON geometries
    geom_95 = shape(kde_95["geojson"])
    geom_50 = shape(kde_50["geojson"])
    assert geom_95.is_valid
    assert geom_50.is_valid
    assert not geom_95.is_empty
    assert not geom_50.is_empty


# ─── 4. Territorial Overlap Tests ────────────────────────────────────────────

def test_territory_overlap_partial():
    mcp_a = compute_mcp(SYNTHETIC_TIGER_A_POINTS)
    mcp_b = compute_mcp(SYNTHETIC_TIGER_B_POINTS)

    overlap = compute_territory_overlap(mcp_a["geojson"], mcp_b["geojson"])
    assert overlap["status"] == "overlap_detected"
    assert overlap["overlap_area_sq_km"] > 0.0
    assert 0.0 < overlap["overlap_pct_a"] <= 100.0
    assert 0.0 < overlap["overlap_pct_b"] <= 100.0
    assert overlap["intersection_geojson"] is not None
    assert shape(overlap["intersection_geojson"]).is_valid


def test_territory_overlap_disjoint():
    mcp_a = compute_mcp(SYNTHETIC_TIGER_A_POINTS)
    mcp_disjoint = compute_mcp(SYNTHETIC_TIGER_DISJOINT_POINTS)

    overlap = compute_territory_overlap(mcp_a["geojson"], mcp_disjoint["geojson"])
    assert overlap["status"] == "no_overlap"
    assert overlap["overlap_area_sq_km"] == 0.0
    assert overlap["overlap_pct_a"] == 0.0
    assert overlap["overlap_pct_b"] == 0.0
    assert overlap["intersection_geojson"] is None


def test_territory_overlap_identical():
    mcp_a = compute_mcp(SYNTHETIC_TIGER_A_POINTS)
    overlap = compute_territory_overlap(mcp_a["geojson"], mcp_a["geojson"])
    assert overlap["status"] == "overlap_detected"
    assert pytest.approx(overlap["overlap_pct_a"], 0.1) == 100.0
    assert pytest.approx(overlap["overlap_pct_b"], 0.1) == 100.0
    assert pytest.approx(overlap["overlap_area_sq_km"], 0.1) == mcp_a["area_sq_km"]
