import React, { useState } from 'react';
import { ShieldAlert, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login({ onSwitchToRegister }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Email and password are required');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    
    const { error } = await login(email, password);
    if (error) {
      setErrorMsg(error);
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100vw',
      backgroundColor: 'var(--bg-base)',
      fontFamily: 'var(--font-sans)',
    }}>
      <div className="panel" style={{ width: '100%', maxWidth: '380px', padding: '0', overflow: 'hidden' }}>
        <div className="panel-header" style={{ justifyContent: 'center', padding: '1.25rem 1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: 'var(--radius-sm)',
                background: 'var(--status-normal-bg)', border: '1px solid var(--status-normal)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--status-normal)', fontWeight: 800, fontSize: '0.9rem', fontFamily: 'var(--font-mono)'
              }}>M4</div>
              <span style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
                MANTHAN<span style={{ color: 'var(--status-warning)' }}>4</span>
              </span>
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Pench Tiger Reserve · GIS Ops
            </div>
          </div>
        </div>

        <div style={{ padding: '1.5rem 1.5rem 2rem 1.5rem' }}>
          {errorMsg && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem', marginBottom: '1rem',
              backgroundColor: 'var(--status-critical-bg)',
              borderLeft: '3px solid var(--status-critical)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--status-critical)',
              fontSize: '0.75rem',
            }}>
              <ShieldAlert size={14} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Operational Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.6rem 0.75rem',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
                placeholder="operator@penchtiger.gov.in"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Clearance Code
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.6rem 2.5rem 0.6rem 0.75rem',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  style={{
                    position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '0.5rem',
                width: '100%',
                backgroundColor: 'var(--status-normal)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '0.7rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'background-color 0.15s ease'
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> : 'AUTHENTICATE SESSION'}
            </button>
            <style>
              {`
                @keyframes spin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
              `}
            </style>
          </form>

          {onSwitchToRegister && (
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <button
                onClick={onSwitchToRegister}
                disabled={loading}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--text-muted)', fontSize: '0.75rem',
                  cursor: 'pointer', textDecoration: 'underline',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                REQUEST SYSTEM ACCESS (REGISTER)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
