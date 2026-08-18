import React from 'react';
import {
  MapPin,
  Camera,
  Navigation,
  Clock,
  TrendingUp
} from 'lucide-react';

const EVENTS = [
  {
    station: 'CAM-B03',
    zone: 'Core Zone',
    date: '12 Jan 2026',
    time: '22:32',
    distance: '0 km',
    status: 'normal'
  },
  {
    station: 'CAM-B05',
    zone: 'Core Zone',
    date: '18 Feb 2026',
    time: '02:14',
    distance: '3.2 km',
    status: 'normal'
  },
  {
    station: 'CAM-B07',
    zone: 'Buffer Zone',
    date: '24 Mar 2026',
    time: '01:48',
    distance: '5.7 km',
    status: 'warning'
  },
  {
    station: 'CAM-B09',
    zone: 'Village Buffer',
    date: '17 Aug 2026',
    time: '03:02',
    distance: '9.8 km',
    status: 'critical'
  }
];

export default function TigerTimeline({ tigerId = 'T-04' }) {
  return (
    <div
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden'
      }}
    >
      <div className="panel-header">
        <div className="panel-title">
          <Navigation
            size={13}
            color="var(--status-info)"
          />
          MOVEMENT TIMELINE · {tigerId}
        </div>

        <span
          style={{
            fontSize: '0.55rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--status-critical)'
          }}
        >
          ANOMALOUS
        </span>
      </div>

      {/* Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1px',
          background: 'var(--border-subtle)'
        }}
      >
        <Summary
          icon={<MapPin size={12} />}
          label="STATIONS"
          value="04"
        />

        <Summary
          icon={<TrendingUp size={12} />}
          label="DISTANCE"
          value="9.8 km"
        />

        <Summary
          icon={<Clock size={12} />}
          label="LAST SEEN"
          value="03:02"
        />
      </div>

      {/* Timeline */}
      <div style={{ padding: '1rem' }}>
        {EVENTS.map((event, index) => {
          const isLast = index === EVENTS.length - 1;

          const color =
            event.status === 'critical'
              ? 'var(--status-critical)'
              : event.status === 'warning'
                ? 'var(--status-warning)'
                : 'var(--status-normal)';

          return (
            <div
              key={event.station}
              style={{
                display: 'flex',
                position: 'relative',
                minHeight: isLast ? 'auto' : '75px'
              }}
            >
              {/* Line */}
              {!isLast && (
                <div
                  style={{
                    position: 'absolute',
                    left: '8px',
                    top: '18px',
                    bottom: 0,
                    width: '1px',
                    background: 'var(--border-default)'
                  }}
                />
              )}

              {/* Node */}
              <div
                style={{
                  width: '17px',
                  height: '17px',
                  flexShrink: 0,
                  borderRadius: '50%',
                  border: `2px solid ${color}`,
                  background: 'var(--bg-panel)',
                  position: 'relative',
                  zIndex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <div
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: color
                  }}
                />
              </div>

              {/* Content */}
              <div
                style={{
                  marginLeft: '0.75rem',
                  flex: 1,
                  paddingBottom: isLast ? 0 : '0.9rem'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)'
                    }}
                  >
                    {event.station}
                  </div>

                  <span
                    style={{
                      fontSize: '0.55rem',
                      color,
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    {event.distance}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: '0.15rem',
                    fontSize: '0.6rem',
                    color: 'var(--text-secondary)'
                  }}
                >
                  {event.zone}
                </div>

                <div
                  style={{
                    marginTop: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: 'var(--text-muted)',
                    fontSize: '0.55rem',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  <Camera size={9} />
                  {event.date} · {event.time} IST
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '0.6rem 0.85rem',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-elevated)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span
          style={{
            fontSize: '0.55rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)'
          }}
        >
          RANGE EXPANSION
        </span>

        <span
          style={{
            color: 'var(--status-critical)',
            fontSize: '0.7rem',
            fontWeight: 800,
            fontFamily: 'var(--font-mono)'
          }}
        >
          +47.3%
        </span>
      </div>
    </div>
  );
}

function Summary({ icon, label, value }) {
  return (
    <div
      style={{
        background: 'var(--bg-panel)',
        padding: '0.55rem 0.65rem'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          color: 'var(--text-muted)',
          fontSize: '0.5rem',
          fontFamily: 'var(--font-mono)'
        }}
      >
        {icon}
        {label}
      </div>

      <div
        style={{
          marginTop: '0.2rem',
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          fontSize: '0.75rem'
        }}
      >
        {value}
      </div>
    </div>
  );
}