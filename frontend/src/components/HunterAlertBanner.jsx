import React, { useState } from 'react';
import { ShieldAlert, Siren, Crosshair, ArrowRight, X, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

export default function HunterAlertBanner({ onOpenModal, threat }) {
  const [dismissed, setDismissed] = useState(false);
  const [dispatched, setDispatched] = useState(false);
  const [minimized, setMinimized] = useState(false);

  if (dismissed) return null;

  const threatData = threat || {
    id: 'ALT-999',
    cameraId: 'CAM-103',
    cameraZone: 'Sector 4 Buffer',
    time: '4 mins ago',
    weaponConfidence: 92.4,
  };

  if (minimized) {
    return (
      <div
        style={{
          backgroundColor: '#2A0A0A',
          borderBottom: '1px solid #E54D42',
          padding: '0.3rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 85,
          animation: 'hunterBannerSlide 0.3s ease-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#E54D42',
              display: 'inline-block',
              animation: 'hunterBlink 1s infinite',
            }}
          />
          <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#FFA8A8' }}>
            🚨 ACTIVE POACHER ALERT: {threatData.cameraId} ({threatData.cameraZone})
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={onOpenModal}
            style={{
              background: '#E54D42',
              color: '#FFF',
              border: 'none',
              borderRadius: '2px',
              padding: '2px 8px',
              fontSize: '0.62rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            EXPAND
          </button>
          <button
            onClick={() => setDismissed(true)}
            style={{ background: 'none', border: 'none', color: '#AAA', cursor: 'pointer' }}
          >
            <X size={13} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: '#1E0808',
        borderBottom: '1.5px solid #E54D42',
        boxShadow: '0 2px 14px rgba(229, 77, 66, 0.25)',
        padding: '0.45rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 85,
        position: 'relative',
        animation: 'hunterBannerSlide 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Left Alert Notification */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(229, 77, 66, 0.25)',
            border: '1px solid #E54D42',
            color: '#FF4D4D',
            animation: 'hunterBlink 1.2s infinite',
          }}
        >
          <ShieldAlert size={16} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span
            style={{
              fontSize: '0.6rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              backgroundColor: '#E54D42',
              color: '#FFF',
              padding: '1px 5px',
              borderRadius: '2px',
              letterSpacing: '0.06em',
            }}
          >
            CODE RED ALERT
          </span>

          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#FFF', letterSpacing: '0.02em' }}>
            ARMED INTRUDER / SUSPECTED POACHER DETECTED AT {threatData.cameraId} ({threatData.cameraZone})
          </span>

          <span
            style={{
              fontSize: '0.6rem',
              fontFamily: 'var(--font-mono)',
              color: '#FFA8A8',
              backgroundColor: 'rgba(214, 138, 39, 0.2)',
              border: '1px solid rgba(214, 138, 39, 0.4)',
              padding: '1px 5px',
              borderRadius: '2px',
            }}
          >
            FIREARM SIGNATURE: {threatData.weaponConfidence}%
          </span>
        </div>
      </div>

      {/* Right Action Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {dispatched ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: 'var(--status-normal)',
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              backgroundColor: 'rgba(78, 139, 113, 0.15)',
              border: '1px solid var(--status-normal)',
              padding: '3px 8px',
              borderRadius: '2px',
            }}
          >
            <CheckCircle2 size={12} />
            <span>QRF TEAM DISPATCHED (ETA 6 MINS)</span>
          </div>
        ) : (
          <button
            onClick={() => setDispatched(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: '#E54D42',
              color: '#FFF',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 10px',
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Siren size={12} />
            <span>DISPATCH QRF PATROL</span>
          </button>
        )}

        <button
          onClick={onOpenModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            color: '#FFF',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 10px',
            fontSize: '0.68rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <span>INTERCEPT & VIEW FEED</span>
          <ArrowRight size={11} />
        </button>

        <button
          onClick={() => setMinimized(true)}
          title="Minimize banner"
          style={{
            background: 'none',
            border: 'none',
            color: '#AAA',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ChevronUp size={14} />
        </button>

        <button
          onClick={() => setDismissed(true)}
          title="Dismiss alert banner"
          style={{
            background: 'none',
            border: 'none',
            color: '#AAA',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
