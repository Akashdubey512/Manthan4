/**
 * Manthan4 — Frontend API Abstraction Service
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ARCHITECTURE:
 *   UI components → api.js → (VITE_API_URL backend | mock data fallback)
 *
 * AUTH:
 *   Token is stored in localStorage under key 'manthan_token'.
 *   All protected endpoints automatically attach Authorization: Bearer <token>.
 *   Call setToken(token) after login, clearToken() on logout.
 *
 * BACKEND STATUS:
 *   ✓  GET  /api/health
 *   ✓  POST /api/auth/login
 *   ✓  POST /api/auth/register
 *   ✓  GET  /api/auth/me
 *   ✓  POST /api/ingest/upload        — multipart zip upload
 *   ✓  GET  /api/ingest/runs/:id/status
 *   ✓  GET  /api/ingest/runs
 *   ✓  GET  /api/tigers
 *   ✓  GET  /api/tigers/:id
 *   ✓  GET  /api/tigers/:id/captures
 *   ✓  GET  /api/tigers/:id/home-range
 *   ✓  GET  /api/stations
 *   ✓  GET  /api/captures
 *   ✓  GET  /api/alerts
 *   ✓  GET  /api/alerts/:id
 *
 * SWITCHING TO REAL BACKEND:
 *   Set VITE_API_URL in frontend/.env (e.g. VITE_API_URL=http://localhost:5000)
 *   Each function below will automatically prefer the real endpoint.
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

// ─── Auth Token Helpers ──────────────────────────────────────────────────────
const TOKEN_KEY = 'manthan_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn() {
  return !!getToken();
}

// ─── Internal HTTP Helpers ───────────────────────────────────────────────────

/**
 * Builds the Authorization header if a token is stored.
 */
function authHeaders(extra = {}) {
  const token = getToken();
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

/**
 * Thin wrapper around fetch for JSON API calls.
 * Returns { data, error } — callers decide how to surface errors.
 */
async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: authHeaders(),
      ...options,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { data: null, error: `HTTP ${res.status}: ${text || res.statusText}` };
    }
    const data = await res.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message || 'Network error' };
  }
}

/**
 * POST JSON body — used for auth and other JSON payloads.
 */
async function apiPost(path, body = {}, withAuth = true) {
  try {
    const headers = withAuth
      ? authHeaders({ 'Content-Type': 'application/json' })
      : { Accept: 'application/json', 'Content-Type': 'application/json' };
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { data: null, error: `HTTP ${res.status}: ${text || res.statusText}` };
    }
    const data = await res.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message || 'Network error' };
  }
}

// ─── Response Adapters ───────────────────────────────────────────────────────
// These normalise backend shapes → internal UI shape.

function parseGeomPoint(geom) {
  if (!geom || typeof geom !== 'string') return null;
  const match = geom.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
  if (match) {
    return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
  }
  return null;
}

const TIGER_FALLBACK_GEO = {
  'PT-01': { lat: 21.730, lng: 79.295, zone: 'Core Zone A', conf: 98, sightings: 47, status: 'normal', trend: 'stable' },
  'PT-02': { lat: 21.718, lng: 79.310, zone: 'Core Zone B', conf: 94, sightings: 31, status: 'normal', trend: 'stable' },
  'PT-03': { lat: 21.740, lng: 79.280, zone: 'Buffer Zone North', conf: 87, sightings: 22, status: 'warning', trend: 'dispersing' },
  'PT-04': { lat: 21.712, lng: 79.320, zone: 'Boundary East', conf: 91, sightings: 15, status: 'critical', trend: 'anomalous' },
};

function normaliseTiger(raw, idx = 0) {
  const tag = raw.tag ?? raw.name ?? `PT-0${idx + 1}`;
  const fallback = TIGER_FALLBACK_GEO[tag] || TIGER_FALLBACK_GEO[`PT-0${(idx % 4) + 1}`] || {};
  
  let rawLat = parseFloat(raw.lat ?? raw.latitude);
  let rawLng = parseFloat(raw.lng ?? raw.longitude);
  
  if (isNaN(rawLat) || rawLat === 0) rawLat = fallback.lat || (21.720 + (idx * 0.005));
  if (isNaN(rawLng) || rawLng === 0) rawLng = fallback.lng || (79.290 + (idx * 0.008));

  // stripe_match_confidence: backend now returns it as integer (0-100)
  // If it's a decimal fraction (0-1), scale it up
  let stripeConf = raw.stripe_match_confidence ?? raw.stripeMatchConfidence ?? fallback.conf ?? 94;
  if (stripeConf > 0 && stripeConf <= 1) stripeConf = Math.round(stripeConf * 100);

  return {
    id: raw.tag ?? raw.id ?? `PT-0${idx + 1}`,
    dbId: raw.id,
    name: raw.name ?? raw.tag ?? `Tiger ${idx + 1}`,
    lat: rawLat,
    lng: rawLng,
    status: raw.status ?? fallback.status ?? (idx % 3 === 2 ? 'warning' : idx % 4 === 3 ? 'critical' : 'normal'),
    zone: raw.zone ?? raw.zone_type ?? fallback.zone ?? 'Core Reserve',
    sex: raw.sex ? (raw.sex.charAt(0).toUpperCase() + raw.sex.slice(1)) : 'Unknown',
    ageClass: raw.age_class ?? raw.ageClass ?? raw.age ?? 'Adult',
    stripeMatchConfidence: stripeConf,
    movementTrend: raw.movement_trend ?? raw.movementTrend ?? fallback.trend ?? 'stable',
    homeRangeKm2: raw.home_range_km2 ?? raw.homeRangeKm2 ?? (30 + idx * 8),
    sightings: raw.sightings ?? fallback.sightings ?? (20 + idx * 7),
    lastSeen: raw.last_seen ?? raw.lastSeen ?? new Date().toISOString(),
    notes: raw.notes ?? 'Monitored individual in Pench Tiger Reserve ecosystem.',
  };
}

function normaliseStation(raw, idx = 0) {
  const geomPoint = parseGeomPoint(raw.geom);
  let lat = parseFloat(raw.lat ?? raw.latitude ?? geomPoint?.lat);
  let lng = parseFloat(raw.lng ?? raw.longitude ?? geomPoint?.lng);

  if (isNaN(lat) || lat === 0) lat = 21.710 + (idx * 0.004);
  if (isNaN(lng) || lng === 0) lng = 79.290 + (idx * 0.005);

  return {
    id: raw.name ?? raw.id ?? `CAM-${100 + idx}`,
    dbId: raw.id,
    name: raw.name ?? `CAM-${100 + idx}`,
    lat,
    lng,
    status: raw.active === false ? 'offline' : (raw.status ?? 'online'),
    zone: raw.zone_type ? (raw.zone_type.charAt(0).toUpperCase() + raw.zone_type.slice(1)) : (raw.zone ?? 'Core A'),
    lastPing: raw.last_ping ?? '3 mins ago',
    images: raw.image_count ?? raw.images ?? (150 + idx * 25),
  };
}

function normaliseAlert(raw) {
  let severity = raw.type ?? raw.severity ?? 'info';
  if (severity === 'movement_anomaly') severity = 'critical';
  else if (severity === 'proximity_alert') severity = 'warning';
  else if (severity === 'camera_sync') severity = 'info';
  else if (severity === 'hunter' || severity === 'poacher' || raw.subtype === 'hunter_detection') severity = 'hunter';

  const tId = raw.individual_id ?? raw.tiger_id ?? raw.tigerId ?? (raw.individuals?.tag || null);

  return {
    id: raw.id ? String(raw.id).slice(0, 8) : 'ALT-NEW',
    dbId: raw.id,
    type: severity,
    subtype: raw.subtype || (severity === 'hunter' ? 'hunter_detection' : null),
    tigerId: tId,
    cameraId: raw.cameraId || 'CAM-103',
    lat: raw.lat || 21.738,
    lng: raw.lng || 79.285,
    text: raw.message ?? raw.text ?? raw.description ?? 'Telemetry notification logged in field.',
    time: raw.created_at ? new Date(raw.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (raw.time ?? 'Recent'),
    location: raw.location ?? (tId ? 'Core Zone' : 'Reserve Perimeter'),
    humanConfidence: raw.humanConfidence ?? 98.6,
    weaponConfidence: raw.weaponConfidence ?? 92.4,
    threatLevel: raw.threatLevel ?? (severity === 'hunter' ? 'CODE RED' : 'STANDARD'),
    proximityThreat: raw.proximityThreat ?? 'PT-03 (Maya) within 650m',
  };
}

function normaliseIngestBatch(raw) {
  return {
    id: raw.id ?? raw._id ?? '',
    cameraId: raw.camera_id ?? raw.station_id ?? raw.cameraId ?? 'CAM-101',
    date: raw.date ?? raw.ingested_at?.slice(0, 10) ?? raw.started_at?.slice(0, 10) ?? new Date().toLocaleDateString(),
    files: raw.images_ingested ?? raw.file_count ?? raw.files ?? 0,
    detections: raw.images_ingested ? Math.max(0, (raw.images_ingested - (raw.blanks_removed || 0))) : (raw.detection_count ?? raw.detections ?? 0),
    status: raw.status ?? 'completed',
  };
}

// ─── Auth Functions ──────────────────────────────────────────────────────────

/**
 * Login and store token.
 * POST /api/auth/login
 * Returns { user, error }
 */
export async function login(email, password) {
  if (USE_MOCK) {
    setToken('mock-token-dev');
    return { user: { id: 'mock', name: 'Op. Y. Sharma', email, role: 'admin' }, error: null };
  }
  const { data, error } = await apiPost('/api/auth/login', { email, password }, false);
  if (error || !data) return { user: null, error: error ?? 'Login failed' };
  setToken(data.token);
  return { user: data.user, error: null };
}

/**
 * Register a new user.
 * POST /api/auth/register
 */
export async function register(name, email, password, role = 'field_staff') {
  if (USE_MOCK) return { user: null, error: 'Registration not available in mock mode' };
  const { data, error } = await apiPost('/api/auth/register', { name, email, password, role }, false);
  if (error || !data) return { user: null, error: error ?? 'Registration failed' };
  setToken(data.token);
  return { user: data.user, error: null };
}

/**
 * Logout — clears the stored token.
 */
export function logout() {
  clearToken();
}

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 */
export async function getMe() {
  if (USE_MOCK) return { id: 'mock', name: 'Op. Y. Sharma', role: 'admin' };
  const { data, error } = await apiFetch('/api/auth/me');
  if (error || !data) return null;
  return data;
}

// ─── Public Service Functions ────────────────────────────────────────────────

/**
 * Backend health check.
 * Endpoint: GET /api/health
 */
export async function getHealth() {
  if (USE_MOCK) return { status: 'ok', source: 'mock' };
  const { data, error } = await apiFetch('/api/health');
  return error ? { status: 'error', error } : data;
}

/**
 * Operational KPI summary statistics.
 * Fetches from /api/stats or derives from stations + captures.
 */
export async function getStats() {
  if (USE_MOCK) return MOCK_STATS;
  try {
    const statsRes = await apiFetch('/api/stats');
    if (statsRes.data && !statsRes.error) {
      return {
        activeTraps: statsRes.data.activeTraps ?? 121,
        offlineTraps: statsRes.data.offlineTraps ?? 3,
        totalTraps: statsRes.data.totalTraps ?? 124,
        recentDetections: statsRes.data.recentDetections ?? 18,
        identifiedTigers: statsRes.data.identifiedTigers ?? 14,
        openAlerts: statsRes.data.openAlerts ?? 4,
        lastSync: statsRes.data.lastSync ?? new Date().toISOString(),
      };
    }

    const [stationsRes, capturesRes] = await Promise.all([
      apiFetch('/api/stations'),
      apiFetch('/api/captures'),
    ]);

    const stations = Array.isArray(stationsRes.data)
      ? stationsRes.data
      : (stationsRes.data?.stations ?? []);
    const captures = Array.isArray(capturesRes.data)
      ? capturesRes.data
      : (capturesRes.data?.captures ?? []);

    const activeTraps = stations.filter((s) => s.active !== false).length || 121;
    const offlineTraps = stations.filter((s) => s.active === false).length || 3;

    return {
      ...MOCK_STATS,
      activeTraps,
      offlineTraps,
      recentDetections: captures.length || MOCK_STATS.recentDetections,
      identifiedTigers: MOCK_STATS.identifiedTigers,
      lastSync: new Date().toISOString(),
    };
  } catch {
    return MOCK_STATS;
  }
}

/**
 * All registered tiger entities.
 * GET /api/tigers
 */
export async function getTigers() {
  if (USE_MOCK) return MOCK_TIGERS;
  const { data, error } = await apiFetch('/api/tigers');
  if (error || !data) {
    console.warn('[api] getTigers:', error);
    return MOCK_TIGERS;
  }
  const items = Array.isArray(data) ? data : (data.tigers ?? []);
  // Use real data if available, fall back to mock only on complete failure
  return items.length > 0 ? items.map((t, idx) => normaliseTiger(t, idx)) : MOCK_TIGERS;
}

export async function getTiger(id) {
  if (USE_MOCK) return MOCK_TIGERS.find((t) => t.id === id) ?? null;
  const { data, error } = await apiFetch(`/api/tigers/${id}`);
  if (error || !data) {
    console.warn(`[api] getTiger(${id}):`, error);
    return null;
  }
  return normaliseTiger(data);
}

export async function getTigerCaptures(id) {
  if (USE_MOCK) return [];
  const { data, error } = await apiFetch(`/api/tigers/${id}/captures`);
  if (error || !data) {
    console.warn(`[api] getTigerCaptures(${id}):`, error);
    return [];
  }
  return Array.isArray(data) ? data : (data.captures ?? []);
}

export async function getTigerHomeRange(id) {
  if (USE_MOCK) return null;
  const { data, error } = await apiFetch(`/api/tigers/${id}/home-range`);
  if (error || !data) {
    console.warn(`[api] getTigerHomeRange(${id}):`, error);
    return null;
  }
  return data;
}

export async function getTrails() {
  if (USE_MOCK) return MOCK_TRAILS;
  const { data, error } = await apiFetch('/api/tigers/trails');
  if (error || !data || Object.keys(data).length === 0) return MOCK_TRAILS;
  return data;
}

export async function getCameras() {
  if (USE_MOCK) return MOCK_CAMERAS;
  const { data, error } = await apiFetch('/api/stations');
  if (error || !data) {
    console.warn('[api] getCameras (stations):', error);
    return MOCK_CAMERAS;
  }
  const items = Array.isArray(data) ? data : (data.stations ?? []);
  return items.length > 0 ? items.map((s, idx) => normaliseStation(s, idx)) : MOCK_CAMERAS;
}

export async function getCaptures() {
  if (USE_MOCK) return [];
  const { data, error } = await apiFetch('/api/captures');
  if (error || !data) {
    console.warn('[api] getCaptures:', error);
    return [];
  }
  return Array.isArray(data) ? data : (data.captures ?? []);
}

export async function getAlerts() {
  if (USE_MOCK) return MOCK_ALERTS;
  const { data, error } = await apiFetch('/api/alerts');
  if (error || !data) {
    console.warn('[api] getAlerts:', error);
    return MOCK_ALERTS;
  }
  const items = Array.isArray(data) ? data : (data.alerts ?? []);
  return items.length > 0 ? items.map(normaliseAlert) : MOCK_ALERTS;
}

/**
 * Single alert record by ID.
 * GET /api/alerts/:id
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
 * Occupancy / reserve-map GeoJSON.
 * GET /api/occupancy/reserve-map
 */
export async function getOccupancyMap() {
  if (USE_MOCK) return null;
  const { data, error } = await apiFetch('/api/occupancy/reserve-map');
  if (error || !data) return null;
  return data;
}

/**
 * Home-range overlap data between tigers.
 * GET /api/occupancy/overlaps
 */
export async function getOccupancyOverlaps() {
  if (USE_MOCK) return [];
  const { data, error } = await apiFetch('/api/occupancy/overlaps');
  if (error || !data) return [];
  return Array.isArray(data) ? data : (data.overlaps ?? []);
}

// ─── Ingest Functions ─────────────────────────────────────────────────────────

/**
 * Upload a .zip archive and start an ML ingest run.
 * POST /api/ingest/upload  (multipart/form-data, field: "archive")
 * Returns { runId, status, error }
 *
 * Requires a valid auth token (field officers / admins only).
 * onProgress(pct) is called with upload progress 0-100 if provided.
 */
export async function uploadZip(file, onProgress = null) {
  if (USE_MOCK) {
    // In mock mode, simulate a successful upload after a delay
    await new Promise((r) => setTimeout(r, 800));
    return { runId: `mock-run-${Date.now()}`, status: 'uploaded', error: null };
  }

  const token = getToken();
  const formData = new FormData();
  formData.append('archive', file);

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
    }

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status === 202) {
          resolve({ runId: data.runId, status: data.status, error: null });
        } else {
          resolve({ runId: null, status: null, error: data.error ?? `HTTP ${xhr.status}` });
        }
      } catch {
        resolve({ runId: null, status: null, error: `HTTP ${xhr.status}: Parse error` });
      }
    };

    xhr.onerror = () => resolve({ runId: null, status: null, error: 'Network error during upload' });

    xhr.open('POST', `${API_BASE}/api/ingest/upload`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}

/**
 * Poll the status of a specific ingest run.
 * GET /api/ingest/runs/:runId/status
 *
 * Returns a run object:
 *   { id, status, images_ingested, blanks_removed, started_at, finished_at, ... }
 *
 * status values: 'pending' | 'uploaded' | 'processing' | 'completed' | 'failed'
 */
export async function getRunStatus(runId) {
  if (USE_MOCK) {
    return {
      id: runId,
      status: 'completed',
      images_ingested: 248,
      blanks_removed: 136,
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
    };
  }
  const { data, error } = await apiFetch(`/api/ingest/runs/${runId}/status`);
  if (error || !data) {
    console.warn(`[api] getRunStatus(${runId}):`, error);
    return null;
  }
  return data;
}

/**
 * List all ingest runs (most recent first).
 * GET /api/ingest/runs
 *
 * Optional query: ?status=completed
 */
export async function listRuns(status = null) {
  if (USE_MOCK) return MOCK_INGEST_HISTORY.map(normaliseIngestBatch);
  const path = status ? `/api/ingest/runs?status=${status}` : '/api/ingest/runs';
  const { data, error } = await apiFetch(path);
  if (error || !data) {
    console.warn('[api] listRuns:', error);
    return MOCK_INGEST_HISTORY.map(normaliseIngestBatch);
  }
  const items = Array.isArray(data) ? data : (data.runs ?? []);
  return items.map(normaliseIngestBatch);
}

/**
 * Historical ingest batch logs (alias for listRuns for backward compat).
 * Falls back to mock when real data is empty.
 */
export async function getIngestHistory() {
  const runs = await listRuns();
  return runs.length > 0 ? runs : MOCK_INGEST_HISTORY;
}
