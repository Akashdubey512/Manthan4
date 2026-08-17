import React, { useState, useEffect, useMemo } from 'react';
import { Search, Eye, TrendingUp, TrendingDown, Minus, ExternalLink, Shield, Filter, Crosshair } from 'lucide-react';
import { getTigers } from '../services/api';

const STATUS_COLOR = {
  normal:   'var(--status-normal)',
  warning:  'var(--status-warning)',
  critical: 'var(--status-critical)',
};
const STATUS_LABEL = {
  normal:   'NOMINAL',
  warning:  'WATCH',
  critical: 'ANOMALY',
};
const TREND_ICON = {
  stable:    <Minus size={13} color="var(--status-normal)" />,
  dispersing:<TrendingUp size={13} color="var(--status-warning)" />,
  anomalous: <TrendingUp size={13} color="var(--status-critical)" />,
};

function TigerRow({ tiger, isSelected, onSelect, onViewSpatial }) {
  const color = STATUS_COLOR[tiger.status];
  const hours = Math.floor((Date.now() - new Date(tiger.lastSeen)) / 3600000);
  const lastSeenLabel = hours < 1 ? 'Recent' : hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;

  return (
    <tr
      onClick={() => onSelect(tiger)}
      style={{
        cursor: 'pointer',
        background: isSelected ? 'var(--bg-elevated)' : 'transparent',
        borderBottom: '1px solid var(--border-subtle)',
        borderLeft: `3px solid ${isSelected ? color : 'transparent'}`,
      }}
      className="interactive-row"
    >
      <td style={{ padding: '0.65rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{tiger.id}</td>
      <td style={{ padding: '0.65rem 1rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{tiger.name}</td>
      <td style={{ padding: '0.65rem 1rem' }}>
        <span className={`badge badge-${tiger.status}`} style={{ fontSize: '0.6rem' }}>
          ● {STATUS_LABEL[tiger.status]}
        </span>
      </td>
      <td style={{ padding: '0.65rem 1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{tiger.zone}</td>
      <td style={{ padding: '0.65rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{lastSeenLabel}</td>
      <td style={{ padding: '0.65rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)', textAlign: 'center' }}>{tiger.sightings}</td>
      <td style={{ padding: '0.65rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ flex: 1, maxWidth: '80px', height: '4px', background: 'var(--bg-input)', borderRadius: '2px' }}>
            <div style={{ width: `${tiger.stripeMatchConfidence}%`, height: '100%', background: tiger.stripeMatchConfidence > 90 ? 'var(--status-normal)' : 'var(--status-warning)', borderRadius: '2px' }} />
          </div>
          <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{tiger.stripeMatchConfidence}%</span>
        </div>
      </td>
      <td style={{ padding: '0.65rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {TREND_ICON[tiger.movementTrend]}
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{tiger.movementTrend}</span>
        </div>
      </td>
      <td style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>
        <button
          onClick={e => { e.stopPropagation(); onViewSpatial(tiger); }}
          title="Focus on spatial map"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '3px 8px', cursor: 'pointer', color: 'var(--status-info)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.62rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}
        >
          <Crosshair size={11} /> MAP
        </button>
      </td>
    </tr>
  );
}

function DetailSidebar({ tiger, onClose, onViewSpatial }) {
  if (!tiger) return null;
  const color = STATUS_COLOR[tiger.status];
  const confidence = tiger.stripeMatchConfidence;

  return (
    <aside style={{
      width: '320px', flexShrink: 0, background: 'var(--bg-panel)',
      borderLeft: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>RECORD ID · {tiger.id}</div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: '0.1rem' }}>{tiger.name}</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.1rem' }}>✕</button>
      </div>

      <div style={{ overflowY: 'auto', flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Status Chip Banner */}
        <div style={{ padding: '0.6rem 0.85rem', background: `${color}14`, borderLeft: `3px solid ${color}`, borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.15rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Operational Classification</div>
          <div style={{ fontWeight: 700, color, fontSize: '0.82rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>● {STATUS_LABEL[tiger.status]}</div>
        </div>

        {/* Bio */}
        <Section label="Identification Profile">
          <SideRow label="Sex" value={tiger.sex} />
          <SideRow label="Age Class" value={tiger.ageClass} />
          <SideRow label="Stripe Match Conf." value={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, maxWidth: '140px' }}>
              <div style={{ flex: 1, height: '4px', background: 'var(--bg-input)', borderRadius: '2px' }}>
                <div style={{ width: `${confidence}%`, height: '100%', background: confidence > 90 ? 'var(--status-normal)' : 'var(--status-warning)', borderRadius: '2px' }} />
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-primary)' }}>{confidence}%</span>
            </div>
          } />
        </Section>

        {/* Movement */}
        <Section label="Spatial & Telemetry">
          <SideRow label="Territory Zone" value={tiger.zone} />
          <SideRow label="Est. Home Range" value={`~${tiger.homeRangeKm2} km²`} />
          <SideRow label="Movement Trend" value={<span style={{ textTransform: 'capitalize', color: tiger.movementTrend === 'anomalous' ? 'var(--status-critical)' : tiger.movementTrend === 'dispersing' ? 'var(--status-warning)' : 'var(--text-secondary)' }}>{tiger.movementTrend}</span>} />
          <SideRow label="Confirmed Sightings" value={tiger.sightings} />
          <SideRow label="Last Telemetry Ping" value={new Date(tiger.lastSeen).toLocaleString()} />
          <SideRow label="Coordinates" value={`${tiger.lat.toFixed(4)}°N ${tiger.lng.toFixed(4)}°E`} mono />
        </Section>

        {/* Notes */}
        {tiger.notes && (
          <Section label="Field Intelligence Notes">
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0, padding: '0.5rem 0.65rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>{tiger.notes}</p>
          </Section>
        )}

        {/* Action Button */}
        <button
          onClick={() => onViewSpatial(tiger)}
          style={{
            marginTop: 'auto',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            padding: '0.6rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--status-info)',
            fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.04em',
          }}
        >
          <ExternalLink size={13} /> FOCUS IN SPATIAL MAP
        </button>
      </div>

      <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', background: 'var(--bg-panel)' }}>
        SYSTEM RECORD · VERIFIED IN FIELD
      </div>
    </aside>
  );
}

function Section({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.4rem', paddingBottom: '0.2rem', borderBottom: '1px solid var(--border-subtle)' }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>{children}</div>
    </div>
  );
}

function SideRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.73rem' }}>
      <span style={{ color: 'var(--text-muted)', flexShrink: 0, marginRight: '0.5rem' }}>{label}</span>
      <span style={{ color: 'var(--text-secondary)', fontFamily: mono ? 'var(--font-mono)' : undefined, fontSize: mono ? '0.65rem' : undefined, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function TigerRegistry({ selectedTiger, onSelectTiger, onNavigate }) {
  const [tigers, setTigers] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    async function loadTigers() {
      const data = await getTigers();
      setTigers(data);
    }
    loadTigers();
  }, []);

  const filtered = useMemo(() => {
    return tigers.filter(t => {
      const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'all' || t.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [tigers, search, filterStatus]);

  const handleSelect = (tiger) => {
    if (selectedTiger?.id === tiger.id) {
      if (onSelectTiger) onSelectTiger(null);
    } else {
      if (onSelectTiger) onSelectTiger(tiger);
    }
  };

  const handleViewSpatial = (tiger) => {
    if (onNavigate) onNavigate('spatial', tiger);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--bg-base)' }}>
      {/* Header */}
      <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Eye size={14} color="var(--status-normal)" /> Tiger Intelligence Registry Database
        </span>
        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', padding: '1px 6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '2px' }}>
          {filtered.length} ENTITIES LISTED
        </span>
      </div>

      {/* Toolbar Filters */}
      <div style={{ padding: '0.65rem 1rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.65rem', flex: '0 0 240px' }}>
          <Search size={13} color="var(--text-muted)" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search entity ID or name..."
            style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.75rem', width: '100%', fontFamily: 'var(--font-sans)' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Filter size={12} color="var(--text-muted)" />
          {['all', 'normal', 'warning', 'critical'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                background: filterStatus === s ? 'var(--bg-elevated)' : 'transparent',
                border: `1px solid ${filterStatus === s ? 'var(--border-active)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-sm)', padding: '0.25rem 0.65rem',
                cursor: 'pointer', color: filterStatus === s ? 'var(--text-primary)' : 'var(--text-muted)',
                fontFamily: 'var(--font-mono)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em',
                fontWeight: filterStatus === s ? 600 : 400,
              }}
            >{s}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No entities match the current filter.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-elevated)', zIndex: 10 }}>
                <tr>
                  {['ID', 'Name', 'Status', 'Zone', 'Last Seen', 'Sightings', 'Stripe Match', 'Movement Trend', ''].map(h => (
                    <th key={h} style={{ padding: '0.55rem 1rem', textAlign: h === 'Sightings' ? 'center' : h === 'Action' ? 'right' : 'left', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(tiger => (
                  <TigerRow
                    key={tiger.id}
                    tiger={tiger}
                    isSelected={selectedTiger?.id === tiger.id}
                    onSelect={handleSelect}
                    onViewSpatial={handleViewSpatial}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right Detail Sidebar */}
        {selectedTiger && (
          <DetailSidebar
            tiger={selectedTiger}
            onClose={() => onSelectTiger(null)}
            onViewSpatial={handleViewSpatial}
          />
        )}
      </div>
    </div>
  );
}


