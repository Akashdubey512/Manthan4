import React, { useState, useEffect } from 'react';
import { Wifi } from 'lucide-react';
import IntelligenceOverview from './pages/IntelligenceOverview';
import SpatialView from './pages/SpatialView';
import TigerRegistry from './pages/TigerRegistry';
import DataIngest from './pages/DataIngest';

const NAV_TABS = [
  { id: 'overview',  label: 'OVERVIEW'  },
  { id: 'spatial',   label: 'SPATIAL'   },
  { id: 'registry',  label: 'REGISTRY'  },
  { id: 'ingest',    label: 'INGEST'    },
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

function TopCommandBar({ activeTab, onTabChange }) {
  const clock = useLiveClock();
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 1.5rem', height: '48px',
      backgroundColor: 'var(--bg-panel)', borderBottom: '1px solid var(--border-subtle)',
      flexShrink: 0, zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ fontWeight: 800, fontSize: '0.9375rem', letterSpacing: '0.08em', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginRight: '1rem' }}>
          MANTHAN<span style={{ color: 'var(--status-warning)' }}>4</span>
        </div>
        <div style={{ width: '1px', height: '20px', background: 'var(--border-default)', marginRight: '1rem' }} />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginRight: '1.5rem', display: 'none' }} className="brand-subtitle">
          Pench Tiger Reserve Ops
        </span>
        <nav className="nav-tab-wrapper">
          {NAV_TABS.map(tab => (
            <button key={tab.id} className={`nav-tab${activeTab === tab.id ? ' active' : ''}`} onClick={() => onTabChange(tab.id)}>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>SYS {clock}</span>
        <div style={{ width: '1px', height: '14px', background: 'var(--border-default)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Wifi size={13} color="var(--status-normal)" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--status-normal)', fontWeight: 600, letterSpacing: '0.05em' }}>DATA LINK SECURE</span>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const [activeTab, setActiveTab]         = useState('overview');
  // Lifted global state for cross-page continuity
  const [selectedTiger, setSelectedTiger] = useState(null);

  // Navigate + optionally carry a tiger selection
  const handleNavigate = (tab, tiger) => {
    if (tiger !== undefined) setSelectedTiger(tiger);
    setActiveTab(tab);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Clear tiger selection when user manually navigates away (except spatial/registry pair)
    if (tab === 'overview' || tab === 'ingest') setSelectedTiger(null);
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
      default:
        return <IntelligenceOverview onNavigate={handleNavigate} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <TopCommandBar activeTab={activeTab} onTabChange={handleTabChange} />
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {renderContent()}
      </main>
    </div>
  );
}
