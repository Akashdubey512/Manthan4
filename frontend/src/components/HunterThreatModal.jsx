import React, { useState } from 'react';
import {
  ShieldAlert, AlertTriangle, X, Radio, Crosshair, MapPin,
  Volume2, VolumeX, Send, CheckCircle2, Siren, UserX, Compass,
  Eye, Zap, Shield, ChevronRight
} from 'lucide-react';

export default function HunterThreatModal({ threat, onClose, onNavigateSpatial }) {
  const [qrfDispatched, setQrfDispatched] = useState(false);
  const [alarmTriggered, setAlarmTriggered] = useState(false);
  const [droneDeployed, setDroneDeployed] = useState(false);
  const [rfoNotified, setRfoNotified] = useState(false);

  const threatData = threat || {
    id: 'ALT-999',
    cameraId: 'CAM-103',
    cameraZone: 'Sector 4 Buffer (North-East)',
    lat: 21.7380,
    lng: 79.2850,
    time: '4 mins ago',
    humanConfidence: 98.6,
    weaponConfidence: 92.4,
    individualsCount: 2,
    proximityThreat: 'Tiger PT-03 (Maya) is 650m North-East',
    threatLevel: 'CODE RED',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 12, 0.82)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '820px',
          backgroundColor: 'var(--bg-panel)',
          border: '1px solid #E54D42',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 0 35px rgba(229, 77, 66, 0.35), 0 10px 30px rgba(0, 0, 0, 0.8)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'threatModalAppear 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: '#260B0B',
            borderBottom: '1px solid #E54D42',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(229, 77, 66, 0.25)',
                border: '1px solid #E54D42',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FF4D4D',
                animation: 'hunterBlink 1.2s infinite',
              }}
            >
              <ShieldAlert size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 800,
                    backgroundColor: '#E54D42',
                    color: '#FFF',
                    padding: '1px 6px',
                    borderRadius: '2px',
                    letterSpacing: '0.05em',
                  }}
                >
                  CRITICAL INCIDENT
                </span>
                <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: '#FFA8A8' }}>
                  {threatData.id} · THREAT INTERCEPT
                </span>
              </div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFF', letterSpacing: '0.02em', margin: '0.1rem 0 0 0' }}>
                ARMED POACHER / INTRUDER DETECTED
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 'var(--radius-sm)',
              color: '#FFF',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', minHeight: '380px' }}>
          {/* Left Column: AI Night-Vision Frame */}
          <div
            style={{
              backgroundColor: '#070C0D',
              borderRight: '1px solid var(--border-subtle)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              padding: '1rem',
            }}
          >
            <div
              style={{
                fontSize: '0.62rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>OPTICAL SENSOR FEED (IR NIGHT VISION)</span>
              <span style={{ color: '#E54D42', fontWeight: 700 }}>● LIVE FRAME SYNC</span>
            </div>

            {/* Simulated Night Thermal Sensor Box */}
            <div
              style={{
                flex: 1,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(229, 77, 66, 0.5)',
                background: 'radial-gradient(ellipse at 50% 60%, #1A2621 0%, #0D1614 45%, #050B0A 90%)',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '230px',
              }}
            >
              {/* Thermal Scan Grid Lines */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: 'linear-gradient(rgba(78, 139, 113, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(78, 139, 113, 0.05) 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />

              {/* Poacher Silhouettes */}
              <div style={{ position: 'relative', width: '130px', height: '150px' }}>
                {/* Poacher 1 with weapon */}
                <div
                  style={{
                    position: 'absolute',
                    left: '25px',
                    top: '25px',
                    width: '32px',
                    height: '80px',
                    background: '#758A7E',
                    borderRadius: '16px 16px 6px 6px',
                    opacity: 0.85,
                  }}
                >
                  {/* Head */}
                  <div style={{ position: 'absolute', top: '-18px', left: '6px', width: '20px', height: '20px', borderRadius: '50%', background: '#758A7E' }} />
                  {/* Rifle shape */}
                  <div style={{ position: 'absolute', top: '10px', right: '-24px', width: '48px', height: '4px', background: '#D68A27', transform: 'rotate(-32deg)', boxShadow: '0 0 6px rgba(214, 138, 39, 0.8)' }} />
                </div>

                {/* Poacher 2 */}
                <div
                  style={{
                    position: 'absolute',
                    left: '70px',
                    top: '40px',
                    width: '28px',
                    height: '65px',
                    background: '#5A6B62',
                    borderRadius: '14px 14px 6px 6px',
                    opacity: 0.75,
                  }}
                >
                  <div style={{ position: 'absolute', top: '-16px', left: '5px', width: '18px', height: '18px', borderRadius: '50%', background: '#5A6B62' }} />
                </div>

                {/* AI Bounding Box 1: Human Intruder */}
                <div
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '0px',
                    width: '100px',
                    height: '120px',
                    border: '1.5px solid #E54D42',
                    boxShadow: '0 0 8px rgba(229, 77, 66, 0.4)',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: -18,
                      left: -1,
                      backgroundColor: '#E54D42',
                      color: '#FFF',
                      fontSize: '0.52rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      padding: '1px 5px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    HUMAN INTRUDER 98.6%
                  </span>
                </div>

                {/* AI Bounding Box 2: Weapon */}
                <div
                  style={{
                    position: 'absolute',
                    left: '30px',
                    top: '15px',
                    width: '55px',
                    height: '42px',
                    border: '1.5px dashed #D68A27',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      bottom: -16,
                      right: -1,
                      backgroundColor: '#D68A27',
                      color: '#000',
                      fontSize: '0.48rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      padding: '1px 4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    FIREARM DETECTED 92.4%
                  </span>
                </div>
              </div>

              {/* Watermark Details */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '8px',
                  left: '10px',
                  right: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.55rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                }}
              >
                <span>{threatData.cameraId} · SENSOR-IR</span>
                <span>{threatData.lat.toFixed(4)}°N, {threatData.lng.toFixed(4)}°E</span>
              </div>
            </div>

            {/* Quick Threat Attributes */}
            <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div style={{ padding: '0.45rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>TARGET CONFIDENCE</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#E54D42', fontFamily: 'var(--font-mono)' }}>98.6% HUMAN</div>
              </div>
              <div style={{ padding: '0.45rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>FIREARM DETECTED</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#D68A27', fontFamily: 'var(--font-mono)' }}>92.4% VERIFIED</div>
              </div>
            </div>
          </div>

          {/* Right Column: Threat Intel & Immediate Tactical Action */}
          <div style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                TACTICAL INTELLIGENCE ASSESSMENT
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.73rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.35rem', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Location Sector</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{threatData.cameraZone || 'Sector 4 Buffer'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.35rem', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Camera ID</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--status-info)', fontWeight: 700 }}>{threatData.cameraId}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.35rem', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Estimated Intruders</span>
                  <span style={{ fontWeight: 700, color: '#E54D42' }}>2 Individuals (Armed)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.35rem', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Threat Timestamp</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{threatData.time}</span>
                </div>
              </div>
            </div>

            {/* High-Risk Wildlife Proximity Warning */}
            <div
              style={{
                padding: '0.6rem 0.75rem',
                backgroundColor: 'rgba(229, 77, 66, 0.12)',
                borderLeft: '3px solid #E54D42',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#E54D42', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <AlertTriangle size={13} /> HIGH-RISK WILDLIFE PROXIMITY
              </div>
              <div style={{ fontSize: '0.72rem', color: '#FFF', marginTop: '0.2rem', fontWeight: 500 }}>
                {threatData.proximityThreat}
              </div>
            </div>

            {/* Tactical Incident Action Center */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                INCIDENT RESPONSE PROTOCOLS
              </div>

              {/* Action 1: Dispatch QRF Patrol */}
              <button
                onClick={() => setQrfDispatched(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.55rem 0.85rem',
                  backgroundColor: qrfDispatched ? 'rgba(78, 139, 113, 0.2)' : '#E54D42',
                  border: qrfDispatched ? '1px solid var(--status-normal)' : '1px solid #E54D42',
                  borderRadius: 'var(--radius-sm)',
                  color: '#FFF',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Siren size={15} />
                  <span>{qrfDispatched ? 'QRF PATROL TEAM 2 DISPATCHED' : 'DISPATCH QUICK REACTION FORCE (QRF)'}</span>
                </div>
                <span style={{ fontSize: '0.6rem', opacity: 0.85 }}>
                  {qrfDispatched ? 'ETA 6 MINS' : 'IMMEDIATE'}
                </span>
              </button>

              {/* Action 2: Trigger Siren Deterrent */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  onClick={() => setAlarmTriggered(!alarmTriggered)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem',
                    backgroundColor: alarmTriggered ? 'rgba(214, 138, 39, 0.25)' : 'var(--bg-input)',
                    border: alarmTriggered ? '1px solid var(--status-warning)' : '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-sm)',
                    color: alarmTriggered ? 'var(--status-warning)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.66rem',
                    cursor: 'pointer',
                  }}
                >
                  <Volume2 size={13} />
                  <span>{alarmTriggered ? 'ALARM ACTIVE (110dB)' : 'SOUND PERIMETER SIREN'}</span>
                </button>

                <button
                  onClick={() => setDroneDeployed(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem',
                    backgroundColor: droneDeployed ? 'rgba(49, 130, 206, 0.25)' : 'var(--bg-input)',
                    border: droneDeployed ? '1px solid var(--status-info)' : '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-sm)',
                    color: droneDeployed ? 'var(--status-info)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.66rem',
                    cursor: 'pointer',
                  }}
                >
                  <Radio size={13} />
                  <span>{droneDeployed ? 'DRONE EN ROUTE' : 'DEPLOY DRONE RECON'}</span>
                </button>
              </div>

              {/* Action 3: Map Jump */}
              {onNavigateSpatial && (
                <button
                  onClick={() => {
                    onClose();
                    onNavigateSpatial();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                  }}
                >
                  <MapPin size={13} color="var(--status-info)" />
                  <span>FOCUS LOCATION ON GIS MAP</span>
                  <ChevronRight size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
