import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Circle, Polyline, ZoomControl, useMap } from 'react-leaflet';
import { Layers, Camera, Eye, AlertTriangle, Map as MapIcon, ChevronRight, X, ExternalLink, Sliders, Shield, Radio } from 'lucide-react';
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

// ─── Tactical Layer Control Floating Card ────────────────────────────────────
const LAYERS = [
  { id: 'cameras',    label: 'Camera Traps (124)',  color: '#3182CE' },
  { id: 'tigers',     label: 'Tiger Positions (4)',  color: '#4E8B71' },
  { id: 'trails',     label: 'Movement Vector Paths',color: '#94A3B8' },
  { id: 'zones',      label: 'Home Range Radii',   color: '#4E8B71' },
  { id: 'anomalies',  label: 'Anomalies & Breaches', color: '#E54D42' },
];

function LayerPanel({ activeLayers, onToggle }) {
  return (
    <div style={{
      position: 'absolute', top: '1rem', right: '1rem', zIndex: 800,
      background: 'var(--bg-panel)', border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)', padding: '0.75rem 0.9rem', minWidth: '200px',
      boxShadow: 'var(--shadow-dropdown)',
    }}>
      <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.35rem' }}>
        <Sliders size={12} color="var(--status-normal)" /> GIS Layer Overlay
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
      borderRadius: 'var(--radius-md)', width: '310px',
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
            ● {entity.status.toUpperCase()}
          </span>
        </div>
        {type === 'tiger' && <>
          <Row label="Territory Zone" value={entity.zone} />
          <Row label="Confirmed Sightings" value={entity.sightings} />
          <Row label="Movement Pattern" value={<span style={{ textTransform: 'capitalize' }}>{entity.movementTrend}</span>} />
          <Row label="Stripe Match Conf." value={`${entity.stripeMatchConfidence}%`} mono />
          <Row label="Last Telemetry Ping" value={new Date(entity.lastSeen).toLocaleString()} />
          {entity.notes && (
            <div style={{ marginTop: '0.25rem', padding: '0.45rem 0.6rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.4, borderLeft: `2.5 solid ${color}` }}>
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
const STATUS_COLOR = { normal: '#4E8B71', warning: '#D68A27', critical: '#E54D42', info: '#3182CE', online: '#4E8B71', offline: '#E54D42' };

export default function SpatialView({ selectedTiger, onSelectTiger, onNavigate }) {
  const [activeLayers, setActiveLayers] = useState(new Set(['cameras', 'tigers', 'zones', 'anomalies', 'trails']));
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [entityType, setEntityType] = useState(null);
  const [mapTarget, setMapTarget] = useState(null);

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
    <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--bg-base)' }}>
      {/* Header toolbar */}
      <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <MapIcon size={14} color="var(--status-normal)" /> Full-Screen GIS Spatial Telemetry
        </span>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          <span>ENTITIES: <strong style={{ color: 'var(--text-primary)' }}>{MOCK_TIGERS.length}</strong> TRACKED</span>
          <span>|</span>
          <span>CAMERAS: <strong style={{ color: 'var(--status-normal)' }}>121/124</strong> ACTIVE</span>
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
              pathOptions={{ color: STATUS_COLOR[t.status], fillColor: STATUS_COLOR[t.status], fillOpacity: 0.07, weight: 1, dashArray: t.status === 'critical' ? '6 4' : t.status === 'warning' ? '4 3' : undefined }}
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
                radius={isSelected ? 220 : 140}
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

        {/* Floating Tactical Legend */}
        <div style={{
          position: 'absolute', top: '1rem', left: '1rem', zIndex: 800,
          background: 'var(--bg-panel)', border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)', padding: '0.65rem 0.85rem',
          fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)',
          boxShadow: 'var(--shadow-dropdown)',
        }}>
          <div style={{ marginBottom: '0.35rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.6rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.2rem' }}>GIS Symbology</div>
          {[{ color: '#4E8B71', label: 'Nominal Range' }, { color: '#D68A27', label: 'Watch Zone' }, { color: '#E54D42', label: 'Breach / Anomaly' }, { color: '#3182CE', label: 'Camera Trap' }].map(l => (
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
