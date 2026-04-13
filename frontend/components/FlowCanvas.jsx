"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import '@xyflow/react/dist/style.css';

let ReactFlowModule = null;

// Dynamic import wrapper to prevent SSR/build crashes if @xyflow/react has issues
function useReactFlow() {
  const [loaded, setLoaded] = useState(false);
  const [mod, setMod] = useState(null);

  useEffect(() => {
    if (ReactFlowModule) {
      setMod(ReactFlowModule);
      setLoaded(true);
      return;
    }
    import('@xyflow/react').then((m) => {
      ReactFlowModule = m;
      setMod(m);
      setLoaded(true);
    }).catch((err) => {
      console.error('[FlowCanvas] Failed to load @xyflow/react:', err);
      setLoaded(true); 
    });
  }, []);

  return { loaded, mod };
}

// ---------------------------------------------------------
// Universal Custom Node: LacunexNode (Premium v4)
// ---------------------------------------------------------
function LacunexNode({ data, selected }) {
  const Handle = ReactFlowModule?.Handle;
  const Position = ReactFlowModule?.Position;

  if (!Handle || !Position) return <div className="flow-node">...</div>;

  return (
    <div className={`glass-panel flow-node-v4 ${data.category} ${selected ? 'selected' : ''}`} style={{
      borderRadius: 'var(--radius-lg)',
      padding: '1px', // Border wrapper for gradient effect if needed
      width: '280px',
      fontFamily: 'var(--font-inter), sans-serif',
      boxShadow: selected ? 'var(--shadow-glow), 0 0 20px var(--accent-secondary-soft)' : 'var(--shadow-md)',
      color: 'var(--text-primary)',
      transition: 'all 0.3s var(--ease-out-expo)',
      position: 'relative',
      overflow: 'hidden',
      border: selected ? '1px solid var(--accent-secondary)' : '1px solid var(--glass-border)'
    }}>
      <Handle type="target" position={Position.Left} style={{ 
        background: 'var(--accent-secondary)', 
        width: '10px', 
        height: '10px',
        border: '2px solid var(--bg-surface)',
        left: '-5px'
      }} />
      
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '10px', 
        background: 'rgba(255,255,255,0.03)',
        padding: '10px 12px',
        borderBottom: '1px solid var(--glass-border)'
      }}>
        <div style={{ fontSize: '1.25rem', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.2))' }}>{data.icon}</div>
        <div style={{ 
          fontWeight: '700', 
          fontSize: '0.85rem', 
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          color: data.category === 'input' ? 'var(--success)' : data.category === 'action' ? 'var(--accent-secondary)' : 'var(--accent-primary)' 
        }}>
          {data.label}
        </div>
      </div>
      
      <div className="node-content" style={{ padding: '12px' }}>
        {data.type === 'text_input' && (
          <textarea
            value={data.text || ''}
            onChange={e => data.onChange && data.onChange(data.id, e.target.value)}
            placeholder="Type your prompt here..."
            rows={3}
            className="glass-panel"
            style={{ 
              width: '100%', 
              background: 'rgba(0,0,0,0.2)', 
              border: '1px solid var(--glass-border)', 
              color: 'var(--text-primary)', 
              padding: '10px', 
              borderRadius: 'var(--radius-md)', 
              fontSize: '0.8rem', 
              resize: 'none',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent-secondary)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
          />
        )}
        
        {data.type === 'translate' && (
          <div style={{ position: 'relative' }}>
             <select
                value={data.language || 'Hindi'}
                onChange={e => data.onLanguageChange && data.onLanguageChange(data.id, e.target.value)}
                className="glass-panel"
                style={{ 
                  width: '100%', 
                  background: 'rgba(0,0,0,0.2)', 
                  border: '1px solid var(--glass-border)', 
                  color: 'var(--text-primary)', 
                  padding: '8px 10px', 
                  borderRadius: 'var(--radius-md)', 
                  fontSize: '0.8rem',
                  appearance: 'none',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option>Hindi</option>
                <option>Bengali</option>
                <option>Tamil</option>
                <option>Telugu</option>
                <option>French</option>
                <option>Spanish</option>
              </select>
              <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }}>▼</div>
          </div>
        )}
        
        {data.status && (
          <div style={{ 
            marginTop: '12px', 
            fontSize: '0.7rem', 
            fontWeight: '800', 
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: data.status === 'running' ? 'var(--warning)' : data.status === 'done' ? 'var(--success)' : 'var(--danger)' 
          }}>
            <span style={{ 
              width: '6px', 
              height: '6px', 
              borderRadius: '50%', 
              background: 'currentColor',
              boxShadow: '0 0 8px currentColor',
              animation: data.status === 'running' ? 'pulse 1s infinite' : 'none'
            }} />
            {data.status === 'running' && 'Processing...'}
            {data.status === 'done' && 'Complete'}
            {data.status === 'error' && 'Execution Failed'}
          </div>
        )}
        
        {data.output && (
          <div className="glass-panel" style={{ 
            marginTop: '12px', 
            background: data.output.startsWith('[ERROR]') ? 'rgba(239, 68, 68, 0.05)' : 'rgba(0,0,0,0.15)', 
            padding: '10px', 
            borderRadius: 'var(--radius-md)', 
            fontSize: '0.75rem', 
            maxHeight: '120px', 
            overflowY: 'auto', 
            border: data.output.startsWith('[ERROR]') ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--glass-border)',
            color: data.output.startsWith('[ERROR]') ? 'var(--danger)' : 'var(--text-secondary)',
            lineHeight: '1.4'
          }}>
            <div style={{ 
              color: data.output.startsWith('[ERROR]') ? 'var(--danger)' : 'var(--accent-secondary)', 
              marginBottom: '6px', 
              fontWeight: '700',
              fontSize: '0.65rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {data.output.startsWith('[ERROR]') ? 'System Diagnostic:' : 'Live Output:'}
            </div>
            {data.output.startsWith('[ERROR]') ? data.output.replace('[ERROR] ', '') : data.output}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} style={{ 
        background: 'var(--accent-secondary)', 
        width: '10px', 
        height: '10px',
        border: '2px solid var(--bg-surface)',
        right: '-5px'
      }} />
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse {
          0% { opacity: 0.5; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 0.5; transform: scale(0.9); }
        }
        .flow-node-v4:hover {
           border-color: var(--accent-secondary) !important;
           transform: translateY(-2px);
           box-shadow: var(--shadow-lg), 0 10px 30px rgba(0,0,0,0.2) !important;
        }
      `}} />
    </div>
  );
}

// ---------------------------------------------------------
// TEMPLATES
// ---------------------------------------------------------
const TEMPLATES = [
  {
    id: "t1",
    name: "📚 Student Notes Package",
    description: "Type a topic → get notes + quiz + PDF",
    nodes: [
      { id: 'n1', type: 'lacunexNode', position: { x: 50, y: 150 }, data: { id: 'n1', type: 'text_input', category: 'input', icon: '📝', label: 'Topic Input', text: 'Quantum Physics' } },
      { id: 'n2', type: 'lacunexNode', position: { x: 400, y: 50 }, data: { id: 'n2', type: 'generate_notes', category: 'action', icon: '🧠', label: 'Generate Notes' } },
      { id: 'n3', type: 'lacunexNode', position: { x: 400, y: 250 }, data: { id: 'n3', type: 'quiz_generator', category: 'action', icon: '❓', label: 'Quiz Generator' } },
      { id: 'n4', type: 'lacunexNode', position: { x: 750, y: 150 }, data: { id: 'n4', type: 'download_pdf', category: 'output', icon: '📥', label: 'Download PDF' } }
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true, style: { stroke: '#00e5ff', strokeWidth: 2 } },
      { id: 'e1-3', source: 'n1', target: 'n3', animated: true, style: { stroke: '#00e5ff', strokeWidth: 2 } },
      { id: 'e2-4', source: 'n2', target: 'n4', animated: true, style: { stroke: '#00e5ff', strokeWidth: 2 } },
    ]
  },
  {
    id: "t2",
    name: "🔍 Research & Summarize",
    description: "Type a question → get live researched summary",
    nodes: [
      { id: 'n1', type: 'lacunexNode', position: { x: 50, y: 150 }, data: { id: 'n1', type: 'text_input', category: 'input', icon: '📝', label: 'Research Question', text: 'What is the latest advancement in AI?' } },
      { id: 'n2', type: 'lacunexNode', position: { x: 400, y: 150 }, data: { id: 'n2', type: 'web_search', category: 'action', icon: '🔍', label: 'Web Search' } },
      { id: 'n3', type: 'lacunexNode', position: { x: 750, y: 150 }, data: { id: 'n3', type: 'summarize', category: 'action', icon: '📋', label: 'Summarize' } },
      { id: 'n4', type: 'lacunexNode', position: { x: 1100, y: 150 }, data: { id: 'n4', type: 'show_in_chat', category: 'output', icon: '💬', label: 'Show in Chat' } }
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true, style: { stroke: '#00e5ff', strokeWidth: 2 } },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true, style: { stroke: '#00e5ff', strokeWidth: 2 } },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true, style: { stroke: '#00e5ff', strokeWidth: 2 } },
    ]
  },
  {
    id: "t3",
    name: "💻 Code & Explain",
    description: "Describe what you want → get code + explanation",
    nodes: [
      { id: 'n1', type: 'lacunexNode', position: { x: 50, y: 150 }, data: { id: 'n1', type: 'text_input', category: 'input', icon: '📝', label: 'Code Request', text: 'Write a python script to parse CSV' } },
      { id: 'n2', type: 'lacunexNode', position: { x: 400, y: 50 }, data: { id: 'n2', type: 'write_code', category: 'action', icon: '💻', label: 'Write Code' } },
      { id: 'n3', type: 'lacunexNode', position: { x: 400, y: 250 }, data: { id: 'n3', type: 'summarize', category: 'action', icon: '📋', label: 'Explain Code' } },
      { id: 'n4', type: 'lacunexNode', position: { x: 750, y: 150 }, data: { id: 'n4', type: 'show_in_chat', category: 'output', icon: '💬', label: 'Show in Chat' } }
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true, style: { stroke: '#00e5ff', strokeWidth: 2 } },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true, style: { stroke: '#00e5ff', strokeWidth: 2 } },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true, style: { stroke: '#00e5ff', strokeWidth: 2 } },
    ]
  },
  {
    id: "t4",
    name: "🌐 Translate Content",
    description: "Topic → notes → translated to your language",
    nodes: [
      { id: 'n1', type: 'lacunexNode', position: { x: 50, y: 150 }, data: { id: 'n1', type: 'text_input', category: 'input', icon: '📝', label: 'Source Text', text: 'Artificial Intelligence' } },
      { id: 'n2', type: 'lacunexNode', position: { x: 400, y: 150 }, data: { id: 'n2', type: 'generate_notes', category: 'action', icon: '🧠', label: 'Generate Notes' } },
      { id: 'n3', type: 'lacunexNode', position: { x: 750, y: 150 }, data: { id: 'n3', type: 'translate', category: 'action', icon: '🌐', label: 'Translate', language: 'Hindi' } },
      { id: 'n4', type: 'lacunexNode', position: { x: 1100, y: 150 }, data: { id: 'n4', type: 'show_in_chat', category: 'output', icon: '💬', label: 'Show in Chat' } }
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true, style: { stroke: '#00e5ff', strokeWidth: 2 } },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true, style: { stroke: '#00e5ff', strokeWidth: 2 } },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true, style: { stroke: '#00e5ff', strokeWidth: 2 } },
    ]
  }
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ---------------------------------------------------------
// FlowCanvas Main Component
// ---------------------------------------------------------
export default function FlowCanvas() {
  const { loaded, mod } = useReactFlow();
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [globalError, setGlobalError] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  // Auto-show help for first-time users (if no nodes)
  useEffect(() => {
    if (loaded && nodes.length === 0) {
      const timer = setTimeout(() => setShowHelp(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [loaded, nodes.length === 0]); 

  const handleTextChange = useCallback((id, newText) => {
    setNodes((nds) =>
      nds.map((n) => n.id === id ? { ...n, data: { ...n.data, text: newText } } : n)
    );
  }, []);

  const handleLangChange = useCallback((id, newLang) => {
    setNodes((nds) =>
      nds.map((n) => n.id === id ? { ...n, data: { ...n.data, language: newLang } } : n)
    );
  }, []);

  const loadTemplate = (templateId) => {
    const tmpl = TEMPLATES.find(t => t.id === templateId);
    if (!tmpl) return;
    
    // Wire up the handlers
    const wiredNodes = tmpl.nodes.map(n => ({
      ...n,
      data: {
        ...n.data,
        onChange: handleTextChange,
        onLanguageChange: handleLangChange
      }
    }));
    
    setNodes(wiredNodes);
    setEdges(tmpl.edges);
    setGlobalError("");
  };

  // Start with empty state
  useEffect(() => {
    // Empty state active by default
  }, []);

  const nodeTypes = useMemo(() => ({ lacunexNode: LacunexNode }), []);

  const onNodesChange = useCallback((changes) => {
    if (!mod) return;
    setNodes((nds) => mod.applyNodeChanges(changes, nds));
  }, [mod]);

  const onEdgesChange = useCallback((changes) => {
    if (!mod) return;
    setEdges((eds) => mod.applyEdgeChanges(changes, eds));
  }, [mod]);

  const onConnect = useCallback((params) => {
    if (!mod) return;
    setEdges((eds) => mod.addEdge({ ...params, animated: true, style: { stroke: '#00e5ff', strokeWidth: 2 } }, eds));
  }, [mod]);

  const executeFlow = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setGlobalError("");
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: null, output: null } })));

    // Hard timeout: abort after 120 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      // Find initial input
      const startNodes = nodes.filter(n => n.data.type === 'text_input');
      let initial_input = "Start";
      if (startNodes.length > 0) initial_input = startNodes[0].data.text || "";

      if (!initial_input.trim()) {
        setGlobalError("Please enter text in the Topic Input node before running.");
        return;
      }

      setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: 'running' } })));

      const res = await fetch(`${API_BASE}/api/flow/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, edges, initial_input }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text().catch(() => "Unknown server error");
        throw new Error(`Server error (${res.status}): ${errText.substring(0, 200)}`);
      }

      const data = await res.json();
      const resultsMap = data.results || {};
      const nodeStatuses = data.node_statuses || {};
      const nodeErrors = data.node_errors || {};
      const pipelineError = data.pipeline_error || false;

      // Update each node with its individual status from the backend
      setNodes(nds => nds.map(n => {
        const status = nodeStatuses[n.id] || (resultsMap[n.id] ? 'done' : null);
        const output = resultsMap[n.id]
          ? (typeof resultsMap[n.id] === 'string'
            ? (resultsMap[n.id].startsWith('[ERROR]')
              ? resultsMap[n.id]
              : resultsMap[n.id].substring(0, 150) + "...")
            : "Success")
          : '';
        return { ...n, data: { ...n.data, status, output } };
      }));

      // Show pipeline-level error if any node failed
      if (pipelineError) {
        const failedNodes = Object.entries(nodeErrors);
        const errorSummary = failedNodes.map(([id, msg]) => msg).join('; ');
        setGlobalError(`Pipeline partially failed: ${errorSummary}`);
      }

      // Only dispatch "Show in Chat" if we have REAL content (not an error message)
      if (resultsMap.final_output && !resultsMap.final_output.startsWith('[ERROR]') && !pipelineError) {
        window.dispatchEvent(new CustomEvent('lacunex_flow_output', {
          detail: { text: resultsMap.final_output, initial_input }
        }));
      }

      if (resultsMap.should_download && resultsMap.pdf_content && !resultsMap.pdf_content.startsWith('[ERROR]')) {
        try {
          const exportRes = await fetch(`${API_BASE}/api/export`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: [{ role: "assistant", content: resultsMap.pdf_content }], format: "pdf" })
          });
          
          if (!exportRes.ok) throw new Error("Failed to export PDF");
          
          const blob = await exportRes.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `lacunex_flow_${Date.now()}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        } catch (exportErr) {
          console.error("PDF Export failed, falling back to markdown:", exportErr);
          const blob = new Blob([resultsMap.pdf_content], { type: 'text/markdown' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `lacunex_flow_${Date.now()}.md`;
          a.click();
        }
      }

    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        setGlobalError("Pipeline timed out after 2 minutes. AI providers may be at capacity — please try again shortly.");
      } else {
        setGlobalError(e.message);
      }
      setNodes(nds => nds.map(n => n.data.status === 'running' ? { ...n, data: { ...n.data, status: 'error' } } : n));
    } finally {
      setIsRunning(false);
    }
  };

  // --- Loading / Error States ---
  if (!loaded) {
    return (
      <div className="flow-canvas-wrapper" style={{ width: '100%', height: '100%', minHeight: '600px', background: '#0a0a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#00e5ff' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🌟</div>
          <div style={{ fontSize: '1rem', opacity: 0.8 }}>Loading LACUNEX Flow Engine...</div>
        </div>
      </div>
    );
  }

  if (!mod) {
    return (
      <div className="flow-canvas-wrapper" style={{ width: '100%', height: '100%', minHeight: '600px', background: '#0a0a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#ef4444', maxWidth: '400px', padding: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
          <div style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Flow Engine could not load</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>The @xyflow/react dependency may not be installed.</div>
        </div>
      </div>
    );
  }

  const { ReactFlow: RF, Background, MiniMap, Controls, Panel } = mod;

  return (
      <div className="flow-canvas-wrapper" style={{ width: '100%', height: '100%', minHeight: '700px', background: '#0a0a2e', position: 'relative' }}>
      <RF
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{
           animated: true,
           className: 'lacunex-edge-animated'
        }}
        fitView
      >
        <Background gap={24} size={1} color="rgba(168, 85, 247, 0.1)" />
        <MiniMap 
          nodeColor={(n) => {
            if (n.data.category === 'input') return '#4ade80';
            if (n.data.category === 'action') return '#00d4ff';
            return '#a855f7';
          }} 
          maskColor="rgba(5, 10, 20, 0.7)" 
          className="glass-panel"
          style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)' }} 
        />
        <Controls className="glass-panel" style={{ fill: 'var(--accent-secondary)' }} />
        
        <Panel position="top-left" style={{ display: 'flex', gap: '12px', marginTop: '12px', marginLeft: '12px' }}>
          <select 
            onChange={(e) => loadTemplate(e.target.value)}
            className="glass-panel"
            style={{ 
              color: 'var(--text-primary)', 
              padding: '10px 16px', 
              borderRadius: 'var(--radius-lg)', 
              cursor: 'pointer', 
              outline: 'none',
              fontSize: '0.85rem',
              fontWeight: '600',
              border: '1px solid var(--accent-secondary)'
            }}
          >
            <option value="">✨ Load Workflow Template...</option>
            {TEMPLATES.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <button
            onClick={() => setShowHelp(true)}
            className="glass-panel"
            style={{
              padding: '10px 16px',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--accent-secondary)',
              fontWeight: 'bold',
              cursor: 'pointer',
              border: '1px solid var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>❓</span> Help
          </button>
        </Panel>

        <Panel position="top-right" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end', marginTop: '12px', marginRight: '12px' }}>
          <button 
            onClick={executeFlow} 
            disabled={isRunning || nodes.length === 0}
            className={isRunning || nodes.length === 0 ? "" : "animate-glow"}
            style={{ 
              background: isRunning || nodes.length === 0 ? 'var(--bg-elevated)' : 'var(--gradient-brand)', 
              color: isRunning || nodes.length === 0 ? 'var(--text-tertiary)' : '#fff', 
              fontWeight: '800', 
              border: 'none', 
              padding: '14px 28px', 
              borderRadius: 'var(--radius-xl)', 
              cursor: isRunning || nodes.length === 0 ? 'not-allowed' : 'pointer',
              boxShadow: isRunning || nodes.length === 0 ? 'none' : 'var(--shadow-lg)',
              transition: 'all 0.3s var(--ease-spring)',
              fontSize: '0.9rem',
              letterSpacing: '0.02em',
              textTransform: 'uppercase'
            }}
          >
            {isRunning ? '⏳ Processing Ecosystem...' : '▶ Launch Neural Flow'}
          </button>
          
          {globalError && (
            <div className="glass-panel" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '14px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--danger)', maxWidth: '320px', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: '800', marginBottom: '4px' }}>ECOSYSTEM ERROR</div>
              {globalError}
            </div>
          )}
        </Panel>

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes edge-flow {
            from { stroke-dashoffset: 24; }
            to { stroke-dashoffset: 0; }
          }
          .lacunex-edge-animated {
            stroke: #00d4ff !important;
            stroke-width: 3 !important;
            stroke-dasharray: 8, 8 !important;
            animation: edge-flow 1s linear infinite !important;
            filter: drop-shadow(0 0 6px rgba(0, 212, 255, 0.8)) !important;
          }
          .animate-glow {
            animation: glow-pulse 2s infinite;
          }
          @keyframes glow-pulse {
            0% { box-shadow: 0 0 5px rgba(168, 85, 247, 0.4); }
            50% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.7); }
            100% { box-shadow: 0 0 5px rgba(168, 85, 247, 0.4); }
          }
        `}} />
      </RF>

      {/* Help Overlay */}
      {showHelp && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(5, 10, 20, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel-strong" style={{
            maxWidth: '500px',
            padding: '40px',
            borderRadius: 'var(--radius-2xl)',
            position: 'relative',
            textAlign: 'center'
          }}>
            <button 
              onClick={() => setShowHelp(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '1.5rem' }}
            >
              ×
            </button>
            <div className="brand-badge brand-badge-lg" style={{ marginBottom: '24px' }}>?</div>
            <h2 className="heading-lg" style={{ marginBottom: '12px' }}>How to use Flow</h2>
            <p className="text-muted" style={{ marginBottom: '32px' }}>Master the LACUNEX parallel processing engine in seconds.</p>
            
            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>1</div>
                <div>
                  <h4 style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Construct</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Pick a template or build from scratch by dragging nodes from the left panel.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-secondary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>2</div>
                <div>
                  <h4 style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Connect</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Drag lines between nodes to define the data flow direction.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--success)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>3</div>
                <div>
                  <h4 style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Execute</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Click 'Launch Neural Flow' to run the entire pipeline at once.</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowHelp(false)}
              className="glass-panel"
              style={{ 
                marginTop: '40px', 
                width: '100%', 
                padding: '14px', 
                borderRadius: 'var(--radius-lg)', 
                background: 'var(--gradient-brand)', 
                color: '#fff', 
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Got it, let's build!
            </button>
          </div>
        </div>
      )}

      {/* Empty State Overlay */}
      {nodes.length === 0 && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(10, 10, 46, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          pointerEvents: 'none'
        }}>
          <div style={{ textAlign: 'center', background: '#111128', padding: '40px', borderRadius: '16px', border: '1px solid #00e5ff', pointerEvents: 'auto', maxWidth: '500px', boxShadow: '0 0 30px rgba(0,229,255,0.2)' }}>
            <h2 style={{ fontSize: '1.8rem', color: '#00e5ff', marginBottom: '10px' }}>Welcome to LACUNEX Flow</h2>
            <p style={{ color: '#aaa', marginBottom: '30px', lineHeight: '1.5' }}>
              Build infinite parallel AI pipelines. String together Code generation, Translation, APIs, and Web searches visually without writing code.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', textAlign: 'left' }}>
              {TEMPLATES.slice(0, 4).map(t => (
                <div key={t.id} onClick={() => loadTemplate(t.id)} style={{ background: '#222244', padding: '15px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s', border: '1px solid #333' }}>
                  <div style={{ fontSize: '1.1rem', marginBottom: '5px', color: '#fff' }}>{t.name.split(' ')[0]} {t.name.slice(3)}</div>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>{t.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
