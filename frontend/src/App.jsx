import React from 'react';

function App() {
  return (
    <div style={{
      fontFamily: 'system-ui, sans-serif',
      backgroundColor: '#0a0d14',
      color: '#e2e8f0',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Premium Header */}
      <header style={{
        background: 'linear-gradient(90deg, #161b26 0%, #0d121f 100%)',
        borderBottom: '1px solid #1f293d',
        padding: '1.25rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            background: 'radial-gradient(circle, #f97316 0%, #c2410c 100%)',
            width: '2rem',
            height: '2rem',
            borderRadius: '0.375rem',
            boxShadow: '0 0 12px rgba(249, 115, 22, 0.4)'
          }} />
          <h1 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, tracking: '0.05em' }}>
            Pench Tiger Reserve Triage & movement Intelligence
          </h1>
        </div>
        <span style={{
          fontSize: '0.875rem',
          backgroundColor: '#1e293b',
          padding: '0.25rem 0.75rem',
          borderRadius: '9999px',
          color: '#38bdf8',
          fontWeight: '500'
        }}>
          Offline System Online
        </span>
      </header>

      {/* Main content grid */}
      <main style={{ padding: '2rem', flex: 1, display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Left pane - system stats */}
        <section style={{
          background: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          <h2 style={{ fontSize: '1.125rem', color: '#f3f4f6', margin: 0 }}>System Console</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ background: '#1f2937', padding: '1rem', borderRadius: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>SD Cards Ingested</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>0</div>
            </div>
            <div style={{ background: '#1f2937', padding: '1rem', borderRadius: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Blanks Filtered</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>0%</div>
            </div>
            <div style={{ background: '#1f2937', padding: '1rem', borderRadius: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Active Deviation Alerts</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>0</div>
            </div>
          </div>
        </section>

        {/* Right pane - activity logs / map placeholders */}
        <section style={{
          background: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280'
        }}>
          No data ingested. Insert an SD Card or specify an ingest directory to begin.
        </section>
      </main>
    </div>
  );
}

export default App;
