import React, { useState } from 'react';
import { Shield, Lock, Mail, ArrowRight, Loader, AlertTriangle, Eye, EyeOff, Radio, Cpu } from 'lucide-react';
import { login } from '../services/api';

export default function LoginScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState('admin@manthan.org');
  const [password, setPassword] = useState('admin12345');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await login(email, password);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else if (res.user) {
      if (onLoginSuccess) {
        onLoginSuccess(res.user);
      }
    }
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      backgroundColor: 'var(--bg-base)',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(78, 139, 113, 0.08) 0%, transparent 65%)',
      fontFamily: 'var(--font-sans)',
      userSelect: 'none',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Tactical Grid Background lines */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        pointerEvents: 'none'
      }} />

      {/* Main Authentication Box */}
      <div style={{
        width: '420px',
        backgroundColor: 'var(--bg-panel)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-dropdown)',
        zIndex: 10,
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          backgroundColor: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--status-normal-bg)',
            border: '1px solid var(--status-normal)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--status-normal)',
            fontWeight: 800,
            fontSize: '1rem',
            fontFamily: 'var(--font-mono)'
          }}>M4</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
              MANTHAN<span style={{ color: 'var(--status-warning)' }}>4</span>
            </div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Pench Tiger GIS Operations & Triage
            </div>
          </div>
        </div>

        {/* Security / System Banner */}
        <div style={{
          padding: '0.5rem 1.5rem',
          backgroundColor: 'rgba(78, 139, 113, 0.08)',
          borderBottom: '1px solid var(--border-subtle)',
          fontSize: '0.65rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--status-normal)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Radio size={11} className="animate-pulse" /> CLASSIFIED FIELD ACCESS
          </span>
          <span>v1.4.0-PROD</span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div style={{
              padding: '0.65rem 0.85rem',
              backgroundColor: 'var(--status-critical-bg)',
              border: '1px solid var(--status-critical)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--status-critical)',
              fontSize: '0.72rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertTriangle size={14} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Operator Identity (Email)
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.45rem 0.65rem',
              gap: '0.5rem'
            }}>
              <Mail size={14} color="var(--text-muted)" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@manthan.org"
                required
                style={{
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-mono)',
                  width: '100%'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Passphrase Key
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.45rem 0.65rem',
              gap: '0.5rem'
            }}>
              <Lock size={14} color="var(--text-muted)" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-mono)',
                  width: '100%'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Quick Credential Helper / Demo Pill */}
          <div style={{
            fontSize: '0.62rem',
            color: 'var(--text-muted)',
            backgroundColor: 'var(--bg-input)',
            padding: '0.4rem 0.6rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>Default Officer: <strong style={{ color: 'var(--status-normal)' }}>admin@manthan.org</strong></span>
            <span>Key: <strong style={{ color: 'var(--text-secondary)' }}>admin12345</strong></span>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              padding: '0.65rem',
              backgroundColor: 'var(--status-normal)',
              color: 'var(--bg-base)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 700,
              fontSize: '0.78rem',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'opacity 0.2s ease',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? (
              <>
                <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Authenticating Secure Node...</span>
              </>
            ) : (
              <>
                <span>Enter Operational Station</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          padding: '0.65rem 1.5rem',
          backgroundColor: 'var(--bg-elevated)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.6rem',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Cpu size={11} color="var(--status-normal)" /> SUPABASE + FASTAPI PIPELINE
          </span>
          <span style={{ color: 'var(--status-normal)' }}>● ONLINE</span>
        </div>
      </div>
    </div>
  );
}
