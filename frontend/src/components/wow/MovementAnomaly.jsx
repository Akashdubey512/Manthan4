import React from 'react';
import {
  AlertTriangle,
  MapPin,
  Activity,
  ShieldCheck,
  ArrowUpRight,
  Camera
} from 'lucide-react';

const DEMO_ANOMALY = {
  tigerId: 'T-04',
  tigerName: 'T-04',
  severity: 'HIGH RISK',
  message: 'Movement pattern has deviated significantly from historical range.',
  distanceToVillage: '2.8 km',
  previousDistance: '5.6 km',
  rangeBefore: '18.4 km²',
  rangeCurrent: '27.1 km²',
  expansion: '+47.3%',
  confidence: 91,
  station: 'CAM-B09',
  zone: 'Buffer / South-East',
  detected: '17 Aug 2026 · 03:02 IST'
};

export default function MovementAnomaly({ onViewTiger }) {
  const data = DEMO_ANOMALY;

  return (
    <div
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid rgba(229,77,66,0.45)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        boxShadow: '0 0 25px rgba(229,77,66,0.08)'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '0.65rem 0.85rem',
          background: 'rgba(229,77,66,0.08)',
          borderBottom: '1px solid rgba(229,77,66,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <AlertTriangle
            size={15}
            color="var(--status-critical)"
          />

          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.68rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: 'var(--status-critical)'
            }}
          >
            MOVEMENT ANOMALY DETECTED
          </span>
        </div>

        <span className="badge badge-critical">
          {data.severity}
        </span>
      </div>

      {/* Main */}
      <div style={{ padding: '0.9rem' }}>

        {/* Tiger */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem'
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1rem',
                fontWeight: 800,
                color: 'var(--text-primary)'
              }}
            >
              {data.tigerId}
            </div>

            <div
              style={{
                fontSize: '0.65rem',
                color: 'var(--text-muted)',
                marginTop: '2px'
              }}
            >
              {data.zone}
            </div>
          </div>

          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'var(--status-critical-bg)',
              border: '1px solid rgba(229,77,66,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Activity
              size={16}
              color="var(--status-critical)"
            />
          </div>
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: '0.72rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            marginBottom: '0.8rem'
          }}
        >
          {data.message}
        </div>

        {/* Metrics */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1px',
            background: 'var(--border-subtle)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <Metric
            label="VILLAGE DISTANCE"
            value={data.distanceToVillage}
            sub={`was ${data.previousDistance}`}
            critical
          />

          <Metric
            label="RANGE EXPANSION"
            value={data.expansion}
            sub={`${data.rangeCurrent} current`}
            warning
          />

          <Metric
            label="HISTORICAL RANGE"
            value={data.rangeBefore}
            sub="baseline"
          />

          <Metric
            label="AI CONFIDENCE"
            value={`${data.confidence}%`}
            sub="high confidence"
          />
        </div>

        {/* Evidence */}
        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.55rem 0.65rem',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem'
          }}
        >
          <Evidence
            icon={<MapPin size={11} />}
            label="LAST STATION"
            value={data.station}
          />

          <Evidence
            icon={<Camera size={11} />}
            label="DETECTED"
            value={data.detected}
          />

          <Evidence
            icon={<ShieldCheck size={11} />}
            label="STATUS"
            value="REQUIRES FIELD REVIEW"
            critical
          />
        </div>

        {/* Action */}
        <button
          onClick={() => onViewTiger?.(data.tigerId)}
          style={{
            width: '100%',
            marginTop: '0.7rem',
            padding: '0.55rem',
            background: 'var(--status-critical-bg)',
            border: '1px solid rgba(229,77,66,0.35)',
            color: 'var(--status-critical)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem'
          }}
        >
          VIEW MOVEMENT EVIDENCE
          <ArrowUpRight size={12} />
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value, sub, critical, warning }) {
  const color = critical
    ? 'var(--status-critical)'
    : warning
      ? 'var(--status-warning)'
      : 'var(--text-primary)';

  return (
    <div
      style={{
        background: 'var(--bg-panel)',
        padding: '0.55rem'
      }}
    >
      <div
        style={{
          fontSize: '0.52rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          letterSpacing: '0.05em'
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: '0.2rem',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.9rem',
          fontWeight: 800,
          color
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: '0.1rem',
          fontSize: '0.55rem',
          color: 'var(--text-muted)'
        }}
      >
        {sub}
      </div>
    </div>
  );
}

function Evidence({ icon, label, value, critical }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          fontSize: '0.55rem',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)'
        }}
      >
        {icon}
        {label}
      </span>

      <span
        style={{
          fontSize: '0.58rem',
          fontFamily: 'var(--font-mono)',
          color: critical
            ? 'var(--status-critical)'
            : 'var(--text-secondary)'
        }}
      >
        {value}
      </span>
    </div>
  );
}