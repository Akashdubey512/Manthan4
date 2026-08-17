import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Server, Loader2, Database, AlertCircle, ChevronDown, ChevronRight, CheckCircle2, ShieldAlert, Navigation } from 'lucide-react';
import { queryChat } from '../services/chat';

const SUGGESTED_QUERIES = [
  "How many tigers are currently identified?",
  "Show me the latest tiger alerts.",
  "Which camera stations are active?",
  "Which zone has the most tiger activity?",
  "Show the latest detections."
];

function SourceDataPanel({ sourceData, recordCount }) {
  const [expanded, setExpanded] = useState(false);

  if (!sourceData) return null;
  
  const hasData = Object.keys(sourceData).some(key => Array.isArray(sourceData[key]) && sourceData[key].length > 0);

  if (!hasData) {
    return (
      <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
          No supporting records returned.
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '0.75rem', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
      <button 
        onClick={() => setExpanded(!expanded)}
        style={{ 
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          padding: '0.5rem 0.75rem', background: 'var(--bg-elevated)', border: 'none', 
          borderBottom: expanded ? '1px solid var(--border-subtle)' : 'none',
          cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.7rem', 
          fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Database size={13} color="var(--status-info)" />
          <span>SOURCE DATA ({recordCount || 0} RECORDS)</span>
        </div>
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      {expanded && (
        <div style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
          {sourceData.tigers && sourceData.tigers.length > 0 && (
            <div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', padding: '0 0.25rem 0.25rem' }}>TIGERS</div>
              {sourceData.tigers.map((t, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', marginBottom: '0.25rem', fontSize: '0.75rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.id || t.name || 'Unknown'}</span>
                  <span style={{ 
                    color: t.status === 'critical' ? 'var(--status-critical)' : t.status === 'warning' ? 'var(--status-warning)' : 'var(--status-normal)',
                    fontFamily: 'var(--font-mono)', fontSize: '0.65rem', textTransform: 'uppercase'
                  }}>
                    [{t.status === 'critical' ? 'ANOMALY' : t.status === 'warning' ? 'WATCH' : 'NOMINAL'}]
                  </span>
                </div>
              ))}
            </div>
          )}

          {sourceData.alerts && sourceData.alerts.length > 0 && (
            <div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', padding: '0 0.25rem 0.25rem' }}>ALERTS</div>
              {sourceData.alerts.map((a, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0.5rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', marginBottom: '0.25rem', fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {a.type === 'critical' ? <ShieldAlert size={12} color="var(--status-critical)" /> : <AlertCircle size={12} color="var(--status-warning)" />}
                    <span style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{a.type || 'Alert'} — {a.tigerId || a.camera_id || 'System'}</span>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>
                    {a.time ? new Date(a.time).toLocaleTimeString() : ''}
                  </span>
                </div>
              ))}
            </div>
          )}

          {sourceData.stations && sourceData.stations.length > 0 && (
            <div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', padding: '0 0.25rem 0.25rem' }}>STATIONS</div>
              {sourceData.stations.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', marginBottom: '0.25rem', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-primary)' }}>{s.id || s.camera_id || 'Unknown'}</span>
                  <span style={{ 
                    color: s.status === 'online' ? 'var(--status-normal)' : 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)', fontSize: '0.65rem', textTransform: 'uppercase'
                  }}>
                    [{s.status || 'UNKNOWN'}]
                  </span>
                </div>
              ))}
            </div>
          )}
          
          {sourceData.zones && sourceData.zones.length > 0 && (
            <div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', padding: '0 0.25rem 0.25rem' }}>ZONES</div>
              {sourceData.zones.map((z, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.35rem 0.5rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', marginBottom: '0.25rem', fontSize: '0.75rem' }}>
                  <Navigation size={12} color="var(--status-normal)" />
                  <span style={{ color: 'var(--text-primary)' }}>{z.id || z.name || z}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QueryPlanPanel({ plan }) {
  const [expanded, setExpanded] = useState(false);

  if (!plan) return null;

  return (
    <div style={{ marginTop: '0.5rem', backgroundColor: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
      <button 
        onClick={() => setExpanded(!expanded)}
        style={{ 
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          padding: '0.4rem 0.75rem', background: 'transparent', border: 'none', 
          cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.65rem', 
          fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' 
        }}
      >
        <span>QUERY DETAILS</span>
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>

      {expanded && (
        <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-input)', borderTop: '1px solid var(--border-subtle)', fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(plan, null, 2)}
        </div>
      )}
    </div>
  );
}

function ChatMessage({ msg }) {
  const isUser = msg.role === 'user';
  
  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
        <div style={{ 
          maxWidth: '75%', 
          backgroundColor: 'var(--bg-elevated)', 
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md) var(--radius-md) 0 var(--radius-md)',
          padding: '0.85rem 1rem',
          color: 'var(--text-primary)',
          fontSize: '0.85rem',
          boxShadow: 'var(--shadow-panel)'
        }}>
          {msg.content}
        </div>
      </div>
    );
  }

  // Assistant Message (Intelligence Report format)
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '85%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <Terminal size={14} color="var(--status-normal)" />
          <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--status-normal)', letterSpacing: '0.05em' }}>INTELLIGENCE REPORT</span>
        </div>
        
        <div style={{ 
          backgroundColor: 'var(--bg-panel)', 
          border: '1px solid var(--border-subtle)',
          borderLeft: '3px solid var(--status-normal)',
          borderRadius: 'var(--radius-sm)',
          padding: '1rem',
          color: 'var(--text-primary)',
          fontSize: '0.85rem',
          lineHeight: '1.5',
          boxShadow: 'var(--shadow-panel)'
        }}>
          <div style={{ whiteSpace: 'pre-wrap' }}>
            {msg.content}
          </div>
          
          {msg.sourceData && (
            <SourceDataPanel sourceData={msg.sourceData} recordCount={msg.recordCount} />
          )}
          
          {msg.plan && (
            <QueryPlanPanel plan={msg.plan} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function IntelligenceAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (queryText = input) => {
    if (!queryText.trim() || isLoading) return;

    const userMessage = { role: 'user', content: queryText.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const result = await queryChat(userMessage.content);

    if (result.success) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.answer,
        plan: result.plan,
        sourceData: result.sourceData,
        recordCount: result.recordCount
      }]);
    } else {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${result.error || 'INTELLIGENCE SERVICE OFFLINE. Please verify connection and try again.'}`,
        isError: true
      }]);
    }

    setIsLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-base)' }}>
      {/* Workspace Header */}
      <div style={{ 
        padding: '1rem 1.5rem', 
        backgroundColor: 'var(--bg-panel)', 
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
            PENCH INTELLIGENCE ASSISTANT
          </h2>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            AI-POWERED WILDLIFE DATABASE QUERY
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--status-normal)' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--status-normal)' }}></span>
            SYSTEM ONLINE
          </span>
        </div>
      </div>

      {/* Chat History Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        {messages.length === 0 && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Server size={24} color="var(--status-normal)" />
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>INTELLIGENCE TERMINAL READY</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>Query the wildlife database using natural language.</p>
              </div>
            </div>
            
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Suggested Queries
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
              {SUGGESTED_QUERIES.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  disabled={isLoading}
                  style={{
                    textAlign: 'left',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'var(--bg-panel)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: 'var(--shadow-panel)'
                  }}
                  onMouseOver={(e) => { if(!isLoading) { e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'; e.currentTarget.style.borderColor = 'var(--border-active)'; } }}
                  onMouseOut={(e) => { if(!isLoading) { e.currentTarget.style.backgroundColor = 'var(--bg-panel)'; e.currentTarget.style.borderColor = 'var(--border-default)'; } }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {messages.map((msg, idx) => (
            <ChatMessage key={idx} msg={msg} />
          ))}
          
          {isLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--status-normal)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                <Loader2 size={14} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span>ANALYZING QUERY...</span>
              </div>
              <style>
                {`
                  @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                `}
              </style>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom Input Area */}
      <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-panel)', borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about tigers, alerts, cameras, zones..."
            disabled={isLoading}
            rows={1}
            style={{
              width: '100%',
              padding: '1rem 3.5rem 1rem 1rem',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              fontFamily: 'var(--font-sans)',
              resize: 'none',
              outline: 'none',
              lineHeight: '1.4',
              minHeight: '52px',
              maxHeight: '150px',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-panel)'
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            style={{
              position: 'absolute',
              right: '0.5rem',
              bottom: '0.5rem',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isLoading || !input.trim() ? 'var(--bg-elevated)' : 'var(--status-normal)',
              color: isLoading || !input.trim() ? 'var(--text-muted)' : '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Send size={16} />
          </button>
        </div>
        <div style={{ maxWidth: '800px', margin: '0.5rem auto 0', textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          PRESS ENTER TO SUBMIT · SHIFT+ENTER FOR NEWLINE
        </div>
      </div>
    </div>
  );
}
