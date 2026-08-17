import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Circle, Polyline, GeoJSON, ZoomControl, useMap } from 'react-leaflet';
import { Sliders, X, ExternalLink, Map as MapIcon, Compass, Crosshair } from 'lucide-react';
import { getTigers, getCameras, getTrails, getOccupancyMap } from '../services/api';
import L from 'leaflet';

// ─── Custom Centroid Icon ───────────────────────────────────────────────────
function createCentroidIcon(color = '#4E8B71') {
  return L.divIcon({
    className: 'custom-centroid-pin',
    html: `<div style="width: 14px; height: 14px; border-radius: 50%; background: ${color}; border: 2.5px solid #FFFFFF; box-shadow: 0 0 6px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center;"><div style="width: 3px; height: 3px; border-radius: 50%; background: #FFFFFF;"></div></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

// ─── Map Controllers ────────────────────────────────────────────────────────
function MapFlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target && target.lat && target.lng) {
      map.flyTo([target.lat, target.lng], 14.5, { duration: 0.9, easeLinearity: 0.25 });
    }
  }, [target, map]);
  return null;
}

function ScaleControl() {
  const map = useMap();
  useEffect(() => {
    const ctrl = L.control.scale({ imperial: false, position: 'bottomleft' });
    ctrl.addTo(map);
    return () => ctrl.remove();
  }, [map]);
  return null;
}

// ─── Tactical Layer Control Floating Card ────────────────────────────────────
const LAYERS = [
  { id: 'cameras',   label: 'Camera Traps',            color: '#3182CE' },
  { id: 'tigers',    label: 'Tiger Positions',         color: '#4E8B71' },
  { id: 'kde95',     label: 'KDE 95% Home Range',      color: '#4E8B71' },
  { id: 'kde50',     label: 'KDE 50% Core Territory',  color: '#D68A27' },
  { id: 'mcp',       label: 'MCP Convex Hull',         color: '#805AD5' },
  { id: 'centroids', label: 'Territory Centroids',     color: '#E54D42' },
  { id: 'trails',    label: 'Movement Vector Paths',   color: '#94A3B8' },
];

function LayerPanel({ activeLayers, onToggle }) {
  return (
    <div style={{
      position: 'absolute', top: '1rem', right: '1rem', zIndex: 800,
      background: 'var(--bg-panel)', border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)', padding: '0.75rem 0.9rem', minWidth: '220px',
      boxShadow: 'var(--shadow-dropdown)',
    }}>
      <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.35rem' }}>
        <Sliders size={12} color="var(--status-normal)" /> GIS Telemetry & Range Layers
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {LAYERS.map(layer => {
          const isActive = activeLayers.has(layer.id);
          return (
            <label key={layer.id} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.2rem 0', cursor: 'pointer', userSelect: 'none' }}>
              <div style={{
                width: '12px', height: '12px', borderRadius: 'var(--radius-sm)',
                background: isActive ? layer.color : 'var(--bg-input)',
                border: `1px solid ${layer.color}`,
                flexShrink: 0, transition: 'all 0.15s ease',
              }} />
              <span style={{ fontSize: '0.72rem', color: isActive ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: isActive ? 600 : 400 }}>
                {layer.label}
              </span>
              <input type="checkbox" checked={isActive} onChange={() => onToggle(layer.id)} style={{ display: 'none' }} />
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ─── Entity Inspector Floating Card ─────────────────────────────────────────
function DetailPanel({ entity, type, onClose, onViewRegistry }) {
  if (!entity) return null;
  const statusColor = {
    normal: 'var(--status-normal)', warning: 'var(--status-warning)',
    critical: 'var(--status-critical)', online: 'var(--status-normal)', offline: 'var(--status-critical)',
  };
  const color = statusColor[entity.status] || 'var(--text-muted)';

  return (
    <div style={{
      position: 'absolute', bottom: '1.25rem', left: '1.25rem', zIndex: 800,
      background: 'var(--bg-panel)', border: `1px solid ${color}`,
      borderRadius: 'var(--radius-md)', width: '320px',
      boxShadow: 'var(--shadow-dropdown)', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '0.65rem 0.85rem', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{entity.id} · {type.toUpperCase()} INSPECTOR</span>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{entity.name || entity.id}</div>
        </div>
        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          {type === 'tiger' && (
            <button onClick={onViewRegistry} title="View in Registry" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '3px 7px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.65rem', fontFamily: 'var(--font-mono)' }}>
              <ExternalLink size={10} /> REGISTRY
            </button>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}>
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)' }}>Operational Status</span>
          <span className={`badge badge-${entity.status === 'online' ? 'normal' : entity.status === 'offline' ? 'critical' : entity.status}`}>
            ● {entity.status?.toUpperCase()}
          </span>
        </div>
        {type === 'tiger' && <>
          <Row label="Territory Zone" value={entity.zone} />
          <Row label="Confirmed Sightings" value={entity.sightings} />
          <Row label="KDE 95% Home Range" value={entity.kde95AreaKm2 ? `${entity.kde95AreaKm2} km²` : `${entity.homeRangeKm2 || 0} km²`} mono />
          <Row label="KDE 50% Core Territory" value={entity.kde50AreaKm2 ? `${entity.kde50AreaKm2} km²` : '—'} mono />
          <Row label="MCP Convex Hull Area" value={entity.mcpAreaKm2 ? `${entity.mcpAreaKm2} km²` : '—'} mono />
          <Row label="Movement Pattern" value={<span style={{ textTransform: 'capitalize' }}>{entity.movementTrend}</span>} />
          <Row label="Stripe Match Conf." value={`${entity.stripeMatchConfidence}%`} mono />
          <Row label="Last Telemetry Ping" value={entity.lastSeen ? new Date(entity.lastSeen).toLocaleString() : '—'} />
          {entity.notes && (
            <div style={{ marginTop: '0.25rem', padding: '0.45rem 0.6rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.4, borderLeft: `2.5px solid ${color}` }}>
              {entity.notes}
            </div>
          )}
        </>}
        {type === 'camera' && <>
          <Row label="Sector / Zone" value={entity.zone} />
          <Row label="Last Signal Transmission" value={entity.lastPing} />
          <Row label="Captured Images" value={entity.images} />
          <Row label="GPS Fix" value={`${entity.lat.toFixed(4)}°N ${entity.lng.toFixed(4)}°E`} mono />
        </>}
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--text-secondary)', fontFamily: mono ? 'var(--font-mono)' : undefined, fontSize: mono ? '0.65rem' : undefined }}>{value}</span>
    </div>
  );
}

// ─── Main Spatial View ───────────────────────────────────────────────────────
const PENCH_CENTER = [21.725, 79.302];
const STATUS_COLOR = {
  normal: '#4E8B71',
  warning: '#D68A27',
  critical: '#E54D42',
  info: '#3182CE',
  online: '#4E8B71',
  offline: '#E54D42',
};

export default function SpatialView({ selectedTiger, onSelectTiger, onNavigate }) {
  const [tigers, setTigers] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [trails, setTrails] = useState({});
  const [homeRanges, setHomeRanges] = useState([]);
  const [activeLayers, setActiveLayers] = useState(
    new Set(['cameras', 'tigers', 'kde95', 'kde50', 'mcp', 'centroids', 'trails'])
  );
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [entityType, setEntityType] = useState(null);
  const [mapTarget, setMapTarget] = useState(null);

  useEffect(() => {
    async function loadSpatialData() {
      const [t, c, tr, hr] = await Promise.all([
        getTigers(),
        getCameras(),
        getTrails(),
        getOccupancyMap(),
      ]);
      setTigers(t);
      setCameras(c);
      setTrails(tr);
      if (hr && Array.isArray(hr)) {
        setHomeRanges(hr);
      }
    }
    loadSpatialData();
  }, []);

  // Tiger lookup map for quick metadata matching
  const tigerMap = useMemo(() => {
    const map = {};
    for (const t of tigers) {
      map[t.id] = t;
    }
    return map;
  }, [tigers]);

  // Focus entity if passed externally
  useEffect(() => {
    if (selectedTiger) {
      setMapTarget(selectedTiger);
      setSelectedEntity(selectedTiger);
      setEntityType('tiger');
    }
  }, [selectedTiger]);

  const toggleLayer = useCallback((id) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleTigerClick = useCallback((tiger) => {
    setSelectedEntity(tiger);
    setEntityType('tiger');
    setMapTarget(tiger);
    if (onSelectTiger) onSelectTiger(tiger);
  }, [onSelectTiger]);

  const handleCameraClick = useCallback((cam) => {
    setSelectedEntity(cam);
    setEntityType('camera');
    setMapTarget({ lat: cam.lat, lng: cam.lng });
  }, []);

  const handleClose = useCallback(() => {
    setSelectedEntity(null);
    setEntityType(null);
    setMapTarget(null);
    if (onSelectTiger) onSelectTiger(null);
  }, [onSelectTiger]);

  return (
    <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--bg-base)' }}>
      {/* Header toolbar */}
      <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <MapIcon size={14} color="var(--status-normal)" /> Full-Screen GIS Spatial Telemetry & Home Range Engine
        </span>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          <span>ENTITIES: <strong style={{ color: 'var(--text-primary)' }}>{tigers.length}</strong> TRACKED</span>
          <span>|</span>
          <span>HOME RANGES: <strong style={{ color: 'var(--status-normal)' }}>{homeRanges.length}</strong> COMPUTED</span>
          <span>|</span>
          <span>CAMERAS: <strong style={{ color: 'var(--status-normal)' }}>{cameras.filter(c => c.status === 'online').length}/{cameras.length}</strong> ACTIVE</span>
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer center={PENCH_CENTER} zoom={12.5} zoomControl={false} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            className="gis-satellite-tiles"
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            opacity={0.6}
          />
          <ZoomControl position="bottomright" />
          <ScaleControl />
          <MapFlyTo target={mapTarget} />

          {/* ─── 1. KDE 95% Overall Home Range (GeoJSON) ───────────────────────── */}
          {activeLayers.has('kde95') && homeRanges.map((hr) => {
            const tiger = tigerMap[hr.individual_id] || { id: hr.individual_id, status: 'normal' };
            const isSelected = selectedEntity?.id === tiger.id;
            const geom = hr.kde_95?.geojson || (hr.method === 'KDE' ? hr.geojson : null);
            if (!geom) return null;

            const color = STATUS_COLOR[tiger.status] || '#4E8B71';
            const area = hr.kde_95?.area_sq_km || hr.area_sq_km || 0;

            return (
              <GeoJSON
                key={`kde95-${tiger.id}-${hr.id || 'k95'}`}
                data={geom}
                style={{
                  color,
                  weight: isSelected ? 2.5 : 1.5,
                  fillColor: color,
                  fillOpacity: isSelected ? 0.22 : 0.12,
                  dashArray: tiger.status === 'critical' ? '6 4' : undefined,
                }}
                eventHandlers={{
                  click: () => handleTigerClick(tiger),
                }}
                onEachFeature={(feature, layer) => {
                  layer.bindTooltip(
                    `<div style="font-family: monospace; font-size: 11px;">` +
                    `<strong>${tiger.name || tiger.id}</strong><br/>` +
                    `<span>Layer: <strong>KDE 95% Range</strong></span><br/>` +
                    `<span>Area: <strong>${area} km²</strong></span><br/>` +
                    `<span>Sightings: ${tiger.sightings || hr.points_count || 0}</span>` +
                    `</div>`,
                    { sticky: true, className: 'leaflet-tactical-tooltip' }
                  );
                }}
              />
            );
          })}

          {/* ─── 2. KDE 50% Core Territory (GeoJSON) ──────────────────────────── */}
          {activeLayers.has('kde50') && homeRanges.map((hr) => {
            const tiger = tigerMap[hr.individual_id] || { id: hr.individual_id, status: 'normal' };
            const isSelected = selectedEntity?.id === tiger.id;
            const geom = hr.kde_50?.geojson;
            if (!geom) return null;

            const area = hr.kde_50?.area_sq_km || 0;

            return (
              <GeoJSON
                key={`kde50-${tiger.id}-${hr.id || 'k50'}`}
                data={geom}
                style={{
                  color: '#D68A27',
                  weight: isSelected ? 2.5 : 1.8,
                  fillColor: '#D68A27',
                  fillOpacity: isSelected ? 0.35 : 0.22,
                }}
                eventHandlers={{
                  click: () => handleTigerClick(tiger),
                }}
                onEachFeature={(feature, layer) => {
                  layer.bindTooltip(
                    `<div style="font-family: monospace; font-size: 11px;">` +
                    `<strong>${tiger.name || tiger.id}</strong><br/>` +
                    `<span>Layer: <strong>KDE 50% Core Territory</strong></span><br/>` +
                    `<span>Area: <strong>${area} km²</strong></span>` +
                    `</div>`,
                    { sticky: true, className: 'leaflet-tactical-tooltip' }
                  );
                }}
              />
            );
          })}

          {/* ─── 3. MCP Convex Hull (GeoJSON) ─────────────────────────────────── */}
          {activeLayers.has('mcp') && homeRanges.map((hr) => {
            const tiger = tigerMap[hr.individual_id] || { id: hr.individual_id, status: 'normal' };
            const isSelected = selectedEntity?.id === tiger.id;
            const geom = hr.mcp?.geojson || (hr.method === 'MCP' ? hr.geojson : null);
            if (!geom) return null;

            const area = hr.mcp?.area_sq_km || hr.area_sq_km || 0;

            return (
              <GeoJSON
                key={`mcp-${tiger.id}-${hr.id || 'mcp'}`}
                data={geom}
                style={{
                  color: '#805AD5',
                  weight: isSelected ? 2.5 : 1.5,
                  fillColor: '#805AD5',
                  fillOpacity: isSelected ? 0.15 : 0.07,
                  dashArray: '5 5',
                }}
                eventHandlers={{
                  click: () => handleTigerClick(tiger),
                }}
                onEachFeature={(feature, layer) => {
                  layer.bindTooltip(
                    `<div style="font-family: monospace; font-size: 11px;">` +
                    `<strong>${tiger.name || tiger.id}</strong><br/>` +
                    `<span>Layer: <strong>MCP Convex Hull</strong></span><br/>` +
                    `<span>Area: <strong>${area} km²</strong></span>` +
                    `</div>`,
                    { sticky: true, className: 'leaflet-tactical-tooltip' }
                  );
                }}
              />
            );
          })}

          {/* ─── 4. Movement Trails ───────────────────────────────────────────── */}
          {activeLayers.has('trails') && tigers.map(t => {
            const trail = trails[t.id];
            if (!trail) return null;
            return (
              <Polyline key={`trail-${t.id}`} positions={trail}
                pathOptions={{ color: STATUS_COLOR[t.status], weight: 2, opacity: 0.6, dashArray: '6 4' }}
              />
            );
          })}

          {/* ─── 5. Territory Centroids ───────────────────────────────────────── */}
          {activeLayers.has('centroids') && homeRanges.map(hr => {
            const centroid = hr.centroid || hr.mcp?.centroid || hr.kde_95?.centroid;
            if (!centroid?.lat || !centroid?.lng) return null;
            const tiger = tigerMap[hr.individual_id] || { id: hr.individual_id, status: 'normal' };
            const isSelected = selectedEntity?.id === tiger.id;

            return (
              <Circle
                key={`centroid-${tiger.id}`}
                center={[centroid.lat, centroid.lng]}
                radius={isSelected ? 100 : 70}
                pathOptions={{
                  color: '#FFFFFF',
                  fillColor: '#E54D42',
                  fillOpacity: 1,
                  weight: 2,
                }}
                eventHandlers={{ click: () => handleTigerClick(tiger) }}
              />
            );
          })}

          {/* ─── 6. Tiger markers ─────────────────────────────────────────────── */}
          {activeLayers.has('tigers') && tigers.map(t => {
            const isSelected = selectedEntity?.id === t.id;
            const color = STATUS_COLOR[t.status];
            return (
              <Circle key={`tiger-${t.id}`}
                center={[t.lat, t.lng]}
                radius={isSelected ? 220 : 140}
                pathOptions={{ color, fillColor: color, fillOpacity: isSelected ? 1 : 0.85, weight: isSelected ? 3 : 1.5 }}
                eventHandlers={{ click: () => handleTigerClick(t) }}
              />
            );
          })}

          {/* ─── 7. Camera markers ────────────────────────────────────────────── */}
          {activeLayers.has('cameras') && cameras.map(cam => {
            const color = STATUS_COLOR[cam.status];
            const isSelected = selectedEntity?.id === cam.id;
            return (
              <Circle key={`cam-${cam.id}`}
                center={[cam.lat, cam.lng]}
                radius={isSelected ? 120 : 80}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.7, weight: 1 }}
                eventHandlers={{ click: () => handleCameraClick(cam) }}
              />
            );
          })}
        </MapContainer>

        {/* Overlay controls */}
        <LayerPanel activeLayers={activeLayers} onToggle={toggleLayer} />
        <DetailPanel
          entity={selectedEntity}
          type={entityType}
          onClose={handleClose}
          onViewRegistry={() => { if (onSelectTiger) onSelectTiger(selectedEntity); if (onNavigate) onNavigate('registry'); }}
        />

        {/* Tactical Legend */}
        <div style={{
          position: 'absolute', top: '1rem', left: '1rem', zIndex: 800,
          background: 'var(--bg-panel)', border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)', padding: '0.65rem 0.85rem',
          fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)',
          boxShadow: 'var(--shadow-dropdown)',
        }}>
          <div style={{ marginBottom: '0.35rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.6rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.2rem' }}>GIS Symbology</div>
          {[
            { color: '#4E8B71', label: 'KDE 95% Home Range' },
            { color: '#D68A27', label: 'KDE 50% Core Territory' },
            { color: '#805AD5', label: 'MCP Convex Hull' },
            { color: '#E54D42', label: 'Territory Centroid' },
            { color: '#3182CE', label: 'Camera Trap' }
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
              <span>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
