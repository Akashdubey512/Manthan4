/**
 * Manthan4 — Frontend API Abstraction Service
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ARCHITECTURE:
 *   UI components → api.js → (VITE_API_URL backend | mock data fallback)
 *
 * CURRENT BACKEND STATUS (as of gis-reference-redesign-yash):
 *   ✓  GET /api/health         — implemented
 *   ✗  GET /api/tigers          — not yet implemented
 *   ✗  GET /api/tigers/:id      — not yet implemented
 *   ✗  GET /api/tigers/:id/captures    — not yet implemented
 *   ✗  GET /api/tigers/:id/home-range  — not yet implemented
 *   ✗  GET /api/occupancy/reserve-map  — not yet implemented
 *   ✗  GET /api/occupancy/overlaps     — not yet implemented
 *   ✗  GET /api/captures        — not yet implemented
 *   ✗  GET /api/alerts          — not yet implemented
 *   ✗  GET /api/alerts/:id      — not yet implemented
 *   ✗  GET /api/stations        — not yet implemented (camera traps)
 *
 * SWITCHING TO REAL BACKEND:
 *   Set VITE_API_URL in frontend/.env (e.g. VITE_API_URL=http://localhost:5001)
 *   Each function below will automatically prefer the real endpoint.
 *   The response adapter/normalizer is isolated per function so the UI never
 *   needs to change when backend data shapes are finalised.
 *
 * DATA CONTRACTS (GIS map requirements):
 *   Tigers         — id, name, lat, lng, status, zone, sex, ageClass,
 *                    stripeMatchConfidence, movementTrend, homeRangeKm2,
 *                    sightings, lastSeen, notes
 *   Trails         — { [tigerId]: [[lat,lng], ...] }
 *   Home-range     — GeoJSON Polygon (future) | radius fallback (current)
 *   Stations       — id, lat, lng, status, zone, lastPing, images
 *   Captures       — id, tigerId, stationId, timestamp, imageUrl, confidence
 *   Alerts         — id, type, tigerId, text, time, location
 *   Occupancy map  — GeoJSON FeatureCollection (future)
 *   Overlaps       — [{tigerId, overlapWith, pct}] (future)
 */

import {
  MOCK_STATS,
  MOCK_TIGERS,
  MOCK_TRAILS,
  MOCK_CAMERAS,
  MOCK_ALERTS,
  MOCK_INGEST_HISTORY,
} from './mockData';

// ─── Config ─────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || '';
const USE_MOCK = !API_BASE; // true when running without a real backend

// ─── Internal HTTP Helper ────────────────────────────────────────────────────
/**
 * Thin wrapper around fetch that normalises errors into a consistent shape.
 * Returns { data, error } — callers can choose how to surface the error.
 */
async function apiFetch(path) {
  try {
    const headers = { Accept: 'application/json' };
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, { headers });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let errorMsg = `HTTP ${res.status}: ${text || res.statusText}`;
      try {
        const parsed = JSON.parse(text);
        if (parsed.error) errorMsg = parsed.error;
      } catch (e) {}
      return { data: null, error: errorMsg };
    }
    const data = await res.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message || 'Network error' };
  }
}

// ─── Response Adapters ───────────────────────────────────────────────────────
// These normalise backend shapes → internal UI shape.
// When the real backend is implemented, adjust ONLY these functions.

/**
 * Normalise a backend tiger record to the shape expected by the UI.
 * @param {object} raw - raw backend tiger record
 */
function normaliseTiger(raw) {
  return {
    id: raw.id ?? raw._id ?? '',
    name: raw.name ?? '',
    lat: parseFloat(raw.lat ?? raw.latitude ?? 0),
    lng: parseFloat(raw.lng ?? raw.longitude ?? 0),
    status: raw.status ?? 'normal',
    zone: raw.zone ?? '',
    sex: raw.sex ?? '',
    ageClass: raw.age_class ?? raw.ageClass ?? '',
    stripeMatchConfidence: raw.stripe_match_confidence ?? raw.stripeMatchConfidence ?? 0,
    movementTrend: raw.movement_trend ?? raw.movementTrend ?? 'stable',
    homeRangeKm2: raw.home_range_km2 ?? raw.homeRangeKm2 ?? 0,
    sightings: raw.sightings ?? 0,
    lastSeen: raw.last_seen ?? raw.lastSeen ?? null,
    notes: raw.notes ?? '',
  };
}

/**
 * Normalise a backend station/camera-trap record to the UI shape.
 */
function normaliseStation(raw) {
  return {
    id: raw.id ?? raw._id ?? '',
    lat: parseFloat(raw.lat ?? raw.latitude ?? 0),
    lng: parseFloat(raw.lng ?? raw.longitude ?? 0),
    status: raw.status ?? 'offline',
    zone: raw.zone ?? '',
    lastPing: raw.last_ping ?? raw.lastPing ?? '–',
    images: raw.image_count ?? raw.images ?? 0,
  };
}

/**
 * Normalise a backend alert record to the UI shape.
 */
function normaliseAlert(raw) {
  return {
    id: raw.id ?? raw._id ?? '',
    type: raw.type ?? raw.severity ?? 'info',
    tigerId: raw.tiger_id ?? raw.tigerId ?? null,
    text: raw.message ?? raw.text ?? '',
    time: raw.created_at ?? raw.time ?? '',
    location: raw.location ?? '',
  };
}

/**
 * Normalise a backend ingest-batch record to the UI shape.
 */
function normaliseIngestBatch(raw) {
  return {
    id: raw.id ?? raw._id ?? '',
    cameraId: raw.camera_id ?? raw.cameraId ?? '',
    date: raw.date ?? raw.ingested_at?.slice(0, 10) ?? '',
    files: raw.file_count ?? raw.files ?? 0,
    detections: raw.detection_count ?? raw.detections ?? 0,
    status: raw.status ?? 'complete',
  };
}

// ─── Public Service Functions ────────────────────────────────────────────────

/**
 * Backend health check.
 * Endpoint: GET /api/health
 * Status:   ✓ implemented
 */
export async function getHealth() {
  if (USE_MOCK) return { status: 'ok', source: 'mock' };
  const { data, error } = await apiFetch('/api/health');
  return error ? { status: 'error', error } : data;
}

/**
 * Operational KPI summary statistics.
 * Endpoint: none yet — derived from aggregate backend data in future.
 * Status:   ✗ not implemented (returns mock stats)
 *
 * Future shape: { activeTraps, offlineTraps, recentDetections, identifiedTigers, lastSync }
 */
export async function getStats() {
  if (USE_MOCK) return MOCK_STATS;
  // TODO: derive from /api/stations and /api/captures counts when backend is ready
  return MOCK_STATS;
}

/**
 * All registered tiger entities.
 * Endpoint: GET /api/tigers
 * Status:   ✗ not implemented (falls back to mock)
 */
export async function getTigers() {
  if (USE_MOCK) return MOCK_TIGERS;
  const { data, error } = await apiFetch('/api/tigers');
  if (error || !data) {
    console.warn('[api] getTigers: backend unavailable, using mock data.', error);
    return MOCK_TIGERS;
  }
  return Array.isArray(data) ? data.map(normaliseTiger) : (data.tigers ?? []).map(normaliseTiger);
}

/**
 * Single tiger entity by ID.
 * Endpoint: GET /api/tigers/:id
 * Status:   ✗ not implemented (falls back to mock)
 */
export async function getTiger(id) {
  if (USE_MOCK) return MOCK_TIGERS.find((t) => t.id === id) ?? null;
  const { data, error } = await apiFetch(`/api/tigers/${id}`);
  if (error || !data) {
    console.warn(`[api] getTiger(${id}): backend unavailable, using mock data.`, error);
    return MOCK_TIGERS.find((t) => t.id === id) ?? null;
  }
  return normaliseTiger(data);
}

/**
 * Camera-trap captures / detections for a single tiger.
 * Endpoint: GET /api/tigers/:id/captures
 * Status:   ✗ not implemented
 */
export async function getTigerCaptures(id) {
  if (USE_MOCK) return [];
  const { data, error } = await apiFetch(`/api/tigers/${id}/captures`);
  if (error || !data) {
    console.warn(`[api] getTigerCaptures(${id}): backend unavailable.`, error);
    return [];
  }
  return Array.isArray(data) ? data : (data.captures ?? []);
}

/**
 * Home-range geometry for a single tiger.
 * Endpoint: GET /api/tigers/:id/home-range
 * Status:   ✗ not implemented
 *
 * Expected shape: GeoJSON Polygon/Feature  — { type: 'Feature', geometry: {...}, properties: {...} }
 * UI fallback:    current Circle radius approach (homeRangeKm2 → metres radius)
 */
export async function getTigerHomeRange(id) {
  if (USE_MOCK) {
    // Return null: UI falls back to Circle radius from tiger.homeRangeKm2
    return null;
  }
  const { data, error } = await apiFetch(`/api/tigers/${id}/home-range`);
  if (error || !data) {
    console.warn(`[api] getTigerHomeRange(${id}): backend unavailable.`, error);
    return null;
  }
  return data; // GeoJSON Feature
}

/**
 * Movement trails / GPS tracks for all tigers.
 * Endpoint: none yet — may become GET /api/tigers/:id/tracks or similar.
 * Status:   ✗ not implemented (falls back to mock)
 *
 * Shape: { [tigerId]: [[lat, lng], ...] }
 */
export async function getTrails() {
  if (USE_MOCK) return MOCK_TRAILS;
  // TODO: replace with per-tiger endpoint when available
  console.warn('[api] getTrails: backend endpoint not yet defined, using mock data.');
  return MOCK_TRAILS;
}

/**
 * Camera trap / station network.
 * Endpoint: GET /api/stations
 * Status:   ✗ not implemented (falls back to mock cameras)
 */
export async function getCameras() {
  if (USE_MOCK) return MOCK_CAMERAS;
  const { data, error } = await apiFetch('/api/stations');
  if (error || !data) {
    console.warn('[api] getCameras (stations): backend unavailable, using mock data.', error);
    return MOCK_CAMERAS;
  }
  return Array.isArray(data) ? data.map(normaliseStation) : (data.stations ?? []).map(normaliseStation);
}

/**
 * All detections / capture records across the reserve.
 * Endpoint: GET /api/captures
 * Status:   ✗ not implemented
 */
export async function getCaptures() {
  if (USE_MOCK) return [];
  const { data, error } = await apiFetch('/api/captures');
  if (error || !data) {
    console.warn('[api] getCaptures: backend unavailable.', error);
    return [];
  }
  return Array.isArray(data) ? data : (data.captures ?? []);
}

/**
 * Active incident and anomaly alerts.
 * Endpoint: GET /api/alerts
 * Status:   ✗ not implemented (falls back to mock)
 */
export async function getAlerts() {
  if (USE_MOCK) return MOCK_ALERTS;
  const { data, error } = await apiFetch('/api/alerts');
  if (error || !data) {
    console.warn('[api] getAlerts: backend unavailable, using mock data.', error);
    return MOCK_ALERTS;
  }
  return Array.isArray(data) ? data.map(normaliseAlert) : (data.alerts ?? []).map(normaliseAlert);
}

/**
 * Single alert record by ID.
 * Endpoint: GET /api/alerts/:id
 * Status:   ✗ not implemented
 */
export async function getAlert(id) {
  if (USE_MOCK) return MOCK_ALERTS.find((a) => a.id === id) ?? null;
  const { data, error } = await apiFetch(`/api/alerts/${id}`);
  if (error || !data) {
    console.warn(`[api] getAlert(${id}): backend unavailable, using mock data.`, error);
    return MOCK_ALERTS.find((a) => a.id === id) ?? null;
  }
  return normaliseAlert(data);
}

/**
 * Occupancy / reserve-map GeoJSON (for future map overlay).
 * Endpoint: GET /api/occupancy/reserve-map
 * Status:   ✗ not implemented
 *
 * Expected shape: GeoJSON FeatureCollection (habitat zones, corridors, etc.)
 */
export async function getOccupancyMap() {
  if (USE_MOCK) return null; // No mock; UI should gracefully skip this overlay
  const { data, error } = await apiFetch('/api/occupancy/reserve-map');
  if (error || !data) {
    console.warn('[api] getOccupancyMap: backend unavailable.', error);
    return null;
  }
  return data; // GeoJSON FeatureCollection
}

/**
 * Home-range overlap / deviation data between tigers.
 * Endpoint: GET /api/occupancy/overlaps
 * Status:   ✗ not implemented
 *
 * Expected shape: [{ tigerId, overlapWith, overlapPct, deviationKm }]
 */
export async function getOccupancyOverlaps() {
  if (USE_MOCK) return [];
  const { data, error } = await apiFetch('/api/occupancy/overlaps');
  if (error || !data) {
    console.warn('[api] getOccupancyOverlaps: backend unavailable.', error);
    return [];
  }
  return Array.isArray(data) ? data : (data.overlaps ?? []);
}

/**
 * Historical ingest batch logs.
 * Endpoint: none yet (part of a future /api/ingestions or /api/captures batch endpoint).
 * Status:   ✗ not implemented (falls back to mock)
 */
export async function getIngestHistory() {
  if (USE_MOCK) return MOCK_INGEST_HISTORY;
  // TODO: replace with real endpoint when ingest API is implemented
  const { data, error } = await apiFetch('/api/ingestions');
  if (error || !data) {
    console.warn('[api] getIngestHistory: backend unavailable, using mock data.', error);
    return MOCK_INGEST_HISTORY;
  }
  return Array.isArray(data) ? data.map(normaliseIngestBatch) : (data.batches ?? []).map(normaliseIngestBatch);
}
