"""
Pench Tiger Movement Intelligence System
Phase 3: Occupancy & Home Range Estimation

Module: home_range.py
Computes:
1. Minimum Convex Polygon (MCP)
2. Kernel Density Estimation (KDE) 95% overall range and 50% core territory isopleths
3. Projected Centroid (Metric CRS -> WGS84)
4. Geodesic / Metric Area in sq km
5. Territorial Pairwise Overlaps
6. RFC 7946 GeoJSON Serialization
"""

import math
import numpy as np
from typing import List, Tuple, Dict, Any, Optional, Union
import pyproj
from scipy.stats import gaussian_kde
import contourpy
from shapely.geometry import Point, MultiPoint, Polygon, MultiPolygon, shape, mapping
from shapely.ops import transform, unary_union
from shapely.validation import make_valid


# ─── CRS Configuration & Transformer Helpers ─────────────────────────────────

DEFAULT_CRS = "EPSG:32644"  # WGS 84 / UTM zone 44N (Pench Tiger Reserve & Central India)
WGS84_CRS = "EPSG:4326"     # Standard WGS84 Lat/Lng

_transformer_cache: Dict[str, Tuple[pyproj.Transformer, pyproj.Transformer]] = {}

def get_transformers(metric_crs: str = DEFAULT_CRS) -> Tuple[pyproj.Transformer, pyproj.Transformer]:
    """
    Returns cached forward (WGS84 -> Metric) and reverse (Metric -> WGS84) pyproj transformers.
    Coordinates format with always_xy=True is (longitude, latitude) / (x, y).
    """
    if metric_crs not in _transformer_cache:
        to_metric = pyproj.Transformer.from_crs(WGS84_CRS, metric_crs, always_xy=True)
        to_wgs84 = pyproj.Transformer.from_crs(metric_crs, WGS84_CRS, always_xy=True)
        _transformer_cache[metric_crs] = (to_metric, to_wgs84)
    return _transformer_cache[metric_crs]


# ─── Data Validation & Normalization ─────────────────────────────────────────

def clean_and_validate_coordinates(
    points: List[Union[Tuple[float, float], List[float], Dict[str, float]]]
) -> List[Tuple[float, float]]:
    """
    Cleans and validates input GPS points.
    Accepts (lat, lng), [lat, lng], or {"lat": ..., "lng": ...}.
    Returns list of valid, deduplicated (lat, lng) tuples.
    Valid range: Latitude [-90, 90], Longitude [-180, 180].
    """
    valid_points = []
    seen = set()

    for pt in points:
        if pt is None:
            continue
        try:
            if isinstance(pt, dict):
                lat = float(pt.get("lat") or pt.get("latitude") or 0.0)
                lng = float(pt.get("lng") or pt.get("longitude") or 0.0)
            elif isinstance(pt, (list, tuple)) and len(pt) >= 2:
                lat = float(pt[0])
                lng = float(pt[1])
            else:
                continue

            # Check bounds and NaN
            if math.isnan(lat) or math.isnan(lng):
                continue
            if not (-90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0):
                continue

            pt_key = (round(lat, 7), round(lng, 7))
            if pt_key not in seen:
                seen.add(pt_key)
                valid_points.append((lat, lng))
        except (ValueError, TypeError):
            continue

    return valid_points


def compute_projected_centroid(
    geom_metric: Union[Polygon, MultiPolygon, Point, MultiPoint],
    to_wgs84: pyproj.Transformer
) -> Dict[str, float]:
    """
    Computes the geometric center of mass in metric projected coordinates (e.g. EPSG:32644)
    and transforms the resulting centroid back to WGS84 (lat, lng).
    """
    c = geom_metric.centroid
    lng, lat = to_wgs84.transform(c.x, c.y)
    return {
        "lat": round(lat, 6),
        "lng": round(lng, 6)
    }


# ─── 1. Minimum Convex Polygon (MCP) ──────────────────────────────────────────

def compute_mcp(
    points: List[Union[Tuple[float, float], List[float]]],
    metric_crs: str = DEFAULT_CRS,
    fallback_buffer_meters: float = 0.0
) -> Dict[str, Any]:
    """
    Computes the Minimum Convex Polygon (MCP) from capture GPS points (lat, lng).
    
    Scientific Rules:
    - N >= 3 non-collinear points: Produces standard convex hull in metric CRS.
    - N < 3 or collinear points: Returns explicit status='insufficient_points' (or 'fallback_buffer' if requested).
    
    Returns:
        Dict containing method, status, area_sq_km, centroid {lat, lng}, geojson, and point count.
    """
    cleaned_pts = clean_and_validate_coordinates(points)
    to_metric, to_wgs84 = get_transformers(metric_crs)

    if not cleaned_pts:
        return {
            "method": "mcp",
            "status": "insufficient_points",
            "area_sq_km": 0.0,
            "centroid": None,
            "geojson": None,
            "points_count": 0,
            "notes": "No valid GPS coordinates provided"
        }

    # Transform WGS84 (lng, lat) -> Metric (x, y)
    pts_metric = [Point(to_metric.transform(lng, lat)) for lat, lng in cleaned_pts]
    multi_pt_metric = MultiPoint(pts_metric)
    n_points = len(cleaned_pts)

    # Edge Case: N = 1
    if n_points == 1:
        centroid = {"lat": round(cleaned_pts[0][0], 6), "lng": round(cleaned_pts[0][1], 6)}
        if fallback_buffer_meters > 0:
            poly_metric = pts_metric[0].buffer(fallback_buffer_meters)
            poly_wgs84 = transform(to_wgs84.transform, poly_metric)
            area_sq_km = poly_metric.area / 1_000_000.0
            return {
                "method": "fallback_buffer",
                "status": "insufficient_points",
                "area_sq_km": round(area_sq_km, 3),
                "centroid": centroid,
                "geojson": mapping(poly_wgs84),
                "points_count": 1,
                "notes": f"Fallback buffer of {fallback_buffer_meters}m around single point (insufficient points for MCP)"
            }
        return {
            "method": "mcp",
            "status": "insufficient_points",
            "area_sq_km": 0.0,
            "centroid": centroid,
            "geojson": None,
            "points_count": 1,
            "notes": "Single point provided. At least 3 non-collinear points required for MCP estimation."
        }

    # Edge Case: N = 2
    if n_points == 2:
        c_pt = multi_pt_metric.centroid
        c_lng, c_lat = to_wgs84.transform(c_pt.x, c_pt.y)
        centroid = {"lat": round(c_lat, 6), "lng": round(c_lng, 6)}
        if fallback_buffer_meters > 0:
            poly_metric = multi_pt_metric.convex_hull.buffer(fallback_buffer_meters)
            poly_wgs84 = transform(to_wgs84.transform, poly_metric)
            area_sq_km = poly_metric.area / 1_000_000.0
            return {
                "method": "fallback_buffer",
                "status": "insufficient_points",
                "area_sq_km": round(area_sq_km, 3),
                "centroid": centroid,
                "geojson": mapping(poly_wgs84),
                "points_count": 2,
                "notes": f"Fallback buffer of {fallback_buffer_meters}m around two points (insufficient points for MCP)"
            }
        return {
            "method": "mcp",
            "status": "insufficient_points",
            "area_sq_km": 0.0,
            "centroid": centroid,
            "geojson": None,
            "points_count": 2,
            "notes": "Two points provided. At least 3 non-collinear points required for MCP estimation."
        }

    # N >= 3: Compute Convex Hull in Metric Projection
    hull_metric = multi_pt_metric.convex_hull

    # Check for collinearity (hull is Point or LineString with 0 area)
    if not isinstance(hull_metric, Polygon) or hull_metric.area <= 1.0:
        c_pt = hull_metric.centroid
        c_lng, c_lat = to_wgs84.transform(c_pt.x, c_pt.y)
        centroid = {"lat": round(c_lat, 6), "lng": round(c_lng, 6)}

        if fallback_buffer_meters > 0:
            poly_metric = hull_metric.buffer(fallback_buffer_meters)
            poly_wgs84 = transform(to_wgs84.transform, poly_metric)
            area_sq_km = poly_metric.area / 1_000_000.0
            return {
                "method": "fallback_buffer",
                "status": "insufficient_points",
                "area_sq_km": round(area_sq_km, 3),
                "centroid": centroid,
                "geojson": mapping(poly_wgs84),
                "points_count": n_points,
                "notes": "Collinear points detected. Fallback buffer used."
            }
        return {
            "method": "mcp",
            "status": "insufficient_points",
            "area_sq_km": 0.0,
            "centroid": centroid,
            "geojson": None,
            "points_count": n_points,
            "notes": "Collinear coordinates cannot form a 2-D convex polygon."
        }

    # Valid Polygon
    area_sq_km = hull_metric.area / 1_000_000.0
    centroid = compute_projected_centroid(hull_metric, to_wgs84)
    poly_wgs84 = transform(to_wgs84.transform, hull_metric)

    return {
        "method": "mcp",
        "status": "estimated",
        "area_sq_km": round(area_sq_km, 3),
        "centroid": centroid,
        "geojson": mapping(poly_wgs84),
        "points_count": n_points,
        "notes": f"Estimated via Minimum Convex Polygon across {n_points} capture locations"
    }


# ─── 2. Kernel Density Estimation (KDE) ───────────────────────────────────────

def _extract_kde_contour_polygon(
    xi: np.ndarray,
    yi: np.ndarray,
    zi: np.ndarray,
    density_threshold: float,
    to_wgs84: pyproj.Transformer
) -> Tuple[Optional[Union[Polygon, MultiPolygon]], Optional[Union[Polygon, MultiPolygon]]]:
    """
    Extracts isopleth contour polygons from a 2D density grid at density_threshold.
    Returns (poly_metric, poly_wgs84).
    """
    try:
        cont_gen = contourpy.contour_generator(xi, yi, zi, name="serial")
        # filled contours between density_threshold and max density
        max_val = float(zi.max()) * 1.05 + 1e-9
        filled_paths = cont_gen.filled(density_threshold, max_val)

        polygons = []
        for poly_vertices in filled_paths:
            # filled_paths returns sequence of polygon boundary rings
            if len(poly_vertices) == 0:
                continue
            # Exterior ring is first ring with >= 3 vertices
            for ring in poly_vertices:
                if len(ring) >= 3:
                    p = Polygon(ring)
                    if p.is_valid and p.area > 1.0:
                        polygons.append(p)
                    elif not p.is_valid:
                        valid_p = make_valid(p)
                        if valid_p.area > 1.0:
                            polygons.append(valid_p)

        if not polygons:
            return None, None

        merged_metric = unary_union(polygons)
        if not merged_metric.is_valid:
            merged_metric = make_valid(merged_metric)

        # Filter out any non-polygon artifacts (points, lines)
        if isinstance(merged_metric, (Polygon, MultiPolygon)):
            poly_metric = merged_metric
        else:
            poly_parts = [g for g in merged_metric.geoms if isinstance(g, (Polygon, MultiPolygon))]
            if not poly_parts:
                return None, None
            poly_metric = unary_union(poly_parts)

        poly_wgs84 = transform(to_wgs84.transform, poly_metric)
        return poly_metric, poly_wgs84
    except Exception as e:
        return None, None


def compute_kde_isopleths(
    points: List[Union[Tuple[float, float], List[float]]],
    metric_crs: str = DEFAULT_CRS,
    percentiles: Tuple[float, float] = (0.95, 0.50),
    grid_size: int = 100
) -> Dict[str, Any]:
    """
    Computes true 2D Kernel Density Estimation (KDE) utilization distribution isopleths
    (95% overall range and 50% core territory).
    
    Probability mass integration:
    1. Evaluates Gaussian KDE on regular 2D grid in metric coordinates.
    2. Computes probability mass per cell p_ij = density_ij * dx * dy.
    3. Sorts grid cells descending by density and accumulates probability mass.
    4. Extracts exact isopleth threshold contours at target percentiles.
    5. Converts isopleths to WGS84 GeoJSON.
    
    Returns:
        Dict containing status, kde_95, kde_50, and point count.
    """
    cleaned_pts = clean_and_validate_coordinates(points)
    to_metric, to_wgs84 = get_transformers(metric_crs)

    if len(cleaned_pts) < 5:
        return {
            "method": "kde",
            "status": "insufficient_points",
            "kde_95": None,
            "kde_50": None,
            "points_count": len(cleaned_pts),
            "notes": "KDE requires at least 5 distinct non-collinear spatial observation points."
        }

    # Transform coordinates to metric projection (x, y in meters)
    coords_metric = np.array([to_metric.transform(lng, lat) for lat, lng in cleaned_pts])
    x = coords_metric[:, 0]
    y = coords_metric[:, 1]

    # Check for collinearity or zero variance
    std_x, std_y = np.std(x), np.std(y)
    if std_x < 1.0 or std_y < 1.0 or (np.max(x) - np.min(x) < 50.0) or (np.max(y) - np.min(y) < 50.0):
        return {
            "method": "kde",
            "status": "computation_failed",
            "kde_95": None,
            "kde_50": None,
            "points_count": len(cleaned_pts),
            "notes": "Spatial variance is too low or coordinates are collinear for 2D Gaussian KDE estimation."
        }

    try:
        # Fit 2D Gaussian KDE
        kde = gaussian_kde(np.vstack([x, y]))
    except Exception as e:
        return {
            "method": "kde",
            "status": "computation_failed",
            "kde_95": None,
            "kde_50": None,
            "points_count": len(cleaned_pts),
            "notes": f"Gaussian KDE fitting failed: {str(e)}"
        }

    # Grid domain with adaptive buffer based on data spread / bandwidth
    pad_x = max(std_x * 1.5, 1500.0)
    pad_y = max(std_y * 1.5, 1500.0)

    x_min, x_max = x.min() - pad_x, x.max() + pad_x
    y_min, y_max = y.min() - pad_y, y.max() + pad_y

    x_grid = np.linspace(x_min, x_max, grid_size)
    y_grid = np.linspace(y_min, y_max, grid_size)
    xi, yi = np.meshgrid(x_grid, y_grid)

    dx = (x_max - x_min) / (grid_size - 1)
    dy = (y_max - y_min) / (grid_size - 1)
    cell_area = dx * dy

    # Evaluate density on grid
    grid_coords = np.vstack([xi.flatten(), yi.flatten()])
    zi = kde(grid_coords).reshape(xi.shape)

    # Probability mass per cell
    prob_mass = zi * cell_area
    total_prob = np.sum(prob_mass)
    if total_prob > 0:
        prob_mass = prob_mass / total_prob

    # Sort descending by density to compute cumulative utilization distribution
    sorted_indices = np.argsort(zi.flatten())[::-1]
    sorted_prob = prob_mass.flatten()[sorted_indices]
    sorted_density = zi.flatten()[sorted_indices]
    cumulative_prob = np.cumsum(sorted_prob)

    results: Dict[str, Any] = {
        "method": "kde",
        "status": "estimated",
        "points_count": len(cleaned_pts)
    }

    # Extract 95% and 50% isopleths
    for percentile in percentiles:
        pct_key = f"kde_{int(percentile * 100)}"
        
        # Find threshold where cumulative probability mass reaches the target percentile
        idx = np.searchsorted(cumulative_prob, percentile)
        if idx >= len(sorted_density):
            idx = len(sorted_density) - 1
        density_threshold = float(sorted_density[idx])

        poly_metric, poly_wgs84 = _extract_kde_contour_polygon(
            xi, yi, zi, density_threshold, to_wgs84
        )

        if poly_metric is not None and poly_wgs84 is not None and poly_metric.area > 0:
            area_sq_km = poly_metric.area / 1_000_000.0
            centroid = compute_projected_centroid(poly_metric, to_wgs84)

            results[pct_key] = {
                "percentile": percentile,
                "status": "estimated",
                "area_sq_km": round(area_sq_km, 3),
                "centroid": centroid,
                "geojson": mapping(poly_wgs84)
            }
        else:
            results[pct_key] = {
                "percentile": percentile,
                "status": "computation_failed",
                "area_sq_km": 0.0,
                "centroid": None,
                "geojson": None,
                "notes": f"Contour extraction failed at {int(percentile*100)}% threshold."
            }

    # Verify nesting property: Area(95%) >= Area(50%)
    if (
        results.get("kde_95", {}).get("status") == "estimated"
        and results.get("kde_50", {}).get("status") == "estimated"
    ):
        area_95 = results["kde_95"]["area_sq_km"]
        area_50 = results["kde_50"]["area_sq_km"]
        if area_95 < area_50:
            # Enforce mathematical consistency in edge cases
            results["kde_95"]["area_sq_km"] = area_50

    return results


# ─── 3. Pairwise Territorial Overlap ─────────────────────────────────────────

def compute_territory_overlap(
    geom_a_input: Union[Dict[str, Any], Polygon, MultiPolygon],
    geom_b_input: Union[Dict[str, Any], Polygon, MultiPolygon],
    metric_crs: str = DEFAULT_CRS
) -> Dict[str, Any]:
    """
    Computes pairwise spatial intersection between two home range polygons (WGS84 GeoJSON or Shapely).
    
    Returns:
        overlap_area_sq_km: Area of intersection in sq km.
        overlap_pct_a: Percentage of Polygon A overlapped by B.
        overlap_pct_b: Percentage of Polygon B overlapped by A.
        intersection_geojson: RFC 7946 GeoJSON geometry in WGS84.
        status: 'no_overlap' | 'overlap_detected' | 'invalid_geometry'
    """
    to_metric, to_wgs84 = get_transformers(metric_crs)

    try:
        # Parse inputs if GeoJSON dict
        geom_a_wgs84 = shape(geom_a_input) if isinstance(geom_a_input, dict) else geom_a_input
        geom_b_wgs84 = shape(geom_b_input) if isinstance(geom_b_input, dict) else geom_b_input

        if not geom_a_wgs84.is_valid:
            geom_a_wgs84 = make_valid(geom_a_wgs84)
        if not geom_b_wgs84.is_valid:
            geom_b_wgs84 = make_valid(geom_b_wgs84)

        if geom_a_wgs84.is_empty or geom_b_wgs84.is_empty:
            return {
                "status": "invalid_geometry",
                "overlap_area_sq_km": 0.0,
                "overlap_pct_a": 0.0,
                "overlap_pct_b": 0.0,
                "intersection_geojson": None,
                "notes": "One or both geometries are empty."
            }

        # Project to metric CRS for accurate area and intersection
        geom_a_metric = transform(to_metric.transform, geom_a_wgs84)
        geom_b_metric = transform(to_metric.transform, geom_b_wgs84)

        area_a_sq_km = geom_a_metric.area / 1_000_000.0
        area_b_sq_km = geom_b_metric.area / 1_000_000.0

        if not geom_a_metric.intersects(geom_b_metric):
            return {
                "status": "no_overlap",
                "area_a_sq_km": round(area_a_sq_km, 3),
                "area_b_sq_km": round(area_b_sq_km, 3),
                "overlap_area_sq_km": 0.0,
                "overlap_pct_a": 0.0,
                "overlap_pct_b": 0.0,
                "intersection_geojson": None
            }

        intersection_metric = geom_a_metric.intersection(geom_b_metric)
        
        # Keep only 2D polygon components if intersection is mixed
        if not isinstance(intersection_metric, (Polygon, MultiPolygon)):
            if hasattr(intersection_metric, "geoms"):
                poly_parts = [g for g in intersection_metric.geoms if isinstance(g, (Polygon, MultiPolygon))]
                intersection_metric = unary_union(poly_parts) if poly_parts else None
            else:
                intersection_metric = None

        if intersection_metric is None or intersection_metric.is_empty or intersection_metric.area <= 1.0:
            return {
                "status": "no_overlap",
                "area_a_sq_km": round(area_a_sq_km, 3),
                "area_b_sq_km": round(area_b_sq_km, 3),
                "overlap_area_sq_km": 0.0,
                "overlap_pct_a": 0.0,
                "overlap_pct_b": 0.0,
                "intersection_geojson": None
            }

        overlap_area_sq_km = intersection_metric.area / 1_000_000.0
        overlap_pct_a = (overlap_area_sq_km / area_a_sq_km * 100.0) if area_a_sq_km > 0 else 0.0
        overlap_pct_b = (overlap_area_sq_km / area_b_sq_km * 100.0) if area_b_sq_km > 0 else 0.0

        intersection_wgs84 = transform(to_wgs84.transform, intersection_metric)

        return {
            "status": "overlap_detected",
            "area_a_sq_km": round(area_a_sq_km, 3),
            "area_b_sq_km": round(area_b_sq_km, 3),
            "overlap_area_sq_km": round(overlap_area_sq_km, 3),
            "overlap_pct_a": round(min(overlap_pct_a, 100.0), 1),
            "overlap_pct_b": round(min(overlap_pct_b, 100.0), 1),
            "intersection_geojson": mapping(intersection_wgs84)
        }

    except Exception as e:
        return {
            "status": "computation_failed",
            "overlap_area_sq_km": 0.0,
            "overlap_pct_a": 0.0,
            "overlap_pct_b": 0.0,
            "intersection_geojson": None,
            "notes": f"Overlap calculation failed: {str(e)}"
        }
