import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Circle, Polyline, ZoomControl, useMap } from 'react-leaflet';
import { Layers, Camera, Eye, AlertTriangle, Map as MapIcon, ChevronRight, X, ExternalLink, Sliders, Shield, Radio } from 'lucide-react';
import { getTigers, getCameras, getTrails } from '../services/api';
import L from 'leaflet';

// ─── Map controllers ────────────────────────────────────────────────────────
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
  { id: 'hunters',    label: '🚨 Hunter / Poacher Alert (1)', color: '#E54D42' },
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
      borderRadius: 'var(--radius-md)', padding: '0.75rem 0.9rem', minWidth: '220px',
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
function DetailPanel({ entity, type, onClose, onViewRegistry, onOpenThreatModal }) {
  if (!entity) return null;
  const statusColor = {
    normal: 'var(--status-normal)', warning: 'var(--status-warning)',
    critical: 'var(--status-critical)', online: 'var(--status-normal)', offline: 'var(--status-critical)',
    hunter: '#E54D42',
  };
  const color = type === 'hunter' ? '#E54D42' : (statusColor[entity.status] || 'var(--text-muted)');

  return (
    <div style={{
      position: 'absolute', bottom: '1.25rem', left: '1.25rem', zIndex: 800,
      background: 'var(--bg-panel)', border: `1px solid ${color}`,
      borderRadius: 'var(--radius-md)', width: '320px',
      boxShadow: 'var(--shadow-dropdown)', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '0.65rem 0.85rem', background: type === 'hunter' ? '#260B0B' : 'var(--bg-elevated)', borderBottom: `1px solid ${type === 'hunter' ? '#E54D42' : 'var(--border-subtle)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: type === 'hunter' ? '#FFA8A8' : 'var(--text-muted)' }}>{entity.id || 'INCIDENT'} · {type.toUpperCase()} INSPECTOR</span>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: type === 'hunter' ? '#FFF' : 'var(--text-primary)' }}>
            {type === 'hunter' ? '🚨 ARMED POACHER DETECTED' : (entity.name || entity.id)}
          </div>
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
        {type === 'hunter' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Threat Level</span>
              <span className="badge badge-critical" style={{ background: '#E54D42', color: '#FFF' }}>
                ● CODE RED
              </span>
            </div>
            <Row label="Camera Trap" value={entity.cameraId || 'CAM-103'} mono />
            <Row label="Sector / Zone" value={entity.cameraZone || entity.location || 'Sector 4 Buffer'} />
            <Row label="Human Detection" value={`${entity.humanConfidence || 98.6}% Confirmed`} mono />
            <Row label="Weapon Signature" value={`${entity.weaponConfidence || 92.4}% (Firearm)`} mono />
            <Row label="Nearby Wildlife" value={entity.proximityThreat || 'PT-03 (~650m)'} />
            <Row label="GPS Fix" value={`${(entity.lat || 21.738).toFixed(4)}°N ${(entity.lng || 79.285).toFixed(4)}°E`} mono />

            {onOpenThreatModal && (
              <button
                onClick={onOpenThreatModal}
                style={{
                  marginTop: '0.35rem',
                  padding: '0.5rem',
                  backgroundColor: '#E54D42',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: '#FFF',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                }}
              >
                <span>OPEN FULL THREAT INTERCEPT</span>
                <ChevronRight size={13} />
              </button>
            )}
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Operational Status</span>
              <span className={`badge badge-${entity.status === 'online' ? 'normal' : entity.status === 'offline' ? 'critical' : entity.status}`}>
                ● {entity.status?.toUpperCase()}
              </span>
            </div>
            {type === 'tiger' && <>
              <Row label="Territory Zone" value={entity.zone} />
              <Row label="Confirmed Sightings" value={entity.sightings} />
              <Row label="Movement Pattern" value={<span style={{ textTransform: 'capitalize' }}>{entity.movementTrend}</span>} />
              <Row label="Stripe Match Conf." value={`${entity.stripeMatchConfidence}%`} mono />
              <Row label="Last Telemetry Ping" value={new Date(entity.lastSeen).toLocaleString()} />
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
          </>
        )}
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

import { MOCK_HUNTER_THREAT } from '../services/mockData';

// ─── Main Spatial View ───────────────────────────────────────────────────────
const PENCH_CENTER = [21.725, 79.302];
const STATUS_COLOR = { normal: '#4E8B71', warning: '#D68A27', critical: '#E54D42', info: '#3182CE', online: '#4E8B71', offline: '#E54D42', hunter: '#E54D42' };

export default function SpatialView({ selectedTiger, onSelectTiger, onNavigate, onOpenThreatModal }) {
  const [tigers, setTigers] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [trails, setTrails] = useState({});
  const [activeLayers, setActiveLayers] = useState(new Set(['hunters', 'cameras', 'tigers', 'zones', 'anomalies', 'trails']));
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [entityType, setEntityType] = useState(null);
  const [mapTarget, setMapTarget] = useState(null);

  useEffect(() => {
    async function loadSpatialData() {
      const [t, c, tr] = await Promise.all([
        getTigers(),
        getCameras(),
        getTrails(),
      ]);
      setTigers(t);
      setCameras(c);
      setTrails(tr);
    }
    loadSpatialData();
  }, []);

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

  const handleHunterClick = useCallback((threat) => {
    setSelectedEntity(threat || MOCK_HUNTER_THREAT);
    setEntityType('hunter');
    setMapTarget({ lat: MOCK_HUNTER_THREAT.lat, lng: MOCK_HUNTER_THREAT.lng });
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
          <MapIcon size={14} color="var(--status-normal)" /> Full-Screen GIS Spatial Telemetry
        </span>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          <span style={{ color: '#E54D42', fontWeight: 700 }}>🚨 ACTIVE THREAT: 1 POACHER INCIDENT</span>
          <span>|</span>
          <span>ENTITIES: <strong style={{ color: 'var(--text-primary)' }}>{tigers.length}</strong> TRACKED</span>
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

          {/* Home Range Zones */}
          {activeLayers.has('zones') && tigers.map(t => (
            <Circle key={`zone-${t.id}`} center={[t.lat, t.lng]} radius={1500}
              pathOptions={{ color: STATUS_COLOR[t.status], fillColor: STATUS_COLOR[t.status], fillOpacity: 0.07, weight: 1, dashArray: t.status === 'critical' ? '6 4' : t.status === 'warning' ? '4 3' : undefined }}
              eventHandlers={{ click: () => handleTigerClick(t) }}
            />
          ))}

          {/* Movement Trails */}
          {activeLayers.has('trails') && tigers.map(t => {
            const trail = trails[t.id];
            if (!trail) return null;
            return (
              <Polyline key={`trail-${t.id}`} positions={trail}
                pathOptions={{ color: STATUS_COLOR[t.status], weight: 2, opacity: 0.6, dashArray: '6 4' }}
              />
            );
          })}

          {/* Hunter / Poacher Threat Marker */}
          {activeLayers.has('hunters') && (
            <React.Fragment>
              <Circle
                center={[MOCK_HUNTER_THREAT.lat, MOCK_HUNTER_THREAT.lng]}
                radius={380}
                pathOptions={{
                  color: '#E54D42',
                  fillColor: '#E54D42',
                  fillOpacity: 0.22,
                  weight: 2,
                  dashArray: '5 4',
                }}
                eventHandlers={{ click: () => handleHunterClick(MOCK_HUNTER_THREAT) }}
              />
              <Circle
                center={[MOCK_HUNTER_THREAT.lat, MOCK_HUNTER_THREAT.lng]}
                radius={160}
                pathOptions={{
                  color: '#FF0033',
                  fillColor: '#E54D42',
                  fillOpacity: 0.95,
                  weight: 3,
                }}
                eventHandlers={{ click: () => handleHunterClick(MOCK_HUNTER_THREAT) }}
              />
            </React.Fragment>
          )}

          {/* Tiger markers */}
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

          {/* Camera markers */}
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
          onOpenThreatModal={onOpenThreatModal}
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
          {[
            { color: '#E54D42', label: '🚨 Poacher Alert (CAM-103)' },
            { color: '#4E8B71', label: 'Nominal Range' },
            { color: '#D68A27', label: 'Watch Zone' },
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

