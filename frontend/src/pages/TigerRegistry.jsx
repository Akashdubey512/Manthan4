import React, { useState, useMemo } from 'react';
import { Search, ChevronRight, Eye, TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';
import { MOCK_TIGERS } from '../services/mockData';

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
        borderLeft: `3px solid ${isSelected ? color : 'transparent'}`,
        transition: 'background 0.15s',
      }}
      className="registry-row"
    >
      <td style={{ padding: '0.7rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tiger.id}</td>
      <td style={{ padding: '0.7rem 0', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{tiger.name}</td>
      <td style={{ padding: '0.7rem 1rem' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.04em', color, textTransform: 'uppercase' }}>● {STATUS_LABEL[tiger.status]}</span>
      </td>
      <td style={{ padding: '0.7rem 1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{tiger.zone}</td>
      <td style={{ padding: '0.7rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{lastSeenLabel}</td>
      <td style={{ padding: '0.7rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>{tiger.sightings}</td>
      <td style={{ padding: '0.7rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {TREND_ICON[tiger.movementTrend]}
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{tiger.movementTrend}</span>
        </div>
      </td>
      <td style={{ padding: '0.7rem 1rem' }}>
        <button
          onClick={e => { e.stopPropagation(); onViewSpatial(tiger); }}
          title="Focus on map"
          style={{ background: 'none', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '3px 8px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontFamily: 'var(--font-mono)' }}
        >
          <Eye size={11} /> SPATIAL
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
      width: '300px', flexShrink: 0, background: 'var(--bg-panel)',
      borderLeft: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Sidebar header */}
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{tiger.id}</div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{tiger.name}</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
      </div>

      <div style={{ overflowY: 'auto', flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Status */}
        <div style={{ padding: '0.5rem 0.75rem', background: `${color}18`, borderLeft: `3px solid ${color}`, borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.2rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Operational Status</div>
          <div style={{ fontWeight: 700, color, fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>● {STATUS_LABEL[tiger.status]}</div>
        </div>

        {/* Bio */}
        <Section label="Identification">
          <SideRow label="Sex" value={tiger.sex} />
          <SideRow label="Age Class" value={tiger.ageClass} />
          <SideRow label="Match Confidence" value={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
              <div style={{ flex: 1, height: '4px', background: 'var(--bg-input)', borderRadius: '2px' }}>
                <div style={{ width: `${confidence}%`, height: '100%', background: confidence > 90 ? 'var(--status-normal)' : 'var(--status-warning)', borderRadius: '2px' }} />
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', flexShrink: 0 }}>{confidence}%</span>
            </div>
          } />
        </Section>

        {/* Movement */}
        <Section label="Spatial Intelligence">
          <SideRow label="Zone" value={tiger.zone} />
          <SideRow label="Home Range" value={`~${tiger.homeRangeKm2} km²`} />
          <SideRow label="Movement Trend" value={<span style={{ textTransform: 'capitalize', color: tiger.movementTrend === 'anomalous' ? 'var(--status-critical)' : tiger.movementTrend === 'dispersing' ? 'var(--status-warning)' : 'var(--text-secondary)' }}>{tiger.movementTrend}</span>} />
          <SideRow label="Sightings" value={tiger.sightings} />
          <SideRow label="Last Detected" value={new Date(tiger.lastSeen).toLocaleString()} />
          <SideRow label="Coordinates" value={`${tiger.lat.toFixed(4)}°N ${tiger.lng.toFixed(4)}°E`} mono />
        </Section>

        {/* Notes */}
        {tiger.notes && (
          <Section label="Field Notes">
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{tiger.notes}</p>
          </Section>
        )}

        {/* Action */}
        <button
          onClick={() => onViewSpatial(tiger)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            padding: '0.6rem', background: 'var(--bg-input)', border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--status-info)',
            fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.04em',
          }}
        >
          <ExternalLink size={13} /> VIEW IN SPATIAL
        </button>
      </div>

      <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        DEMO DATA — Not real scientific findings
      </div>
    </aside>
  );
}

function Section({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', paddingBottom: '0.25rem', borderBottom: '1px solid var(--border-subtle)' }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>{children}</div>
    </div>
  );
}

function SideRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
      <span style={{ color: 'var(--text-muted)', flexShrink: 0, marginRight: '0.5rem' }}>{label}</span>
      <span style={{ color: 'var(--text-secondary)', fontFamily: mono ? 'var(--font-mono)' : undefined, fontSize: mono ? '0.65rem' : undefined, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function TigerRegistry({ selectedTiger, onSelectTiger, onNavigate }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [detailTiger, setDetailTiger] = useState(selectedTiger || null);

  const filtered = useMemo(() => {
    return MOCK_TIGERS.filter(t => {
      const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'all' || t.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [search, filterStatus]);

  const handleSelect = (tiger) => {
    setDetailTiger(prev => prev?.id === tiger.id ? null : tiger);
    onSelectTiger(tiger);
  };

  const handleViewSpatial = (tiger) => {
    onNavigate('spatial', tiger);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Eye size={14} color="var(--text-muted)" /> Tiger Intelligence Registry
        </span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {filtered.length} entities · DEMO DATA
        </span>
      </div>

      {/* Filters */}
      <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.6rem', flex: '0 0 220px' }}>
          <Search size={13} color="var(--text-muted)" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ID or name..."
            style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.8rem', width: '100%', fontFamily: 'var(--font-sans)' }}
          />
        </div>
        {['all', 'normal', 'warning', 'critical'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              background: filterStatus === s ? 'var(--bg-elevated)' : 'none',
              border: `1px solid ${filterStatus === s ? 'var(--border-active)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-sm)', padding: '0.25rem 0.6rem',
              cursor: 'pointer', color: filterStatus === s ? 'var(--text-primary)' : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em',
            }}
          >{s}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No entities match the current filter.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-elevated)', zIndex: 10 }}>
                <tr>
                  {['ID', 'Name', 'Status', 'Zone', 'Last Seen', 'Sightings', 'Movement', ''].map(h => (
                    <th key={h} style={{ padding: '0.5rem 1rem', textAlign: 'left', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(tiger => (
                  <TigerRow
                    key={tiger.id}
                    tiger={tiger}
                    isSelected={detailTiger?.id === tiger.id}
                    onSelect={handleSelect}
                    onViewSpatial={handleViewSpatial}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail sidebar */}
        {detailTiger && (
          <DetailSidebar
            tiger={detailTiger}
            onClose={() => { setDetailTiger(null); onSelectTiger(null); }}
            onViewSpatial={handleViewSpatial}
          />
        )}
      </div>
    </div>
  );
}
