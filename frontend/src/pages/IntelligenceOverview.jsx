import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Circle, Popup, ZoomControl, useMap } from 'react-leaflet';
import { ShieldAlert, AlertTriangle, Info, CheckCircle2, Camera, Map as MapIcon, Crosshair } from 'lucide-react';
import { MOCK_TIGERS, MOCK_ALERTS, MOCK_STATS } from '../services/mockData';
import L from 'leaflet';

// ─── Map imperative controller ─────────────────────────────────────────────
// Receives the selected tiger and pans the map to it
function MapController({ targetTiger }) {
  const map = useMap();
  useEffect(() => {
    if (targetTiger) {
      map.flyTo([targetTiger.lat, targetTiger.lng], 14, { duration: 0.8, easeLinearity: 0.3 });
    }
  }, [targetTiger, map]);
  return null;
}

// Add Leaflet scale control imperatively once per map
function ScaleControl() {
  const map = useMap();
  useEffect(() => {
    const ctrl = L.control.scale({ imperial: false, position: 'bottomleft' });
    ctrl.addTo(map);
    return () => ctrl.remove();
  }, [map]);
  return null;
}

// ─── Helper: build a DivIcon tactical marker ──────────────────────────────
function makeTacticalIcon(status, isSelected) {
  const selected = isSelected ? ' tactical-marker-selected' : '';
  const html = `
    <div class="tactical-marker tactical-marker-${status}${selected}">
      <div class="tactical-marker-inner"></div>
    </div>
  `;
  return L.divIcon({
    html,
    className: '',      // no leaflet defaults
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -14],
  });
}

// ─── Intelligence Summary Strip ───────────────────────────────────────────
function IntelligenceSummary() {
  const stats = [
    { label: 'ACTIVE TRAPS',      value: MOCK_STATS.activeTraps,       icon: <Camera size={18} />, color: 'var(--status-normal)'   },
    { label: 'RECENT DETECTIONS', value: MOCK_STATS.recentDetections,   icon: <Crosshair size={18}/>, color: 'var(--status-info)'    },
    { label: 'OFFLINE TRAPS',     value: MOCK_STATS.offlineTraps,       icon: <AlertTriangle size={18}/>, color: 'var(--status-warning)', warn: true },
    { label: 'IDENTIFIED TIGERS', value: MOCK_STATS.identifiedTigers,   icon: <CheckCircle2 size={18}/>, color: 'var(--status-normal)'  },
  ];
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '1px',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--border-subtle)',
      flexShrink: 0,
    }}>
      {stats.map(s => (
        <div key={s.label} style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.6rem 1rem',
          background: 'var(--bg-panel)',
        }}>
          <div>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', color: s.warn ? s.color : 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              {s.label}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 700, color: s.warn ? s.color : 'var(--text-primary)', lineHeight: 1 }}>
              {s.value}
            </div>
          </div>
          <div style={{ color: s.color, opacity: 0.4 }}>{s.icon}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Alert Feed ────────────────────────────────────────────────────────────
function AlertFeed({ selectedAlertId, onSelectAlert, onNavigate, selectedTiger }) {
  const getIcon = (type) => {
    switch (type) {
      case 'critical': return <ShieldAlert  size={14} color="var(--status-critical)" />;
      case 'warning':  return <AlertTriangle size={14} color="var(--status-warning)"  />;
      case 'info':     return <Info          size={14} color="var(--status-info)"     />;
      default:         return <CheckCircle2  size={14} color="var(--status-normal)"   />;
    }
  };
  const typeColor = {
    critical: 'var(--status-critical)',
    warning:  'var(--status-warning)',
    info:     'var(--status-info)',
    normal:   'var(--status-normal)',
  };

  return (
    <aside style={{
      width: '340px',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid var(--border-subtle)',
      overflow: 'hidden',
      background: 'var(--bg-panel)',
    }}>
      {/* Panel header */}
      <div style={{
        padding: '0.6rem 1rem',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-elevated)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <ShieldAlert size={14} color="var(--status-warning)" /> Incident Feed
        </span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {MOCK_ALERTS.length} events
        </span>
      </div>

      {/* Alert items */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {MOCK_ALERTS.map(alert => {
          const isSelected = selectedAlertId === alert.id;
          const color = typeColor[alert.type];
          return (
            <div
              key={alert.id}
              className={`alert-item-interactive${isSelected ? ' selected' : ''}`}
              style={{
                padding: '0.875rem 1rem',
                borderBottom: '1px solid var(--border-subtle)',
                borderLeft: `3px solid ${isSelected ? color : 'transparent'}`,
                background: isSelected
                  ? (alert.type === 'critical' ? 'rgba(196,80,65,0.12)' : 'var(--bg-elevated)')
                  : alert.type === 'critical' ? 'rgba(196,80,65,0.07)' : 'transparent',
                color,
              }}
              onClick={() => onSelectAlert(isSelected ? null : alert)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {getIcon(alert.type)}
                  <span className={`badge badge-${alert.type}`} style={{ fontSize: '0.6rem' }}>{alert.type}</span>
                </div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{alert.time}</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.45, marginBottom: '0.35rem' }}>
                {alert.text}
              </p>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                <span>ID:{alert.id}</span>
                <span>LOC:{alert.location}</span>
                {alert.tigerId && <span>ENTITY:{alert.tigerId}</span>}
              </div>
              {isSelected && alert.tigerId && (
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.65rem', color, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Crosshair size={11} /> Map focused on entity
                  </div>
                  {onNavigate && (
                    <button
                      onClick={e => { e.stopPropagation(); onNavigate('spatial', selectedTiger); }}
                      style={{ background: 'none', border: `1px solid ${color}`, borderRadius: 'var(--radius-sm)', padding: '2px 8px', cursor: 'pointer', color, fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.04em' }}
                    >SPATIAL →</button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

// ─── Custom Popup Content ──────────────────────────────────────────────────
function TigerPopup({ tiger }) {
  const statusLabel = { normal: 'NOMINAL', warning: 'WATCH', critical: 'ANOMALY', info: 'INFO' };
  const statusColor = {
    normal:   'var(--status-normal)',
    warning:  'var(--status-warning)',
    critical: 'var(--status-critical)',
    info:     'var(--status-info)',
  };
  const lastSeenDate = new Date(tiger.lastSeen);
  const hours = Math.floor((Date.now() - lastSeenDate) / 3600000);
  return (
    <div style={{ fontFamily: 'var(--font-sans)', minWidth: '200px', padding: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{tiger.id}</span>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: statusColor[tiger.status], letterSpacing: '0.05em' }}>
          ● {statusLabel[tiger.status] || tiger.status.toUpperCase()}
        </span>
      </div>
      <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{tiger.name}</div>
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Zone: </span>{tiger.zone}
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Sightings: </span>{tiger.sightings}
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Last Seen: </span>
          {hours < 1 ? 'Recent' : `${hours}h ago`}
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
          {tiger.lat.toFixed(4)}°N, {tiger.lng.toFixed(4)}°E
        </div>
      </div>
    </div>
  );
}

// ─── Spatial Map Panel ────────────────────────────────────────────────────
const PENCH_CENTER = [21.7250, 79.3000];

function SpatialMap({ selectedTiger }) {
  const markerRefs = useRef({});

  // Open popup when a tiger is focused via alert selection
  useEffect(() => {
    if (selectedTiger) {
      const ref = markerRefs.current[selectedTiger.id];
      if (ref) ref.openPopup();
    }
  }, [selectedTiger]);

  const zoneColor = { normal: 'var(--status-normal)', warning: 'var(--status-warning)', critical: 'var(--status-critical)', info: 'var(--status-info)' };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Map header */}
      <div style={{
        padding: '0.5rem 1rem',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-elevated)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <MapIcon size={14} color="var(--text-muted)" /> Spatial Intelligence · Live
        </span>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          <span style={{ color: 'var(--status-normal)' }}>● NOMINAL</span>
          <span style={{ color: 'var(--status-warning)' }}>● WATCH</span>
          <span style={{ color: 'var(--status-critical)' }}>● ANOMALY</span>
          <span style={{ marginLeft: '0.5rem', padding: '1px 6px', border: '1px solid var(--border-default)', borderRadius: '2px', color: 'var(--status-normal)' }}>GIS SYNCED</span>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer
          center={PENCH_CENTER}
          zoom={12}
          zoomControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <ZoomControl position="bottomright" />
          <ScaleControl />
          <MapController targetTiger={selectedTiger} />

          {MOCK_TIGERS.map(tiger => {
            const isSelected = selectedTiger?.id === tiger.id;
            const color = zoneColor[tiger.status] || 'var(--status-normal)';
            const icon = makeTacticalIcon(tiger.status, isSelected);

            return (
              <React.Fragment key={tiger.id}>
                {/* Outer range ring */}
                <Circle
                  center={[tiger.lat, tiger.lng]}
                  radius={1200}
                  pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: isSelected ? 0.15 : 0.07,
                    weight: isSelected ? 1.5 : 1,
                    dashArray: tiger.status === 'critical' ? '6 4' : tiger.status === 'warning' ? '4 3' : undefined,
                  }}
                />
                {/* Custom tactical marker via Marker with DivIcon */}
                <React.Fragment>
                  {/* We use a lightweight circle as a clickable marker instead of <Marker> to keep it themed */}
                  <Circle
                    center={[tiger.lat, tiger.lng]}
                    radius={isSelected ? 200 : 120}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.9, weight: isSelected ? 2 : 1.5 }}
                    eventHandlers={{ click: () => {} }}
                  >
                    <Popup>
                      <TigerPopup tiger={tiger} />
                    </Popup>
                  </Circle>
                </React.Fragment>
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────
export default function IntelligenceOverview({ onNavigate }) {
  const [selectedAlert, setSelectedAlert] = useState(null);

  // Derive the focused tiger from the selected alert's tigerId
  const selectedTiger = selectedAlert?.tigerId
    ? MOCK_TIGERS.find(t => t.id === selectedAlert.tigerId) ?? null
    : null;

  const handleSelectAlert = useCallback((alert) => {
    setSelectedAlert(alert);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden' }}>
      <IntelligenceSummary />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <AlertFeed
          selectedAlertId={selectedAlert?.id ?? null}
          onSelectAlert={handleSelectAlert}
          onNavigate={onNavigate}
          selectedTiger={selectedTiger}
        />
        <SpatialMap selectedTiger={selectedTiger} />
      </div>
    </div>
  );
}
