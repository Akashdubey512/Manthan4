"""
FastAPI Router for Geospatial Intelligence & Home Range Estimation (Phase 3)
Provides endpoints for:
- POST /api/geo/home-range (MCP, KDE, or BOTH)
- POST /api/geo/batch-home-ranges
- POST /api/geo/overlaps
- GET  /api/geo/info
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from app.schemas import (
    HomeRangeRequest,
    HomeRangeResponse,
    SingleHomeRangeOutput,
    KDEIsoplethOutput,
    BatchHomeRangeRequest,
    OverlapRequest,
    OverlapResponse,
    HomeRangeMethod,
)
from app.geo.home_range import (
    compute_mcp,
    compute_kde_isopleths,
    compute_territory_overlap,
    DEFAULT_CRS,
)

router = APIRouter(prefix="/geo", tags=["Geospatial & Home Range"])


@router.get("/info", summary="Geospatial engine information")
def get_geo_info():
    """Returns the default metric projection and supported methods."""
    return {
        "engine": "Pench Tiger Movement Intelligence System - Geo Module",
        "default_metric_crs": DEFAULT_CRS,
        "region": "Pench Tiger Reserve, MP/MH, India (UTM Zone 44N)",
        "supported_methods": ["MCP", "KDE", "BOTH"],
        "kde_isopleths": [0.95, 0.50],
    }


@router.post(
    "/home-range",
    response_model=HomeRangeResponse,
    summary="Compute home range for an individual tiger",
)
def calculate_home_range(req: HomeRangeRequest):
    """
    Computes Minimum Convex Polygon (MCP) and/or Kernel Density Estimation (KDE)
    for a single tiger from a list of capture locations (lat, lng).
    """
    # Normalize points
    pts = []
    for p in req.points:
        if isinstance(p, dict):
            pts.append((p.get("lat"), p.get("lng")))
        elif hasattr(p, "lat") and hasattr(p, "lng"):
            pts.append((p.lat, p.lng))
        elif isinstance(p, (list, tuple)) and len(p) >= 2:
            pts.append((float(p[0]), float(p[1])))

    if not pts:
        raise HTTPException(
            status_code=400,
            detail=f"Individual '{req.individual_id}' provided 0 valid GPS points.",
        )

    response_data: Dict[str, Any] = {
        "individual_id": req.individual_id,
        "method": req.method.value,
        "points_count": len(pts),
    }

    # 1. MCP
    mcp_res = None
    if req.method in (HomeRangeMethod.MCP, HomeRangeMethod.BOTH):
        mcp_res = compute_mcp(
            pts,
            metric_crs=req.metric_crs,
            fallback_buffer_meters=req.fallback_buffer_meters,
        )
        response_data["mcp"] = mcp_res

    # 2. KDE
    kde_res = None
    if req.method in (HomeRangeMethod.KDE, HomeRangeMethod.BOTH):
        kde_res = compute_kde_isopleths(
            pts,
            metric_crs=req.metric_crs,
            percentiles=(0.95, 0.50),
        )
        if "kde_95" in kde_res:
            response_data["kde_95"] = kde_res["kde_95"]
        if "kde_50" in kde_res:
            response_data["kde_50"] = kde_res["kde_50"]

    # Assign top-level summary fields for map convenience
    if req.method == HomeRangeMethod.MCP and mcp_res:
        response_data["status"] = mcp_res.get("status", "unknown")
        response_data["area_sq_km"] = mcp_res.get("area_sq_km")
        response_data["centroid"] = mcp_res.get("centroid")
        response_data["geojson"] = mcp_res.get("geojson")
        response_data["notes"] = mcp_res.get("notes")
    elif req.method == HomeRangeMethod.KDE and kde_res:
        response_data["status"] = kde_res.get("status", "unknown")
        kde_95 = kde_res.get("kde_95") or {}
        response_data["area_sq_km"] = kde_95.get("area_sq_km")
        response_data["centroid"] = kde_95.get("centroid")
        response_data["geojson"] = kde_95.get("geojson")
        response_data["notes"] = kde_res.get("notes")
    else:  # BOTH
        status_mcp = mcp_res.get("status", "insufficient_points") if mcp_res else "skipped"
        status_kde = kde_res.get("status", "insufficient_points") if kde_res else "skipped"
        response_data["status"] = (
            "estimated"
            if (status_mcp == "estimated" or status_kde == "estimated")
            else status_mcp
        )
        if mcp_res and mcp_res.get("geojson"):
            response_data["area_sq_km"] = mcp_res.get("area_sq_km")
            response_data["centroid"] = mcp_res.get("centroid")
            response_data["geojson"] = mcp_res.get("geojson")
        elif kde_res and (kde_res.get("kde_95") or {}).get("geojson"):
            response_data["area_sq_km"] = kde_res["kde_95"].get("area_sq_km")
            response_data["centroid"] = kde_res["kde_95"].get("centroid")
            response_data["geojson"] = kde_res["kde_95"].get("geojson")

    return response_data


@router.post(
    "/batch-home-ranges",
    response_model=List[HomeRangeResponse],
    summary="Compute home ranges for a batch of individuals",
)
def calculate_batch_home_ranges(batch: BatchHomeRangeRequest):
    """Computes home ranges across multiple individuals in one batch."""
    results = []
    for item in batch.items:
        try:
            res = calculate_home_range(item)
            results.append(res)
        except HTTPException as e:
            results.append(
                HomeRangeResponse(
                    individual_id=item.individual_id,
                    method=item.method.value,
                    status="computation_failed",
                    points_count=len(item.points),
                    notes=e.detail,
                )
            )
        except Exception as e:
            results.append(
                HomeRangeResponse(
                    individual_id=item.individual_id,
                    method=item.method.value,
                    status="computation_failed",
                    points_count=len(item.points),
                    notes=str(e),
                )
            )
    return results


@router.post(
    "/overlaps",
    response_model=OverlapResponse,
    summary="Compute pairwise territorial overlap between two home ranges",
)
def calculate_overlap(req: OverlapRequest):
    """
    Computes the spatial intersection and overlap percentages between two
    home range polygons in GeoJSON format.
    """
    if not req.geom_a or not req.geom_b:
        raise HTTPException(
            status_code=400, detail="geom_a and geom_b must be valid GeoJSON geometries"
        )

    overlap_res = compute_territory_overlap(
        req.geom_a,
        req.geom_b,
        metric_crs=req.metric_crs,
    )

    return {
        "individual_a_id": req.individual_a_id,
        "individual_b_id": req.individual_b_id,
        **overlap_res,
    }
