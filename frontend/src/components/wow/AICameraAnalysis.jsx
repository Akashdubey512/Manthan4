import React, { useState } from 'react';
import {
  ScanLine,
  CheckCircle2,
  ShieldCheck,
  Fingerprint,
  Eye,
  User,
  ShieldAlert,
  AlertTriangle,
  Siren,
  Crosshair
} from 'lucide-react';

export default function AICameraAnalysis({ onInspectHunter }) {
  const [activeMode, setActiveMode] = useState('hunter'); // 'tiger' | 'hunter'

  return (
    <div
      style={{
        background: 'var(--bg-panel)',
        border: activeMode === 'hunter' ? '1px solid #E54D42' : '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        transition: 'border-color 0.2s ease',
      }}
    >
      {/* Header with Mode Switcher */}
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <ScanLine
            size={13}
            color={activeMode === 'hunter' ? '#E54D42' : 'var(--status-normal)'}
          />
          <span>AI CAMERA TRAP TELEMETRY</span>
        </div>

        {/* Mode Selector Tabs */}
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <button
            onClick={() => setActiveMode('hunter')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              background: activeMode === 'hunter' ? '#E54D42' : 'var(--bg-input)',
              color: activeMode === 'hunter' ? '#FFF' : '#E54D42',
              border: '1px solid #E54D42',
              padding: '2px 7px',
              borderRadius: '2px',
              fontSize: '0.58rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <ShieldAlert size={10} />
            <span>🚨 POACHER DETECTED</span>
          </button>

          <button
            onClick={() => setActiveMode('tiger')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              background: activeMode === 'tiger' ? 'var(--status-normal)' : 'var(--bg-input)',
              color: activeMode === 'tiger' ? '#07100C' : 'var(--text-secondary)',
              border: activeMode === 'tiger' ? '1px solid var(--status-normal)' : '1px solid var(--border-default)',
              padding: '2px 7px',
              borderRadius: '2px',
              fontSize: '0.58rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <span>🐯 TIGER MATCH</span>
          </button>
        </div>
      </div>

      {activeMode === 'hunter' ? (
        /* Hunter / Poacher Threat View */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            minHeight: '245px',
          }}
        >
          {/* Simulated IR / Night Vision Frame */}
          <div
            style={{
              position: 'relative',
              background: 'linear-gradient(135deg, #1C0A0A, #0A0404)',
              borderRight: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '82%',
                height: '78%',
                border: '1px solid rgba(229, 77, 66, 0.4)',
                background: 'radial-gradient(circle at 50% 50%, #202A24 0%, #0F1714 45%, #060A08 85%)',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Intruder Silhouette 1 */}
              <div
                style={{
                  position: 'absolute',
                  left: '32%',
                  top: '25%',
                  width: '28px',
                  height: '65px',
                  background: '#6C7E74',
                  borderRadius: '12px 12px 4px 4px',
                  opacity: 0.85,
                }}
              >
                {/* Head */}
                <div style={{ position: 'absolute', top: '-14px', left: '6px', width: '16px', height: '16px', borderRadius: '50%', background: '#6C7E74' }} />
                {/* Firearm */}
                <div style={{ position: 'absolute', top: '12px', right: '-18px', width: '38px', height: '3px', background: '#D68A27', transform: 'rotate(-28deg)', boxShadow: '0 0 4px #D68A27' }} />
              </div>

              {/* Intruder Silhouette 2 */}
              <div
                style={{
                  position: 'absolute',
                  left: '60%',
                  top: '32%',
                  width: '24px',
                  height: '55px',
                  background: '#536159',
                  borderRadius: '10px 10px 4px 4px',
                  opacity: 0.7,
                }}
              >
                <div style={{ position: 'absolute', top: '-12px', left: '5px', width: '14px', height: '14px', borderRadius: '50%', background: '#536159' }} />
              </div>

              {/* Bounding Box 1: Human Intruder */}
              <div
                style={{
                  position: 'absolute',
                  left: '24%',
                  top: '12%',
                  width: '62%',
                  height: '75%',
                  border: '1.5px solid #E54D42',
                  boxShadow: '0 0 6px rgba(229, 77, 66, 0.4)',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: -16,
                    left: -1,
                    background: '#E54D42',
                    color: '#FFF',
                    padding: '1px 5px',
                    fontSize: '0.5rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 800,
                  }}
                >
                  ARMED INTRUDER 98.6%
                </span>
              </div>

              {/* Bounding Box 2: Firearm */}
              <div
                style={{
                  position: 'absolute',
                  left: '36%',
                  top: '26%',
                  width: '38%',
                  height: '35%',
                  border: '1px dashed #D68A27',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    bottom: -15,
                    right: -1,
                    background: '#D68A27',
                    color: '#000',
                    padding: '1px 4px',
                    fontSize: '0.45rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 800,
                  }}
                >
                  FIREARM 92.4%
                </span>
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                left: '0.7rem',
                bottom: '0.55rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.5rem',
                color: '#FFA8A8',
              }}
            >
              CAM-103 · SECTOR 4 BUFFER · 03:14 IST
            </div>
          </div>

          {/* Hunter Analysis Telemetry */}
          <div
            style={{
              padding: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.55rem',
            }}
          >
            <AnalysisRow
              icon={<User size={13} />}
              label="HUMAN INTRUSION"
              value="2 INDIVIDUALS (98.6%)"
              alert
            />

            <AnalysisRow
              icon={<Crosshair size={13} />}
              label="WEAPON SIGNATURE"
              value="FIREARM VERIFIED (92.4%)"
              alert
            />

            <AnalysisRow
              icon={<AlertTriangle size={13} />}
              label="THREAT SEVERITY"
              value="CODE RED (CRITICAL)"
              alert
            />

            <AnalysisRow
              icon={<Eye size={13} />}
              label="NEARBY WILDLIFE"
              value="PT-03 IN RANGE (~650m)"
              warn
            />

            <AnalysisRow
              icon={<ShieldCheck size={13} />}
              label="SENSOR UNIT"
              value="CAM-103 (SECTOR 4)"
            />

            {/* Match score bar */}
            <div
              style={{
                marginTop: 'auto',
                paddingTop: '0.5rem',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '0.3rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.55rem',
                    fontFamily: 'var(--font-mono)',
                    color: '#FFA8A8',
                  }}
                >
                  POACHING RISK SCORE
                </span>

                <span
                  style={{
                    fontSize: '0.65rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 800,
                    color: '#E54D42',
                  }}
                >
                  98.6% (CRITICAL)
                </span>
              </div>

              <div
                style={{
                  height: 6,
                  background: 'var(--bg-input)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: '98.6%',
                    height: '100%',
                    background: 'linear-gradient(90deg, #D68A27, #E54D42)',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#E54D42',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.55rem',
                fontWeight: 700,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <ShieldAlert size={11} />
                INTERCEPT REQUIRED
              </span>

              {onInspectHunter && (
                <button
                  onClick={onInspectHunter}
                  style={{
                    background: '#E54D42',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '2px',
                    padding: '2px 6px',
                    fontSize: '0.55rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  INSPECT INCIDENT →
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Standard Tiger Match View */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            minHeight: '245px',
          }}
        >
          {/* Image placeholder */}
          <div
            style={{
              position: 'relative',
              background: 'linear-gradient(135deg,#111722,#080c11)',
              borderRight: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {/* Simulated camera image */}
            <div
              style={{
                width: '82%',
                height: '75%',
                border: '1px solid var(--border-default)',
                background: 'radial-gradient(circle at 60% 50%, #343d3c 0%, #141b1b 38%, #080c10 75%)',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Tiger silhouette */}
              <div
                style={{
                  width: '100px',
                  height: '55px',
                  background: '#59615d',
                  borderRadius: '50% 45% 40% 50%',
                  opacity: 0.65,
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    right: '-13px',
                    top: '8px',
                    width: 27,
                    height: 27,
                    borderRadius: '50%',
                    background: '#59615d',
                  }}
                />

                {/* Stripe-like lines */}
                {[0, 1, 2, 3].map(i => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: 25 + i * 14,
                      top: 10,
                      width: 2,
                      height: 38,
                      background: '#171c1b',
                      transform: 'rotate(18deg)',
                    }}
                  />
                ))}
              </div>

              {/* Detection box */}
              <div
                style={{
                  position: 'absolute',
                  left: '24%',
                  top: '30%',
                  width: '52%',
                  height: '40%',
                  border: '1px solid var(--status-normal)',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: -18,
                    left: -1,
                    background: 'var(--status-normal)',
                    color: '#07100c',
                    padding: '2px 5px',
                    fontSize: '0.5rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 800,
                  }}
                >
                  TIGER 98.2%
                </span>
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                left: '0.7rem',
                bottom: '0.55rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.5rem',
                color: 'var(--text-muted)',
              }}
            >
              CAM-B09 · FRAME #001842
            </div>
          </div>

          {/* Analysis */}
          <div
            style={{
              padding: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
            }}
          >
            <AnalysisRow
              icon={<Eye size={13} />}
              label="ANIMAL DETECTION"
              value="98.2%"
              good
            />

            <AnalysisRow
              icon={<Fingerprint size={13} />}
              label="INDIVIDUAL MATCH"
              value="PT-01 · 94.7%"
              good
            />

            <AnalysisRow
              icon={<ScanLine size={13} />}
              label="STRIPE FEATURES"
              value="47 MATCHES"
              good
            />

            <AnalysisRow
              icon={<User size={13} />}
              label="HUMAN DETECTED"
              value="NO"
              good
            />

            <AnalysisRow
              icon={<ShieldCheck size={13} />}
              label="FRAME STATUS"
              value="VERIFIED"
              good
            />

            {/* Match score */}
            <div
              style={{
                marginTop: 'auto',
                paddingTop: '0.6rem',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '0.35rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.55rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)',
                  }}
                >
                  STRIPE SIMILARITY
                </span>

                <span
                  style={{
                    fontSize: '0.65rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 800,
                    color: 'var(--status-normal)',
                  }}
                >
                  94.7%
                </span>
              </div>

              <div
                style={{
                  height: 6,
                  background: 'var(--bg-input)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: '94.7%',
                    height: '100%',
                    background: 'var(--status-normal)',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                color: 'var(--status-normal)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.55rem',
              }}
            >
              <CheckCircle2 size={11} />
              AI ANALYSIS COMPLETE
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalysisRow({ icon, label, value, good, alert, warn }) {
  let color = 'var(--text-primary)';
  if (good) color = 'var(--status-normal)';
  else if (alert) color = '#E54D42';
  else if (warn) color = 'var(--status-warning)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '0.45rem',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          color: alert ? '#E54D42' : 'var(--text-muted)',
        }}
      >
        {icon}
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.53rem',
          }}
        >
          {label}
        </span>
      </div>

      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.6rem',
          fontWeight: 700,
          color,
        }}
      >
        {value}
      </span>
    </div>
  );
}