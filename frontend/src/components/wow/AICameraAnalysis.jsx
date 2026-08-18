import React from 'react';
import {
  ScanLine,
  CheckCircle2,
  ShieldCheck,
  Fingerprint,
  Eye,
  User
} from 'lucide-react';

export default function AICameraAnalysis() {
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
          <ScanLine
            size={13}
            color="var(--status-normal)"
          />
          AI CAMERA TRAP ANALYSIS
        </div>

        <span
          className="badge badge-normal"
        >
          VERIFIED
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          minHeight: '245px'
        }}
      >
        {/* Image placeholder */}
        <div
          style={{
            position: 'relative',
            background:
              'linear-gradient(135deg,#111722,#080c11)',
            borderRight: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          {/* Simulated camera image */}
          <div
            style={{
              width: '82%',
              height: '75%',
              border: '1px solid var(--border-default)',
              background:
                'radial-gradient(circle at 60% 50%, #343d3c 0%, #141b1b 38%, #080c10 75%)',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
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
                position: 'relative'
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
                  background: '#59615d'
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
                    transform: 'rotate(18deg)'
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
                border: '1px solid var(--status-normal)'
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
                  fontWeight: 800
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
              color: 'var(--text-muted)'
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
            gap: '0.65rem'
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
            value="T-04 · 94.7%"
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
              borderTop: '1px solid var(--border-subtle)'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.35rem'
              }}
            >
              <span
                style={{
                  fontSize: '0.55rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)'
                }}
              >
                STRIPE SIMILARITY
              </span>

              <span
                style={{
                  fontSize: '0.65rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 800,
                  color: 'var(--status-normal)'
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
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: '94.7%',
                  height: '100%',
                  background: 'var(--status-normal)'
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
              fontSize: '0.55rem'
            }}
          >
            <CheckCircle2 size={11} />
            AI ANALYSIS COMPLETE
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalysisRow({ icon, label, value, good }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '0.45rem',
        borderBottom: '1px solid var(--border-subtle)'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          color: 'var(--text-muted)'
        }}
      >
        {icon}

        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.53rem'
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
          color: good
            ? 'var(--status-normal)'
            : 'var(--text-primary)'
        }}
      >
        {value}
      </span>
    </div>
  );
}