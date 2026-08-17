import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Circle, Polyline, Popup, ZoomControl, useMap } from 'react-leaflet';
import { ShieldAlert, AlertTriangle, Info, CheckCircle2, Camera, Map as MapIcon, Crosshair, ExternalLink, Activity, ArrowRight } from 'lucide-react';
import { getTigers, getAlerts, getStats, getTrails, getCameras } from '../services/api';
import L from 'leaflet';

// ─── Map Imperative Controller ─────────────────────────────────────────────
function MapController({ targetTiger }) {
  const map = useMap();
  useEffect(() => {
    if (targetTiger && targetTiger.lat && targetTiger.lng) {
      map.flyTo([targetTiger.lat, targetTiger.lng], 14.5, { duration: 0.8, easeLinearity: 0.3 });
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

// ─── KPI Telemetry Strip ───────────────────────────────────────────────────
function IntelligenceSummary({ stats }) {
  if (!stats) return null;
  const items = [
    { label: 'ACTIVE TRAP NETWORK',  value: stats.activeTraps,     sub: '121 ONLINE · 3 OFFLINE', icon: <Camera size={15} />,        color: 'var(--status-normal)'   },
    { label: 'FIELD DETECTIONS 24H', value: stats.recentDetections, sub: 'PAST 24 HOURS SYNC',      icon: <Crosshair size={15}/>,     color: 'var(--status-info)'    },
    { label: 'OFFLINE SENSORS',     value: stats.offlineTraps,     sub: 'CAM-104, CAM-106 ALERT',  icon: <AlertTriangle size={15}/>, color: 'var(--status-warning)', warn: true },
    { label: 'VERIFIED TIGER REGS',  value: stats.identifiedTigers, sub: 'DATABASE SYNCED',        icon: <CheckCircle2 size={15}/>,  color: 'var(--status-normal)'  },
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
      {items.map(s => (
        <div key={s.label} style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.55rem 1rem',
          background: 'var(--bg-panel)',
        }}>
          <div>
            <div style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.08em', color: s.warn ? s.color : 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.15rem' }}>
              {s.label}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 700, color: s.warn ? s.color : 'var(--text-primary)', lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
              {s.sub}
            </div>
          </div>
          <div style={{
            width: '30px', height: '30px', borderRadius: 'var(--radius-sm)',
            background: s.warn ? 'var(--status-warning-bg)' : 'var(--bg-input)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: s.color
          }}>{s.icon}</div>
        </div>
      ))}
    </div>
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
  return (
    <div style={{ fontFamily: 'var(--font-sans)', minWidth: '200px', padding: '0.65rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
        <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{tiger.id}</span>
        <span style={{ fontSize: '0.62rem', fontWeight: 700, color: statusColor[tiger.status], letterSpacing: '0.05em' }}>
          ● {statusLabel[tiger.status] || tiger.status.toUpperCase()}
        </span>
      </div>
      <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>{tiger.name}</div>
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.18rem' }}>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Zone</span>
          <span>{tiger.zone}</span>
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Sightings</span>
          <span>{tiger.sightings}</span>
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Match Conf.</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{tiger.stripeMatchConfidence}%</span>
        </div>
        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.25rem', paddingTop: '0.25rem', borderTop: '1px solid var(--border-subtle)' }}>
          {tiger.lat.toFixed(4)}°N, {tiger.lng.toFixed(4)}°E
        </div>
      </div>
    </div>
  );
}

// ─── Spatial GIS Operational Map Centerpiece ───────────────────────────────
const PENCH_CENTER = [21.7250, 79.3000];

function SpatialMap({ tigers, trails, cameras, selectedTiger, onSelectTiger }) {
  const statusColor = { normal: 'var(--status-normal)', warning: 'var(--status-warning)', critical: 'var(--status-critical)' };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--bg-base)', position: 'relative' }}>
      {/* Map Sub-Header Overlay */}
      <div style={{
        padding: '0.45rem 0.85rem',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-elevated)',
        flexShrink: 0,
        zIndex: 10,
      }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <MapIcon size={14} color="var(--text-muted)" /> Pench Reserve GIS Operational Map
        </span>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          <span style={{ color: 'var(--status-normal)' }}>● NOMINAL (2)</span>
          <span style={{ color: 'var(--status-warning)' }}>● WATCH (1)</span>
          <span style={{ color: 'var(--status-critical)' }}>● ANOMALY (1)</span>
          <span style={{ padding: '1px 5px', border: '1px solid var(--border-default)', borderRadius: '2px', color: 'var(--status-normal)', background: 'var(--bg-panel)' }}>ESRI SATELLITE GIS</span>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer
          center={PENCH_CENTER}
          zoom={12.5}
          zoomControl={false}
          style={{ height: '100%', width: '100%' }}
        >
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
          <MapController targetTiger={selectedTiger} />

          {/* Movement Trails */}
          {trails && Object.entries(trails).map(([tigerId, points]) => {
            const tiger = tigers.find(t => t.id === tigerId);
            const color = tiger ? (statusColor[tiger.status] || 'var(--status-normal)') : 'var(--status-info)';
            return (
              <Polyline
                key={tigerId}
                positions={points}
                pathOptions={{ color, weight: 2, opacity: 0.65, dashArray: '5 4' }}
              />
            );
          })}

          {/* Camera Trap Markers */}
          {cameras && cameras.map(cam => (
            <Circle
              key={cam.id}
              center={[cam.lat, cam.lng]}
              radius={70}
              pathOptions={{
                color: cam.status === 'online' ? 'var(--status-info)' : 'var(--text-muted)',
                fillColor: cam.status === 'online' ? 'var(--status-info)' : 'var(--bg-input)',
                fillOpacity: 0.8,
                weight: 1,
              }}
            >
              <Popup>
                <div style={{ padding: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{cam.id}</div>
                  <div style={{ color: 'var(--text-muted)' }}>Zone: {cam.zone}</div>
                  <div style={{ color: cam.status === 'online' ? 'var(--status-normal)' : 'var(--status-warning)' }}>
                    ● {cam.status.toUpperCase()}
                  </div>
                </div>
              </Popup>
            </Circle>
          ))}

          {/* Tiger Target Markers & Range Boundaries */}
          {tigers.map(tiger => {
            const isSelected = selectedTiger?.id === tiger.id;
            const color = statusColor[tiger.status] || 'var(--status-normal)';

            return (
              <React.Fragment key={tiger.id}>
                {/* Outer Home Range Territory Circle */}
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
                  eventHandlers={{
                    click: () => {
                      if (onSelectTiger) onSelectTiger(tiger);
                    }
                  }}
                />
                {/* Tactical Marker Circle */}
                <Circle
                  center={[tiger.lat, tiger.lng]}
                  radius={isSelected ? 200 : 120}
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

// ─── Compact Operational Incident Table (Bottom Panel) ────────────────────
function OperationalIncidentTable({ alerts, tigers, selectedAlertId, onSelectAlert, onNavigate }) {
  if (!alerts) return null;

  const severityBadge = (type) => {
    switch (type) {
      case 'critical': return <span className="badge badge-critical">CRITICAL</span>;
      case 'warning':  return <span className="badge badge-warning">WARNING</span>;
      case 'info':     return <span className="badge badge-info">INFO</span>;
      default:         return <span className="badge badge-normal">NOMINAL</span>;
    }
  };

  return (
    <div style={{
      height: '190px',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      borderTop: '1px solid var(--border-subtle)',
      backgroundColor: 'var(--bg-panel)',
      overflow: 'hidden',
    }}>
      {/* Table Header Strip */}
      <div style={{
        padding: '0.4rem 0.85rem',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-elevated)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Activity size={13} color="var(--status-warning)" /> Real-Time Operational Incident & Telemetry Stream
        </span>
        <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {alerts.length} RECORDED INCIDENTS
        </span>
      </div>

      {/* Table Scroll Area */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-elevated)', zIndex: 5 }}>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '0.35rem 0.75rem', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>SEVERITY</th>
              <th style={{ padding: '0.35rem 0.75rem', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>INCIDENT / EVENT LOG</th>
              <th style={{ padding: '0.35rem 0.75rem', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>ENTITY</th>
              <th style={{ padding: '0.35rem 0.75rem', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>LOCATION</th>
              <th style={{ padding: '0.35rem 0.75rem', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>TIME</th>
              <th style={{ padding: '0.35rem 0.75rem', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>STATUS</th>
              <th style={{ padding: '0.35rem 0.75rem', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'right' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map(alert => {
              const isSelected = selectedAlertId === alert.id;
              const relatedTiger = alert.tigerId ? tigers.find(t => t.id === alert.tigerId) : null;

              return (
                <tr
                  key={alert.id}
                  className={`interactive-row${isSelected ? ' selected' : ''}`}
                  onClick={() => onSelectAlert(alert)}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                  }}
                >
                  <td style={{ padding: '0.45rem 0.75rem' }}>
                    {severityBadge(alert.type)}
                  </td>
                  <td style={{ padding: '0.45rem 0.75rem', fontSize: '0.73rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {alert.text}
                  </td>
                  <td style={{ padding: '0.45rem 0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: relatedTiger ? 'var(--status-info)' : 'var(--text-muted)' }}>
                    {alert.tigerId ? `${alert.tigerId} (${relatedTiger?.name || 'Target'})` : '—'}
                  </td>
                  <td style={{ padding: '0.45rem 0.75rem', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                    {alert.location}
                  </td>
                  <td style={{ padding: '0.45rem 0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    {alert.time}
                  </td>
                  <td style={{ padding: '0.45rem 0.75rem' }}>
                    <span style={{ fontSize: '0.58rem', fontFamily: 'var(--font-mono)', color: alert.type === 'critical' ? 'var(--status-critical)' : 'var(--status-normal)', textTransform: 'uppercase' }}>
                      ● {alert.type === 'critical' ? 'NEW' : alert.type === 'warning' ? 'ACTIVE' : 'RESOLVED'}
                    </span>
                  </td>
                  <td style={{ padding: '0.45rem 0.75rem', textAlign: 'right' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAlert(alert);
                      }}
                      style={{
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.6rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                      }}
                    >
                      <Crosshair size={10} /> FOCUS
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Overview Component ───────────────────────────────────────────────
export default function IntelligenceOverview({ selectedTiger, onSelectTiger, onNavigate }) {
  const [stats, setStats]           = useState(null);
  const [tigers, setTigers]         = useState([]);
  const [alerts, setAlerts]         = useState([]);
  const [trails, setTrails]         = useState({});
  const [cameras, setCameras]       = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);

  useEffect(() => {
    async function loadOverviewData() {
      const [s, t, a, tr, c] = await Promise.all([
        getStats(),
        getTigers(),
        getAlerts(),
        getTrails(),
        getCameras(),
      ]);
      setStats(s);
      setTigers(t);
      setAlerts(a);
      setTrails(tr);
      setCameras(c);
    }
    loadOverviewData();
  }, []);

  const handleSelectAlert = useCallback((alert) => {
    setSelectedAlert(alert);
    if (alert && alert.tigerId) {
      const match = tigers.find(t => t.id === alert.tigerId);
      if (match && onSelectTiger) onSelectTiger(match);
    }
  }, [tigers, onSelectTiger]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden' }}>
      <IntelligenceSummary stats={stats} />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Central GIS Map */}
        <SpatialMap
          tigers={tigers}
          trails={trails}
          cameras={cameras}
          selectedTiger={selectedTiger}
          onSelectTiger={onSelectTiger}
        />

        {/* Bottom Incident Table */}
        <OperationalIncidentTable
          alerts={alerts}
          tigers={tigers}
          selectedAlertId={selectedAlert?.id ?? null}
          onSelectAlert={handleSelectAlert}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}


