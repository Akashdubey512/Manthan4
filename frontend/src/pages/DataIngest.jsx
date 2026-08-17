import React, { useState, useCallback, useRef } from 'react';
import { Upload, HardDrive, CheckCircle2, AlertTriangle, Loader, ChevronRight, RefreshCw } from 'lucide-react';
import { MOCK_INGEST_HISTORY } from '../services/mockData';

// ─── Workflow stages ─────────────────────────────────────────────────────────
const STAGES = [
  { id: 'validation',  label: 'Validation',   desc: 'Verifying file integrity and metadata' },
  { id: 'processing',  label: 'Processing',   desc: 'Extracting EXIF, timestamps, camera ID' },
  { id: 'detection',   label: 'Detection',    desc: 'Running blank filter + subject detection' },
  { id: 'intelligence',label: 'Intelligence', desc: 'Matching stripe patterns, updating registry' },
];

function StageIndicator({ stage, currentStage, done }) {
  const idx       = STAGES.findIndex(s => s.id === stage.id);
  const curIdx    = STAGES.findIndex(s => s.id === currentStage);
  const isActive  = idx === curIdx;
  const isPast    = idx < curIdx || done;
  const color     = isPast ? 'var(--status-normal)' : isActive ? 'var(--status-warning)' : 'var(--border-active)';

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', opacity: isPast || isActive ? 1 : 0.4 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', border: `2px solid ${color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          background: isPast ? color : 'transparent',
        }}>
          {isPast ? <CheckCircle2 size={14} color="var(--bg-base)" /> :
           isActive ? <Loader size={14} color={color} style={{ animation: 'spin 1s linear infinite' }} /> :
           <span style={{ fontSize: '0.65rem', color, fontFamily: 'var(--font-mono)' }}>{idx + 1}</span>}
        </div>
        {idx < STAGES.length - 1 && (
          <div style={{ width: 2, height: 40, background: isPast ? 'var(--status-normal)' : 'var(--border-subtle)', marginTop: 4 }} />
        )}
      </div>
      <div style={{ paddingTop: 4 }}>
        <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: isActive ? 'var(--text-primary)' : isPast ? 'var(--status-normal)' : 'var(--text-muted)' }}>
          {stage.label}
          {isActive && <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--status-warning)', animation: 'blink 1s step-end infinite' }}>▌</span>}
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{stage.desc}</div>
      </div>
    </div>
  );
}

function HistoryRow({ batch }) {
  return (
    <tr>
      <td style={{ padding: '0.6rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{batch.id}</td>
      <td style={{ padding: '0.6rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--status-info)' }}>{batch.cameraId}</td>
      <td style={{ padding: '0.6rem 1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{batch.date}</td>
      <td style={{ padding: '0.6rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>{batch.files}</td>
      <td style={{ padding: '0.6rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--status-normal)', textAlign: 'center' }}>{batch.detections}</td>
      <td style={{ padding: '0.6rem 1rem' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--status-normal)', textTransform: 'uppercase' }}>● {batch.status}</span>
      </td>
    </tr>
  );
}

export default function DataIngest() {
  const [phase, setPhase]             = useState('ready'); // ready | running | done | error
  const [currentStage, setCurrentStage] = useState(null);
  const [progress, setProgress]       = useState(0);
  const [fileInfo, setFileInfo]       = useState(null);
  const [results, setResults]         = useState(null);
  const fileInputRef                  = useRef();
  const timers                        = useRef([]);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const startSimulation = useCallback((files) => {
    clearTimers();
    setPhase('running');
    setProgress(0);
    setResults(null);
    setFileInfo({ count: files, cameraId: 'CAM-104', dateRange: '2023-11-17 – 2023-11-20' });

    // Simulate stage progression
    const schedule = [
      [300,  () => { setCurrentStage('validation');   setProgress(10); }],
      [1800, () => { setProgress(30); }],
      [2800, () => { setCurrentStage('processing');   setProgress(40); }],
      [4200, () => { setProgress(60); }],
      [5500, () => { setCurrentStage('detection');    setProgress(70); }],
      [7000, () => { setProgress(82); }],
      [8200, () => { setCurrentStage('intelligence'); setProgress(90); }],
      [9800, () => {
        setProgress(100);
        setPhase('done');
        setCurrentStage(null);
        setResults({ files, detections: Math.round(files * 0.04), blanksFiltered: Math.round(files * 0.55), tigers: 2 });
      }],
    ];
    schedule.forEach(([delay, fn]) => {
      timers.current.push(setTimeout(fn, delay));
    });
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const count = e.dataTransfer.files.length || 1;
    startSimulation(count);
  }, [startSimulation]);

  const handleReset = () => {
    clearTimers();
    setPhase('ready');
    setCurrentStage(null);
    setProgress(0);
    setFileInfo(null);
    setResults(null);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <HardDrive size={14} color="var(--text-muted)" /> Camera Trap Data Ingestion
        </span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>SIMULATED PIPELINE — Demo Only</span>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 0, overflow: 'hidden' }}>

        {/* Left: Ingest panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.25rem', gap: '1.25rem', overflowY: 'auto', borderRight: '1px solid var(--border-subtle)' }}>

          {/* Drop zone */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => phase === 'ready' && fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${phase === 'ready' ? 'var(--border-active)' : phase === 'done' ? 'var(--status-normal)' : 'var(--border-default)'}`,
              borderRadius: 'var(--radius-md)', padding: '2rem 1rem', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
              cursor: phase === 'ready' ? 'pointer' : 'default',
              background: phase === 'done' ? 'rgba(92,138,115,0.06)' : 'var(--bg-elevated)',
              transition: 'border-color 0.2s, background 0.2s', minHeight: 160,
            }}
          >
            <input ref={fileInputRef} type="file" multiple accept="image/*" style={{ display: 'none' }}
              onChange={e => { if (e.target.files.length) startSimulation(e.target.files.length); }} />

            {phase === 'ready' && <>
              <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Upload size={22} color="var(--text-muted)" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Insert SD Card / Drop Images</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Accepts JPEG, PNG, TIFF · Camera trap data only</div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startSimulation(248);
                }}
                style={{
                  background: 'var(--status-normal-bg)',
                  border: '1px solid var(--status-normal)',
                  color: 'var(--status-normal)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: '0.25rem',
                }}
              >
                ▶ RUN DEMO INGESTION PIPELINE
              </button>
              <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--border-active)', letterSpacing: '0.05em' }}>SIMULATION — No real data uploaded</div>
            </>}

            {(phase === 'running') && <>
              <Loader size={24} color="var(--status-warning)" style={{ animation: 'spin 1s linear infinite' }} />
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>Processing {fileInfo?.count} files…</div>
              <div style={{ width: '80%', height: 6, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'var(--status-warning)', borderRadius: 'var(--radius-sm)', transition: 'width 0.6s ease' }} />
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{progress}% complete</div>
            </>}

            {phase === 'done' && <>
              <CheckCircle2 size={28} color="var(--status-normal)" />
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--status-normal)' }}>Ingestion Complete</div>
              <button onClick={e => { e.stopPropagation(); handleReset(); }} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'none', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.75rem', cursor: 'pointer', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                <RefreshCw size={11} /> New Ingest
              </button>
            </>}
          </div>

          {/* File metadata */}
          {fileInfo && (
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.875rem 1rem' }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Batch Metadata</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {[
                  { label: 'Camera ID', value: fileInfo.cameraId },
                  { label: 'Files', value: fileInfo.count },
                  { label: 'Date Range', value: fileInfo.dateRange },
                  { label: 'Batch ID', value: `ING-${Date.now().toString().slice(-3)}` },
                ].map(r => (
                  <div key={r.label}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{r.label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: 2 }}>{r.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {results && (
            <div style={{ background: 'rgba(92,138,115,0.08)', border: '1px solid rgba(92,138,115,0.3)', borderRadius: 'var(--radius-md)', padding: '0.875rem 1rem' }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--status-normal)', marginBottom: '0.5rem' }}>Intelligence Extracted</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {[
                  { label: 'Files Processed', value: results.files },
                  { label: 'Blanks Filtered', value: `${results.blanksFiltered} (${Math.round(results.blanksFiltered/results.files*100)}%)` },
                  { label: 'Subject Detections', value: results.detections },
                  { label: 'Tigers Identified', value: results.tigers },
                ].map(r => (
                  <div key={r.label}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{r.label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, color: 'var(--status-normal)', marginTop: 2 }}>{r.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Pipeline stages + History */}
        <div style={{ width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Pipeline */}
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', flex: '0 0 auto' }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>Processing Pipeline</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {STAGES.map(stage => (
                <StageIndicator key={stage.id} stage={stage} currentStage={currentStage} done={phase === 'done'} />
              ))}
            </div>
            <style>{`
              @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
              @keyframes blink { 50% { opacity: 0; } }
            `}</style>
          </div>

          {/* Ingest history */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Recent Batches
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-elevated)' }}>
                  <tr>
                    {['Batch', 'Camera', 'Date', 'Files', 'Det.', 'Status'].map(h => (
                      <th key={h} style={{ padding: '0.4rem 1rem', textAlign: 'left', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_INGEST_HISTORY.map(b => <HistoryRow key={b.id} batch={b} />)}
                  {results && (
                    <tr style={{ background: 'rgba(92,138,115,0.07)' }}>
                      <td colSpan={6} style={{ padding: '0.6rem 1rem', fontSize: '0.7rem', color: 'var(--status-normal)', fontFamily: 'var(--font-mono)' }}>
                        + New batch complete — {results.files} files, {results.detections} detections
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
