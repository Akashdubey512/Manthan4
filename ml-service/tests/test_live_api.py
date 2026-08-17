"""
Live HTTP Integration Tests for FastAPI Geo Endpoints
"""

import requests
from shapely.geometry import shape

BASE_URL = "http://127.0.0.1:8000"


def test_live_geo_info():
    res = requests.get(f"{BASE_URL}/api/geo/info")
    assert res.status_code == 200
    data = res.json()
    assert data["default_metric_crs"] == "EPSG:32644"
    assert "MCP" in data["supported_methods"]
    assert "KDE" in data["supported_methods"]


def test_live_home_range_both_methods():
    synthetic_pts = [
        [21.7250, 79.2900], [21.7310, 79.2940], [21.7280, 79.3050],
        [21.7190, 79.3010], [21.7210, 79.2880], [21.7260, 79.2950], [21.7240, 79.2980]
    ]
    payload = {
        "individual_id": "TEST-TGR-001",
        "points": synthetic_pts,
        "method": "BOTH"
    }
    res = requests.post(f"{BASE_URL}/api/geo/home-range", json=payload)
    assert res.status_code == 200
    data = res.json()

    # Top-level & MCP
    assert data["status"] == "estimated"
    assert data["mcp"]["status"] == "estimated"
    assert data["mcp"]["area_sq_km"] > 0.0
    assert shape(data["mcp"]["geojson"]).is_valid

    # KDE 95 and 50
    assert data["kde_95"]["status"] == "estimated"
    assert data["kde_50"]["status"] == "estimated"
    assert data["kde_95"]["area_sq_km"] >= data["kde_50"]["area_sq_km"]
    assert shape(data["kde_95"]["geojson"]).is_valid
    assert shape(data["kde_50"]["geojson"]).is_valid

    # Centroid
    assert "lat" in data["centroid"] and "lng" in data["centroid"]


def test_live_home_range_insufficient_points():
    payload = {
        "individual_id": "TEST-TGR-SPARSE",
        "points": [[21.7250, 79.2900], [21.7310, 79.2940]],
        "method": "BOTH",
        "fallback_buffer_meters": 0.0
    }
    res = requests.post(f"{BASE_URL}/api/geo/home-range", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["mcp"]["status"] == "insufficient_points"
    assert data["mcp"]["geojson"] is None
    assert data["kde_95"] is None or data["kde_95"]["status"] == "insufficient_points"


def test_live_batch_home_ranges():
    synthetic_pts_1 = [
        [21.7250, 79.2900], [21.7310, 79.2940], [21.7280, 79.3050],
        [21.7190, 79.3010], [21.7210, 79.2880], [21.7260, 79.2950]
    ]
    synthetic_pts_2 = [
        [21.7220, 79.3000], [21.7290, 79.3080], [21.7250, 79.3180],
        [21.7150, 79.3120], [21.7180, 79.3050], [21.7200, 79.3100]
    ]
    payload = {
        "items": [
            {"individual_id": "TEST-TGR-001", "points": synthetic_pts_1, "method": "BOTH"},
            {"individual_id": "TEST-TGR-002", "points": synthetic_pts_2, "method": "BOTH"}
        ]
    }
    res = requests.post(f"{BASE_URL}/api/geo/batch-home-ranges", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 2
    assert data[0]["status"] == "estimated"
    assert data[1]["status"] == "estimated"


def test_live_overlaps_partial_and_disjoint():
    # Tiger 1 & 2 MCPs
    pts_1 = [[21.725, 79.290], [21.731, 79.294], [21.728, 79.305], [21.719, 79.301], [21.721, 79.288]]
    pts_2 = [[21.722, 79.300], [21.729, 79.308], [21.725, 79.318], [21.715, 79.312], [21.718, 79.305]]
    pts_disjoint = [[21.600, 79.400], [21.610, 79.400], [21.605, 79.410]]

    hr_1 = requests.post(f"{BASE_URL}/api/geo/home-range", json={"individual_id": "T1", "points": pts_1, "method": "MCP"}).json()
    hr_2 = requests.post(f"{BASE_URL}/api/geo/home-range", json={"individual_id": "T2", "points": pts_2, "method": "MCP"}).json()
    hr_disjoint = requests.post(f"{BASE_URL}/api/geo/home-range", json={"individual_id": "TD", "points": pts_disjoint, "method": "MCP"}).json()

    # 1. Partial Overlap
    res_ov = requests.post(f"{BASE_URL}/api/geo/overlaps", json={
        "individual_a_id": "TEST-TGR-001",
        "individual_b_id": "TEST-TGR-002",
        "geom_a": hr_1["mcp"]["geojson"],
        "geom_b": hr_2["mcp"]["geojson"],
        "metric_crs": "EPSG:32644"
    })
    assert res_ov.status_code == 200
    ov_data = res_ov.json()
    assert ov_data["status"] == "overlap_detected"
    assert ov_data["overlap_area_sq_km"] > 0.0
    assert shape(ov_data["intersection_geojson"]).is_valid

    # 2. Disjoint
    res_disjoint = requests.post(f"{BASE_URL}/api/geo/overlaps", json={
        "individual_a_id": "TEST-TGR-001",
        "individual_b_id": "TEST-TGR-DISJOINT",
        "geom_a": hr_1["mcp"]["geojson"],
        "geom_b": hr_disjoint["mcp"]["geojson"],
        "metric_crs": "EPSG:32644"
    })
    assert res_disjoint.status_code == 200
    disjoint_data = res_disjoint.json()
    assert disjoint_data["status"] == "no_overlap"
    assert disjoint_data["overlap_area_sq_km"] == 0.0
    assert disjoint_data["intersection_geojson"] is None
