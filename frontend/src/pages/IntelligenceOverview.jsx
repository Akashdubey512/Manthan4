import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Circle, Popup, ZoomControl, useMap } from 'react-leaflet';
import { ShieldAlert, AlertTriangle, Info, CheckCircle2, Camera, Map as MapIcon, Crosshair, ExternalLink, Activity } from 'lucide-react';
import { MOCK_TIGERS, MOCK_ALERTS, MOCK_STATS } from '../services/mockData';
import L from 'leaflet';

// ─── Map imperative controller ─────────────────────────────────────────────
function MapController({ targetTiger }) {
  const map = useMap();
  useEffect(() => {
    if (targetTiger) {
      map.flyTo([targetTiger.lat, targetTiger.lng], 14, { duration: 0.8, easeLinearity: 0.3 });
    }
  }, [targetTiger, map]);
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

// ─── Intelligence Summary Metric Cards ─────────────────────────────────────
function IntelligenceSummary() {
  const stats = [
    { label: 'ACTIVE TRAPS',      value: MOCK_STATS.activeTraps,     sub: '121 ONLINE · 3 OFFLINE', icon: <Camera size={16} />,        color: 'var(--status-normal)'   },
    { label: 'RECENT DETECTIONS', value: MOCK_STATS.recentDetections, sub: 'PAST 24 HOURS',         icon: <Crosshair size={16}/>,     color: 'var(--status-info)'    },
    { label: 'OFFLINE TRAPS',     value: MOCK_STATS.offlineTraps,     sub: 'CAM-104, CAM-106',        icon: <AlertTriangle size={16}/>, color: 'var(--status-warning)', warn: true },
    { label: 'IDENTIFIED TIGERS', value: MOCK_STATS.identifiedTigers, sub: 'REGISTRY SYNCED',        icon: <CheckCircle2 size={16}/>,  color: 'var(--status-normal)'  },
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
          padding: '0.65rem 1.15rem',
          background: 'var(--bg-panel)',
        }}>
          <div>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', color: s.warn ? s.color : 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
              {s.label}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.35rem', fontWeight: 700, color: s.warn ? s.color : 'var(--text-primary)', lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
              {s.sub}
            </div>
          </div>
          <div style={{
            width: '32px', height: '32px', borderRadius: 'var(--radius-sm)',
            background: s.warn ? 'var(--status-warning-bg)' : 'var(--bg-input)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: s.color
          }}>{s.icon}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Incident & Telemetry Feed Panel ──────────────────────────────────────
function IncidentFeed({ selectedAlertId, onSelectAlert, onNavigate, selectedTiger }) {
  const getIcon = (type) => {
    switch (type) {
      case 'critical': return <ShieldAlert   size={14} color="var(--status-critical)" />;
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
      width: '350px',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid var(--border-subtle)',
      overflow: 'hidden',
      background: 'var(--bg-panel)',
    }}>
      {/* Header */}
      <div style={{
        padding: '0.65rem 1rem',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        background: 'var(--bg-elevated)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Activity size={14} color="var(--status-warning)" /> Incident & Anomaly Feed
        </span>
        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', padding: '1px 6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '2px' }}>
          {MOCK_ALERTS.length} EVENTS
        </span>
      </div>

      {/* Feed List */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {MOCK_ALERTS.map(alert => {
          const isSelected = selectedAlertId === alert.id;
          const color = typeColor[alert.type];
          return (
            <div
              key={alert.id}
              className={`interactive-row${isSelected ? ' selected' : ''}`}
              style={{
                padding: '0.85rem 1rem',
                borderBottom: '1px solid var(--border-subtle)',
                borderLeft: `3px solid ${isSelected ? color : 'transparent'}`,
                background: isSelected
                  ? (alert.type === 'critical' ? 'rgba(229,77,66,0.12)' : 'var(--bg-elevated)')
                  : alert.type === 'critical' ? 'rgba(229,77,66,0.06)' : 'transparent',
              }}
              onClick={() => onSelectAlert(alert)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {getIcon(alert.type)}
                  <span className={`badge badge-${alert.type}`} style={{ fontSize: '0.6rem' }}>{alert.type}</span>
                </div>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{alert.time}</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: '0.4rem' }}>
                {alert.text}
              </p>
              <div style={{ display: 'flex', gap: '0.85rem', fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                <span>ID: {alert.id}</span>
                <span>LOC: {alert.location}</span>
                {alert.tigerId && <span style={{ color: 'var(--text-secondary)' }}>ENTITY: {alert.tigerId}</span>}
              </div>
              {isSelected && alert.tigerId && (
                <div style={{ marginTop: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.4rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.62rem', color, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Crosshair size={11} /> MAP FOCUSED
                  </div>
                  {onNavigate && (
                    <button
                      onClick={e => { e.stopPropagation(); onNavigate('spatial', selectedTiger); }}
                      style={{ background: 'var(--bg-input)', border: `1px solid ${color}`, borderRadius: 'var(--radius-sm)', padding: '2px 8px', cursor: 'pointer', color, fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      SPATIAL MAP <ExternalLink size={10} />
                    </button>
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

// ─── Custom Leaflet Popup Content ──────────────────────────────────────────
function TigerPopup({ tiger }) {
  const statusLabel = { normal: 'NOMINAL', warning: 'WATCH', critical: 'ANOMALY' };
  const statusColor = {
    normal:   'var(--status-normal)',
    warning:  'var(--status-warning)',
    critical: 'var(--status-critical)',
  };
  const lastSeenDate = new Date(tiger.lastSeen);
  const hours = Math.floor((Date.now() - lastSeenDate) / 3600000);
  return (
    <div style={{ fontFamily: 'var(--font-sans)', minWidth: '210px', padding: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
        <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{tiger.id}</span>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: statusColor[tiger.status], letterSpacing: '0.05em' }}>
          ● {statusLabel[tiger.status] || tiger.status.toUpperCase()}
        </span>
      </div>
      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>{tiger.name}</div>
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Zone</span>
          <span>{tiger.zone}</span>
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Sightings</span>
          <span>{tiger.sightings}</span>
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Match Conf.</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{tiger.stripeMatchConfidence}%</span>
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.3rem', paddingTop: '0.3rem', borderTop: '1px solid var(--border-subtle)' }}>
          {tiger.lat.toFixed(4)}°N, {tiger.lng.toFixed(4)}°E
        </div>
      </div>
    </div>
  );
}

// ─── Spatial Map Centerpiece Panel ─────────────────────────────────────────
const PENCH_CENTER = [21.7250, 79.3000];

function SpatialMap({ selectedTiger, onSelectTiger }) {
  const zoneColor = { normal: 'var(--status-normal)', warning: 'var(--status-warning)', critical: 'var(--status-critical)' };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--bg-base)' }}>
      {/* Map Sub-Header Bar */}
      <div style={{
        padding: '0.5rem 1rem',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        background: 'var(--bg-elevated)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <MapIcon size={14} color="var(--text-muted)" /> Pench GIS Live Operations Map
        </span>
        <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          <span style={{ color: 'var(--status-normal)' }}>● NOMINAL (2)</span>
          <span style={{ color: 'var(--status-warning)' }}>● WATCH (1)</span>
          <span style={{ color: 'var(--status-critical)' }}>● ANOMALY (1)</span>
          <span style={{ padding: '1px 6px', border: '1px solid var(--border-default)', borderRadius: '2px', color: 'var(--status-normal)', background: 'var(--bg-panel)' }}>CARTO DARK GIS</span>
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

            return (
              <React.Fragment key={tiger.id}>
                {/* Outer range ring */}
                <Circle
                  center={[tiger.lat, tiger.lng]}
                  radius={1200}
                  pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: isSelected ? 0.16 : 0.07,
                    weight: isSelected ? 1.5 : 1,
                    dashArray: tiger.status === 'critical' ? '6 4' : tiger.status === 'warning' ? '4 3' : undefined,
                  }}
                />
                {/* Tactical Clickable Marker */}
                <Circle
                  center={[tiger.lat, tiger.lng]}
                  radius={isSelected ? 220 : 130}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.9, weight: isSelected ? 2.5 : 1.5 }}
                  eventHandlers={{
                    click: () => {
                      if (onSelectTiger) onSelectTiger(tiger);
                    }
                  }}
                >
                  <Popup>
                    <TigerPopup tiger={tiger} />
                  </Popup>
                </Circle>
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}

// ─── Main Overview Component ───────────────────────────────────────────────
export default function IntelligenceOverview({ selectedTiger, onSelectTiger, onNavigate }) {
  const [selectedAlert, setSelectedAlert] = useState(null);

  const handleSelectAlert = useCallback((alert) => {
    setSelectedAlert(alert);
    if (alert && alert.tigerId) {
      const match = MOCK_TIGERS.find(t => t.id === alert.tigerId);
      if (match && onSelectTiger) onSelectTiger(match);
    }
  }, [onSelectTiger]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden' }}>
      <IntelligenceSummary />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <IncidentFeed
          selectedAlertId={selectedAlert?.id ?? null}
          onSelectAlert={handleSelectAlert}
          onNavigate={onNavigate}
          selectedTiger={selectedTiger}
        />
        <SpatialMap
          selectedTiger={selectedTiger}
          onSelectTiger={onSelectTiger}
        />
      </div>
    </div>
  );
}

