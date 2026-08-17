import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Circle, Polyline, ZoomControl, useMap } from 'react-leaflet';
import { Layers, Camera, Eye, AlertTriangle, Map as MapIcon, ChevronRight, X, ExternalLink } from 'lucide-react';
import { MOCK_TIGERS, MOCK_CAMERAS, MOCK_TRAILS } from '../services/mockData';
import L from 'leaflet';

// ─── Map controllers ────────────────────────────────────────────────────────
function MapFlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 14, { duration: 0.9, easeLinearity: 0.25 });
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

// ─── Layer Controls ──────────────────────────────────────────────────────────
const LAYERS = [
  { id: 'cameras',    label: 'Cameras',    color: '#4F86A6' },
  { id: 'tigers',     label: 'Tigers',     color: '#5C8A73' },
  { id: 'trails',     label: 'Trails',     color: '#9BA9A0' },
  { id: 'zones',      label: 'Home Ranges',color: '#5C8A73' },
  { id: 'anomalies',  label: 'Anomalies',  color: '#C45041' },
];

function LayerPanel({ activeLayers, onToggle }) {
  return (
    <div style={{
      position: 'absolute', top: '1rem', right: '1rem', zIndex: 800,
      background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)', padding: '0.75rem', minWidth: '160px',
      boxShadow: 'var(--shadow-panel)',
    }}>
      <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <Layers size={11} /> Layers
      </div>
      {LAYERS.map(layer => (
        <label key={layer.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0', cursor: 'pointer' }}>
          <div style={{
            width: '10px', height: '10px', borderRadius: '2px',
            background: activeLayers.has(layer.id) ? layer.color : 'var(--border-default)',
            border: `1px solid ${layer.color}`,
            flexShrink: 0, transition: 'background 0.15s ease',
          }} />
          <span style={{ fontSize: '0.75rem', color: activeLayers.has(layer.id) ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {layer.label}
          </span>
          <input type="checkbox" checked={activeLayers.has(layer.id)} onChange={() => onToggle(layer.id)} style={{ display: 'none' }} />
        </label>
      ))}
    </div>
  );
}

// ─── Entity Detail Panel ─────────────────────────────────────────────────────
function DetailPanel({ entity, type, onClose, onViewRegistry }) {
  if (!entity) return null;
  const statusColor = {
    normal: 'var(--status-normal)', warning: 'var(--status-warning)',
    critical: 'var(--status-critical)', online: 'var(--status-normal)', offline: 'var(--status-critical)',
  };
  const color = statusColor[entity.status] || 'var(--text-muted)';

  return (
    <div style={{
      position: 'absolute', bottom: '1rem', left: '1rem', zIndex: 800,
      background: 'var(--bg-elevated)', border: `1px solid ${color}`,
      borderRadius: 'var(--radius-md)', width: '280px',
      boxShadow: 'var(--shadow-panel)', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '0.6rem 0.75rem', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{entity.id} · {type.toUpperCase()}</span>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{entity.name || entity.id}</div>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {type === 'tiger' && (
            <button onClick={onViewRegistry} title="View in Registry" style={{ background: 'none', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '3px 6px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.65rem' }}>
              <ExternalLink size={11} /> Registry
            </button>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}>
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Status</span>
          <span style={{ color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.7rem' }}>● {entity.status}</span>
        </div>
        {type === 'tiger' && <>
          <Row label="Zone" value={entity.zone} />
          <Row label="Sightings" value={entity.sightings} />
          <Row label="Trend" value={entity.movementTrend} />
          <Row label="Match Conf." value={`${entity.stripeMatchConfidence}%`} />
          <Row label="Last Seen" value={new Date(entity.lastSeen).toLocaleString()} />
          {entity.notes && (
            <div style={{ marginTop: '0.25rem', padding: '0.4rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.4, borderLeft: `2px solid ${color}` }}>
              {entity.notes}
            </div>
          )}
        </>}
        {type === 'camera' && <>
          <Row label="Zone" value={entity.zone} />
          <Row label="Last Ping" value={entity.lastPing} />
          <Row label="Images" value={entity.images} />
          <Row label="Coordinates" value={`${entity.lat.toFixed(4)}°N ${entity.lng.toFixed(4)}°E`} mono />
        </>}
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--text-secondary)', fontFamily: mono ? 'var(--font-mono)' : undefined, fontSize: mono ? '0.65rem' : undefined }}>{value}</span>
    </div>
  );
}

// ─── Main Spatial View ───────────────────────────────────────────────────────
const PENCH_CENTER = [21.725, 79.302];
const STATUS_COLOR = { normal: '#5C8A73', warning: '#D98C40', critical: '#C45041', info: '#4F86A6', online: '#5C8A73', offline: '#C45041' };

export default function SpatialView({ selectedTiger, onSelectTiger, onNavigate }) {
  const [activeLayers, setActiveLayers] = useState(new Set(['cameras', 'tigers', 'zones', 'anomalies', 'trails']));
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [entityType, setEntityType] = useState(null);
  const [mapTarget, setMapTarget] = useState(null);

  // When a tiger is passed from Overview/Registry, focus on it
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
    onSelectTiger(tiger);
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
    onSelectTiger(null);
  }, [onSelectTiger]);

  return (
    <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header bar */}
      <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <MapIcon size={14} color="var(--text-muted)" /> Full-Screen Spatial Intelligence
        </span>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          <span>{MOCK_TIGERS.length} entities tracked</span>
          <span>|</span>
          <span>{MOCK_CAMERAS.filter(c => c.status === 'online').length}/{MOCK_CAMERAS.length} cameras online</span>
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer center={PENCH_CENTER} zoom={12} zoomControl={false} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://carto.com">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <ZoomControl position="bottomright" />
          <ScaleControl />
          <MapFlyTo target={mapTarget} />

          {/* Home Range Zones */}
          {activeLayers.has('zones') && MOCK_TIGERS.map(t => (
            <Circle key={`zone-${t.id}`} center={[t.lat, t.lng]} radius={1500}
              pathOptions={{ color: STATUS_COLOR[t.status], fillColor: STATUS_COLOR[t.status], fillOpacity: 0.06, weight: 1, dashArray: t.status === 'critical' ? '6 4' : t.status === 'warning' ? '4 3' : undefined }}
            />
          ))}

          {/* Movement Trails */}
          {activeLayers.has('trails') && MOCK_TIGERS.map(t => {
            const trail = MOCK_TRAILS[t.id];
            if (!trail) return null;
            return (
              <Polyline key={`trail-${t.id}`} positions={trail}
                pathOptions={{ color: STATUS_COLOR[t.status], weight: 2, opacity: 0.6, dashArray: '6 4' }}
              />
            );
          })}

          {/* Tiger markers */}
          {activeLayers.has('tigers') && MOCK_TIGERS.map(t => {
            const isSelected = selectedEntity?.id === t.id;
            const color = STATUS_COLOR[t.status];
            return (
              <Circle key={`tiger-${t.id}`}
                center={[t.lat, t.lng]}
                radius={isSelected ? 200 : 140}
                pathOptions={{ color, fillColor: color, fillOpacity: isSelected ? 1 : 0.85, weight: isSelected ? 3 : 1.5 }}
                eventHandlers={{ click: () => handleTigerClick(t) }}
              />
            );
          })}

          {/* Camera markers */}
          {activeLayers.has('cameras') && MOCK_CAMERAS.map(cam => {
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
          onViewRegistry={() => { onSelectTiger(selectedEntity); onNavigate('registry'); }}
        />

        {/* Legend */}
        <div style={{
          position: 'absolute', top: '1rem', left: '1rem', zIndex: 800,
          background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)', padding: '0.6rem 0.75rem',
          fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)',
        }}>
          <div style={{ marginBottom: '0.3rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.6rem' }}>Legend</div>
          {[{ color: '#5C8A73', label: 'Nominal' }, { color: '#D98C40', label: 'Watch' }, { color: '#C45041', label: 'Anomaly' }, { color: '#4F86A6', label: 'Camera' }].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
              <span>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
