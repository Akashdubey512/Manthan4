import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, HardDrive, CheckCircle2, AlertTriangle, Loader, ChevronRight, RefreshCw, Cpu, Database, Play } from 'lucide-react';
import { getIngestHistory } from '../services/api';

// ─── Workflow stages ─────────────────────────────────────────────────────────
const STAGES = [
  { id: 'validation',  label: 'File Validation & Checksum', desc: 'Verifying file integrity, format compliance, & EXIF payload' },
  { id: 'processing',  label: 'Frame Decomposition & Preprocess', desc: 'Normalizing resolution, extracting timestamps & sensor metadata' },
  { id: 'detection',   label: 'Blank Filtering & Yolo Detection', desc: 'Executing blank frame discard filter + fauna bounding box' },
  { id: 'intelligence',label: 'Stripe Re-ID Vector Matching', desc: 'Calculating stripe feature vectors & syncing with tiger database' },
];

function StageIndicator({ stage, currentStage, done }) {
  const idx       = STAGES.findIndex(s => s.id === stage.id);
  const curIdx    = STAGES.findIndex(s => s.id === currentStage);
  const isActive  = idx === curIdx;
  const isPast    = idx < curIdx || done;
  const color     = isPast ? 'var(--status-normal)' : isActive ? 'var(--status-warning)' : 'var(--border-default)';

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', opacity: isPast || isActive ? 1 : 0.45, marginBottom: '0.85rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%', border: `1.5px solid ${color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          background: isPast ? color : 'var(--bg-input)',
        }}>
          {isPast ? <CheckCircle2 size={14} color="var(--bg-base)" /> :
           isActive ? <Loader size={13} color={color} style={{ animation: 'spin 1s linear infinite' }} /> :
           <span style={{ fontSize: '0.65rem', color, fontFamily: 'var(--font-mono)' }}>{idx + 1}</span>}
        </div>
        {idx < STAGES.length - 1 && (
          <div style={{ width: 1.5, height: 32, background: isPast ? 'var(--status-normal)' : 'var(--border-subtle)', marginTop: 4 }} />
        )}
      </div>
      <div style={{ paddingTop: 2 }}>
        <div style={{ fontWeight: 600, fontSize: '0.78rem', color: isActive ? 'var(--text-primary)' : isPast ? 'var(--status-normal)' : 'var(--text-muted)' }}>
          {stage.label}
          {isActive && <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--status-warning)', animation: 'blink 1s step-end infinite' }}>▌</span>}
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.3 }}>{stage.desc}</div>
      </div>
    </div>
  );
}

function HistoryRow({ batch }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <td style={{ padding: '0.55rem 0.85rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{batch.id}</td>
      <td style={{ padding: '0.55rem 0.85rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--status-info)' }}>{batch.cameraId}</td>
      <td style={{ padding: '0.55rem 0.85rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{batch.date}</td>
      <td style={{ padding: '0.55rem 0.85rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center' }}>{batch.files}</td>
      <td style={{ padding: '0.55rem 0.85rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--status-normal)', textAlign: 'center' }}>{batch.detections}</td>
      <td style={{ padding: '0.55rem 0.85rem' }}>
        <span className={`badge badge-${batch.status === 'processed' ? 'normal' : 'warning'}`} style={{ fontSize: '0.58rem' }}>
          ● {batch.status.toUpperCase()}
        </span>
      </td>
    </tr>
  );
}

export default function DataIngest() {
  const [history, setHistory]           = useState([]);
  const [phase, setPhase]               = useState('ready'); // ready | running | done | error
  const [currentStage, setCurrentStage]   = useState(null);
  const [progress, setProgress]         = useState(0);
  const [fileInfo, setFileInfo]         = useState(null);
  const [results, setResults]           = useState(null);
  const fileInputRef                    = useRef();
  const timers                          = useRef([]);

  useEffect(() => {
    async function loadHistory() {
      const data = await getIngestHistory();
      setHistory(data);
    }
    loadHistory();
  }, []);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const startSimulation = useCallback((files) => {
    clearTimers();
    setPhase('running');
    setProgress(0);
    setResults(null);
    setFileInfo({ count: files, cameraId: 'CAM-TRAP-104', dateRange: '2023-11-17 – 2023-11-20' });

    // Simulate stage progression
    const schedule = [
      [300,  () => { setCurrentStage('validation');   setProgress(12); }],
      [1800, () => { setProgress(32); }],
      [2800, () => { setCurrentStage('processing');   setProgress(45); }],
      [4200, () => { setProgress(64); }],
      [5500, () => { setCurrentStage('detection');    setProgress(75); }],
      [7000, () => { setProgress(86); }],
      [8200, () => { setCurrentStage('intelligence'); setProgress(94); }],
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--bg-base)' }}>
      {/* Header */}
      <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Cpu size={14} color="var(--status-normal)" /> Field Data Ingestion & Re-ID Processing Workstation
        </span>
        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', padding: '1px 6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '2px' }}>
          ML PIPELINE STATUS: IDLE / READY
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 0, overflow: 'hidden' }}>

        {/* Left Panel: Upload Dropzone & Metadata */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.25rem', gap: '1.25rem', overflowY: 'auto', borderRight: '1px solid var(--border-subtle)' }}>

          {/* Upload Drop Zone */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => phase === 'ready' && fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${phase === 'ready' ? 'var(--border-default)' : phase === 'done' ? 'var(--status-normal)' : 'var(--status-warning)'}`,
              borderRadius: 'var(--radius-md)', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '0.85rem',
              cursor: phase === 'ready' ? 'pointer' : 'default',
              background: phase === 'done' ? 'rgba(78, 139, 113, 0.05)' : 'var(--bg-panel)',
              transition: 'all 0.2s ease', minHeight: 180,
              boxShadow: 'var(--shadow-panel)',
            }}
          >
            <input ref={fileInputRef} type="file" multiple accept="image/*" style={{ display: 'none' }}
              onChange={e => { if (e.target.files.length) startSimulation(e.target.files.length); }} />

            {phase === 'ready' && <>
              <div style={{ width: 50, height: 50, borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Upload size={22} color="var(--status-normal)" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>Mount SD Storage Card / Drop Camera Payload</div>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Supports RAW, JPEG, PNG, TIFF · Camera Trap & Drone Footage</div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startSimulation(248);
                }}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--status-normal)',
                  color: 'var(--status-normal)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.45rem 1rem',
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginTop: '0.3rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Play size={12} fill="var(--status-normal)" /> RUN DEMO INGESTION PIPELINE (248 FRAMES)
              </button>
            </>}

            {(phase === 'running') && <>
              <Loader size={26} color="var(--status-warning)" style={{ animation: 'spin 1s linear infinite' }} />
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Ingesting & Analyzing {fileInfo?.count} Payload Frames…</div>
              <div style={{ width: '85%', height: 6, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'var(--status-warning)', borderRadius: 'var(--radius-sm)', transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{progress}% COMPLETED</div>
            </>}

            {phase === 'done' && <>
              <CheckCircle2 size={32} color="var(--status-normal)" />
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--status-normal)' }}>Payload Ingestion & Vectoring Complete</div>
              <button onClick={e => { e.stopPropagation(); handleReset(); }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.85rem', cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                <RefreshCw size={12} /> Start New Ingestion Batch
              </button>
            </>}
          </div>

          {/* Batch Metadata Card */}
          {fileInfo && (
            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.9rem 1.1rem' }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.6rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.3rem' }}>Payload Batch Metadata</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                {[
                  { label: 'Camera Sensor ID', value: fileInfo.cameraId },
                  { label: 'Payload Frame Count', value: fileInfo.count },
                  { label: 'Capture Date Span', value: fileInfo.dateRange },
                  { label: 'System Batch Hash', value: `BATCH-${Date.now().toString().slice(-4)}` },
                ].map(r => (
                  <div key={r.label}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{r.label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-primary)', marginTop: 2 }}>{r.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results Summary Card */}
          {results && (
            <div style={{ background: 'rgba(78, 139, 113, 0.08)', border: '1px solid rgba(78, 139, 113, 0.3)', borderRadius: 'var(--radius-md)', padding: '0.9rem 1.1rem' }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--status-normal)', marginBottom: '0.6rem', borderBottom: '1px solid rgba(78, 139, 113, 0.2)', paddingBottom: '0.3rem' }}>Extracted Field Intelligence Summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                {[
                  { label: 'Total Frames Evaluated', value: results.files },
                  { label: 'Blanks Auto-Filtered', value: `${results.blanksFiltered} (${Math.round(results.blanksFiltered/results.files*100)}%)` },
                  { label: 'Wildlife Detections', value: results.detections },
                  { label: 'Tigers Re-Identified', value: results.tigers },
                ].map(r => (
                  <div key={r.label}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{r.label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--status-normal)', marginTop: 2 }}>{r.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Live Pipeline Status & History Table */}
        <div style={{ width: '340px', flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--bg-panel)' }}>
          {/* Pipeline Stage Tracker */}
          <div style={{ padding: '1rem 1.1rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', flex: '0 0 auto' }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.85rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.3rem' }}>Execution Pipeline Stages</div>
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

          {/* Ingestion History */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '0.55rem 1rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Historical Ingestion Log
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-elevated)' }}>
                  <tr>
                    {['Batch', 'Sensor', 'Date', 'Files', 'Det.', 'Status'].map(h => (
                      <th key={h} style={{ padding: '0.45rem 0.85rem', textAlign: 'left', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map(b => <HistoryRow key={b.id} batch={b} />)}
                  {results && (
                    <tr style={{ background: 'rgba(78, 139, 113, 0.08)' }}>
                      <td colSpan={6} style={{ padding: '0.55rem 0.85rem', fontSize: '0.68rem', color: 'var(--status-normal)', fontFamily: 'var(--font-mono)' }}>
                        + Batch process complete — {results.files} frames ingested
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


