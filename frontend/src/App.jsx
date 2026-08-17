import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Map as MapIcon, Eye, HardDrive, Camera, 
  ShieldAlert, Settings, Search, Wifi, Clock, User, X, ChevronRight, ExternalLink, LogOut, Terminal
} from 'lucide-react';
import IntelligenceOverview from './pages/IntelligenceOverview';
import SpatialView from './pages/SpatialView';
import TigerRegistry from './pages/TigerRegistry';
import DataIngest from './pages/DataIngest';
import IntelligenceAssistant from './pages/IntelligenceAssistant';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'spatial',  label: 'Map View / Spatial', icon: MapIcon },
  { id: 'registry', label: 'Wildlife / Tiger Registry', icon: Eye },
  { id: 'ingest',   label: 'Data Ingestion', icon: HardDrive },
  { id: 'ai_assistant', label: 'AI Intelligence', icon: Terminal },
];

function useLiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())} IST`;
}

// ─── Left Operational Sidebar ──────────────────────────────────────────────
function LeftSidebar({ activeTab, onTabChange }) {
  const { user, logout } = useAuth();
  return (
    <aside style={{
      width: '230px',
      flexShrink: 0,
      backgroundColor: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none',
      zIndex: 100,
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '1rem 1.15rem',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '26px', height: '26px', borderRadius: 'var(--radius-sm)',
            background: 'var(--status-normal-bg)', border: '1px solid var(--status-normal)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--status-normal)', fontWeight: 800, fontSize: '0.85rem', fontFamily: 'var(--font-mono)'
          }}>M4</div>
          <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
            MANTHAN<span style={{ color: 'var(--status-warning)' }}>4</span>
          </span>
        </div>
        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: '0.1rem' }}>
          Pench Tiger GIS Operations
        </div>
      </div>

      {/* Main Navigation */}
      <div style={{ padding: '0.85rem 0.65rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto' }}>
        <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0.25rem 0.55rem 0.4rem 0.55rem' }}>
          Operational Modules
        </div>
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`sidebar-nav-item${isActive ? ' active' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              <Icon size={16} color={isActive ? 'var(--status-normal)' : 'var(--text-muted)'} />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Secondary Monitoring Group */}
        <div style={{ marginTop: '1.25rem', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0.25rem 0.55rem 0.4rem 0.55rem' }}>
          Monitoring & Devices
        </div>
        <button
          className={`sidebar-nav-item${activeTab === 'cameras' ? ' active' : ''}`}
          onClick={() => onTabChange('spatial')}
        >
          <Camera size={16} color="var(--text-muted)" />
          <span>Camera Traps (124)</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.6rem', padding: '1px 5px', borderRadius: '2px', background: 'var(--status-normal-bg)', color: 'var(--status-normal)', fontFamily: 'var(--font-mono)' }}>121 ON</span>
        </button>
        <button
          className={`sidebar-nav-item${activeTab === 'alerts' ? ' active' : ''}`}
          onClick={() => onTabChange('overview')}
        >
          <ShieldAlert size={16} color="var(--status-warning)" />
          <span>Incident Feed</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.6rem', padding: '1px 5px', borderRadius: '2px', background: 'var(--status-warning-bg)', color: 'var(--status-warning)', fontFamily: 'var(--font-mono)' }}>4 NEW</span>
        </button>
        <button
          className="sidebar-nav-item"
          style={{ opacity: 0.65 }}
        >
          <Settings size={16} color="var(--text-muted)" />
          <span>System Config</span>
        </button>
      </div>

      {/* Operator Status Footer */}
      <div style={{
        padding: '0.85rem 1rem',
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-panel)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={13} color="var(--text-secondary)" />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                {user?.name || 'Operator'}
              </div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                {user?.role?.replace('_', ' ') || 'FIELD OFFICER'}
              </div>
            </div>
          </div>
          <button 
            onClick={logout}
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.25rem',
              borderRadius: 'var(--radius-sm)', transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--status-critical)'; e.currentTarget.style.background = 'var(--status-critical-bg)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
            title="Secure Logout"
          >
            <LogOut size={14} />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.2rem', fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--status-normal)' }}>
            <Wifi size={10} color="var(--status-normal)" /> SECURE LINK
          </span>
          <span>v1.4.0-PROD</span>
        </div>
      </div>
    </aside>
  );
}

// ─── Top Command Header Bar ─────────────────────────────────────────────
function TopCommandBar({ activeTab }) {
  const clock = useLiveClock();
  const [timeRange, setTimeRange] = useState('24h');

  return (
    <header style={{
      height: '48px',
      backgroundColor: 'var(--bg-panel)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justify: 'space-between',
      padding: '0 1.25rem',
      flexShrink: 0,
      zIndex: 90,
    }}>
      {/* Search / Command Input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '0 1 420px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          backgroundColor: 'var(--bg-input)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.3rem 0.65rem',
          width: '100%',
        }}>
          <Search size={13} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search entity ID, camera trap, or sector..."
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.75rem',
              width: '100%',
              fontFamily: 'var(--font-sans)',
            }}
          />
          <span style={{
            fontSize: '0.58rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '2px',
            padding: '1px 4px',
            background: 'var(--bg-panel)',
            flexShrink: 0,
          }}>Ctrl+K</span>
        </div>
      </div>

      {/* Control Tools & Clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Time Range Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Clock size={13} color="var(--text-muted)" />
          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
              fontSize: '0.7rem',
              fontFamily: 'var(--font-mono)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.2rem 0.4rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="season">Monitored Season</option>
          </select>
        </div>

        <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)' }} />

        {/* Live System Time */}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-primary)', fontWeight: 600, letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--status-normal)', display: 'inline-block' }} />
          <span>{clock}</span>
        </div>
      </div>
    </header>
  );
}

// ─── Right Contextual Intelligence Drawer ──────────────────────────────────
function ContextualIntelligenceDrawer({ tiger, onClose, onNavigate }) {
  if (!tiger) return null;

  const statusColor = {
    normal:   'var(--status-normal)',
    warning:  'var(--status-warning)',
    critical: 'var(--status-critical)',
  };
  const statusLabel = {
    normal:   'NOMINAL',
    warning:  'WATCH',
    critical: 'ANOMALY',
  };
  const color = statusColor[tiger.status] || 'var(--status-normal)';

  return (
    <aside style={{
      width: '320px',
      flexShrink: 0,
      backgroundColor: 'var(--bg-panel)',
      borderLeft: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 90,
      boxShadow: 'var(--shadow-panel)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '0.75rem 1rem',
        backgroundColor: 'var(--bg-elevated)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            FIELD RECORD · {tiger.id}
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: '0.1rem' }}>
            {tiger.name}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Drawer Content */}
      <div style={{ padding: '1rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Operational Status */}
        <div style={{
          padding: '0.6rem 0.85rem',
          backgroundColor: `${color}14`,
          borderLeft: `3px solid ${color}`,
          borderRadius: 'var(--radius-sm)',
        }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Current Status
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color, letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '0.15rem' }}>
            ● {statusLabel[tiger.status]}
          </div>
        </div>

        {/* Identification Section */}
        <div>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.2rem' }}>
            Identification Bio
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.75rem' }}>
            <DrawerRow label="Sex" value={tiger.sex} />
            <DrawerRow label="Age Class" value={tiger.ageClass} />
            <DrawerRow label="Stripe Match" value={
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, maxWidth: '140px' }}>
                <div style={{ flex: 1, height: '4px', background: 'var(--bg-input)', borderRadius: '2px' }}>
                  <div style={{ width: `${tiger.stripeMatchConfidence}%`, height: '100%', background: tiger.stripeMatchConfidence > 90 ? 'var(--status-normal)' : 'var(--status-warning)', borderRadius: '2px' }} />
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-primary)' }}>{tiger.stripeMatchConfidence}%</span>
              </div>
            } />
          </div>
        </div>

        {/* Spatial Intelligence */}
        <div>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.2rem' }}>
            Spatial Intelligence
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.75rem' }}>
            <DrawerRow label="Zone" value={tiger.zone} />
            <DrawerRow label="Home Range" value={`~${tiger.homeRangeKm2} km²`} />
            <DrawerRow label="Movement Trend" value={<span style={{ textTransform: 'capitalize', color: tiger.movementTrend === 'anomalous' ? 'var(--status-critical)' : tiger.movementTrend === 'dispersing' ? 'var(--status-warning)' : 'var(--text-secondary)' }}>{tiger.movementTrend}</span>} />
            <DrawerRow label="Sightings" value={tiger.sightings} />
            <DrawerRow label="Last Seen" value={new Date(tiger.lastSeen).toLocaleString()} />
            <DrawerRow label="Coordinates" value={`${tiger.lat.toFixed(4)}°N ${tiger.lng.toFixed(4)}°E`} mono />
          </div>
        </div>

        {/* Notes */}
        {tiger.notes && (
          <div>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Field Intelligence Notes
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.45, backgroundColor: 'var(--bg-input)', padding: '0.5rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              {tiger.notes}
            </div>
          </div>
        )}

        {/* Jump Action Buttons */}
        <div style={{ marginTop: 'auto', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            onClick={() => onNavigate('spatial', tiger)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
              padding: '0.55rem', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--status-info)',
              fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.04em',
            }}
          >
            <ExternalLink size={13} /> FOCUS IN SPATIAL MAP
          </button>
          <button
            onClick={() => onNavigate('registry', tiger)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
              padding: '0.55rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 500,
            }}
          >
            OPEN IN REGISTRY
          </button>
        </div>
      </div>
    </aside>
  );
}

function DrawerRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--text-secondary)', fontFamily: mono ? 'var(--font-mono)' : undefined, fontSize: mono ? '0.65rem' : undefined }}>{value}</span>
    </div>
  );
}

// ─── Main App Component ───────────────────────────────────────────────────
export default function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab]         = useState('overview');
  const [selectedTiger, setSelectedTiger] = useState(null);
  const [showRegister, setShowRegister] = useState(false);

  if (isLoading) {
    return <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: 'var(--bg-base)', alignItems: 'center', justifyContent: 'center', color: 'var(--status-normal)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>INITIALIZING COMMAND CENTER...</div>;
  }

  if (!isAuthenticated) {
    if (showRegister) {
      return <Register onSwitchToLogin={() => setShowRegister(false)} />;
    }
    return <Login onSwitchToRegister={() => setShowRegister(true)} />;
  }

  const handleNavigate = (tab, tiger) => {
    if (tiger !== undefined) setSelectedTiger(tiger);
    setActiveTab(tab);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <IntelligenceOverview
            selectedTiger={selectedTiger}
            onSelectTiger={setSelectedTiger}
            onNavigate={handleNavigate}
          />
        );
      case 'spatial':
        return (
          <SpatialView
            selectedTiger={selectedTiger}
            onSelectTiger={setSelectedTiger}
            onNavigate={handleNavigate}
          />
        );
      case 'registry':
        return (
          <TigerRegistry
            selectedTiger={selectedTiger}
            onSelectTiger={setSelectedTiger}
            onNavigate={handleNavigate}
          />
        );
      case 'ingest':
        return <DataIngest />;
      case 'ai_assistant':
        return <IntelligenceAssistant />;
      default:
        return <IntelligenceOverview onNavigate={handleNavigate} />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: 'var(--bg-base)' }}>
      {/* Left Persistent Navigation Sidebar */}
      <LeftSidebar activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Main Workspace Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <TopCommandBar activeTab={activeTab} />
        
        <main style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
            {renderContent()}
          </div>

          {/* Contextual Intelligence Drawer when an entity is selected */}
          {selectedTiger && (
            <ContextualIntelligenceDrawer
              tiger={selectedTiger}
              onClose={() => setSelectedTiger(null)}
              onNavigate={handleNavigate}
            />
          )}
        </main>
      </div>
    </div>
  );
}

