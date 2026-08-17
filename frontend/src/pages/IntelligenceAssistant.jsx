import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Server, Loader2, Database, ChevronDown, ChevronRight, ShieldAlert, AlertCircle, Navigation } from 'lucide-react';
import { queryChat } from '../services/chat';

const SUGGESTED_QUERIES = [
  "How many tigers are currently identified?",
  "Show me the latest tiger alerts.",
  "Which camera stations are active?",
  "How many alerts were recorded?",
  "Which zone has the most tiger activity?",
  "Show the latest detections.",
];

function SourceDataPanel({ sourceData, recordCount }) {
  const [expanded, setExpanded] = useState(false);
  if (!sourceData) return null;
  const entries = Object.entries(sourceData).filter(([, v]) => Array.isArray(v) && v.length > 0);
  const hasCount = sourceData.count !== undefined;
  if (entries.length === 0 && !hasCount) {
    return <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>No supporting records returned.</div>;
  }
  return (
    <div style={{ marginTop: '0.75rem', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
      <button onClick={() => setExpanded(!expanded)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--bg-elevated)', border: 'none', borderBottom: expanded ? '1px solid var(--border-subtle)' : 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Database size={13} color="var(--status-normal)" /><span>SOURCE DATA · {recordCount ?? 0} RECORDS</span></div>
        {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      </button>
      {expanded && (
        <div style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto' }}>
          {hasCount && entries.length === 0 && <div style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>COUNT: {sourceData.count}</div>}
          {entries.map(([key, items]) => (
            <div key={key}>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', padding: '0 0.25rem 0.25rem' }}>{key}</div>
              {items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0.5rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', marginBottom: '0.2rem', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-primary)' }}>{item.id || item.name || item.camera_id || item.tag || JSON.stringify(item).slice(0, 40)}</span>
                  {item.status && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', textTransform: 'uppercase', color: item.status === 'critical' ? 'var(--status-critical)' : item.status === 'warning' ? 'var(--status-warning)' : 'var(--status-normal)' }}>[{item.status === 'critical' ? 'ANOMALY' : item.status === 'warning' ? 'WATCH' : item.status.toUpperCase()}]</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QueryPlanPanel({ plan }) {
  const [expanded, setExpanded] = useState(false);
  if (!plan) return null;
  return (
    <div style={{ marginTop: '0.5rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
      <button onClick={() => setExpanded(!expanded)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0.75rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.63rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        <span>QUERY DETAILS</span>{expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
      </button>
      {expanded && <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-input)', borderTop: '1px solid var(--border-subtle)', fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>{JSON.stringify(plan, null, 2)}</div>}
    </div>
  );
}

function ChatMessage({ msg }) {
  if (msg.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
        <div style={{ maxWidth: '75%', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md) var(--radius-md) 0 var(--radius-md)', padding: '0.75rem 1rem', color: 'var(--text-primary)', fontSize: '0.85rem', lineHeight: '1.5' }}>{msg.content}</div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1.75rem' }}>
      <div style={{ width: '100%', maxWidth: '88%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
          <Terminal size={13} color="var(--status-normal)" />
          <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--status-normal)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Intelligence Report</span>
        </div>
        <div style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderLeft: msg.isError ? '3px solid var(--status-critical)' : '3px solid var(--status-normal)', borderRadius: 'var(--radius-sm)', padding: '0.9rem 1rem', color: msg.isError ? 'var(--status-critical)' : 'var(--text-primary)', fontSize: '0.85rem', lineHeight: '1.6' }}>
          <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
          {msg.sourceData && <SourceDataPanel sourceData={msg.sourceData} recordCount={msg.recordCount} />}
          {msg.plan && <QueryPlanPanel plan={msg.plan} />}
        </div>
      </div>
    </div>
  );
}

export default function IntelligenceAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  const handleSend = async (queryText) => {
    const text = (typeof queryText === 'string' ? queryText : input).trim();
    if (!text || isLoading) return;
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setIsLoading(true);
    const result = await queryChat(text);
    if (result.success) {
      setMessages(prev => [...prev, { role: 'assistant', content: result.answer, plan: result.plan, sourceData: result.sourceData, recordCount: result.recordCount }]);
    } else {
      setMessages(prev => [...prev, { role: 'assistant', content: result.error || 'INTELLIGENCE SERVICE OFFLINE. Please verify connection and try again.', isError: true }]);
    }
    setIsLoading(false);
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)', overflow: 'hidden' }}>
      <div style={{ padding: '0.9rem 1.5rem', backgroundColor: 'var(--bg-panel)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Pench Intelligence Assistant</h2>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI-Powered Wildlife Database Query</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--status-normal)' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--status-normal)', display: 'inline-block' }} />SYSTEM ONLINE
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        {messages.length === 0 && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Server size={22} color="var(--status-normal)" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Intelligence Terminal Ready</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>Query the wildlife database using natural language.</div>
              </div>
            </div>
            <div style={{ fontSize: '0.63rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Suggested Queries</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.65rem' }}>
              {SUGGESTED_QUERIES.map((q, i) => (
                <button key={i} onClick={() => handleSend(q)} disabled={isLoading} style={{ textAlign: 'left', padding: '0.65rem 0.9rem', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.78rem', cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'border-color 0.15s ease' }}
                  onMouseOver={e => { if (!isLoading) e.currentTarget.style.borderColor = 'var(--border-active)'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {messages.map((msg, i) => <ChatMessage key={i} msg={msg} />)}
          {isLoading && (
            <div style={{ display: 'flex', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 1rem', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--status-normal)', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
                <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />ANALYZING QUERY · QUERYING WILDLIFE DATABASE...
              </div>
            </div>
          )}
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          <div ref={endRef} />
        </div>
      </div>

      <div style={{ padding: '1rem 1.5rem', backgroundColor: 'var(--bg-panel)', borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask about tigers, alerts, cameras, zones..." disabled={isLoading} rows={1}
            style={{ width: '100%', padding: '0.85rem 3.5rem 0.85rem 1rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.88rem', fontFamily: 'var(--font-sans)', resize: 'none', outline: 'none', lineHeight: '1.4', minHeight: '48px', maxHeight: '140px', overflowY: 'auto', boxSizing: 'border-box' }} />
          <button onClick={() => handleSend()} disabled={isLoading || !input.trim()}
            style={{ position: 'absolute', right: '0.5rem', bottom: '0.5rem', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: (isLoading || !input.trim()) ? 'var(--bg-elevated)' : 'var(--status-normal)', color: (isLoading || !input.trim()) ? 'var(--text-muted)' : '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: (isLoading || !input.trim()) ? 'not-allowed' : 'pointer', transition: 'background-color 0.15s ease' }}>
            <Send size={15} />
          </button>
        </div>
        <div style={{ maxWidth: '800px', margin: '0.4rem auto 0', textAlign: 'center', fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          ENTER TO SUBMIT · SHIFT+ENTER FOR NEWLINE
        </div>
      </div>
    </div>
  );
}
