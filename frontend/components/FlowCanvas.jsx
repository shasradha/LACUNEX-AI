"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';

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
// Universal Custom Node: LacunexNode
// ---------------------------------------------------------
function LacunexNode({ data, selected }) {
  const Handle = ReactFlowModule?.Handle;
  const Position = ReactFlowModule?.Position;

  if (!Handle || !Position) return <div className="flow-node">...</div>;

  return (
    <div className={`flow-node ${data.category} ${selected ? 'selected' : ''}`} style={{
      background: '#111128',
      border: `1px solid ${selected ? '#00e5ff' : '#222244'}`,
      borderRadius: '8px',
      padding: '12px',
      width: '260px',
      fontFamily: '"Space Grotesk", "Inter", sans-serif',
      boxShadow: selected ? '0 0 15px rgba(0, 229, 255, 0.2)' : 'none',
      color: '#fff',
      transition: 'all 0.2s ease'
    }}>
      <Handle type="target" position={Position.Left} style={{ background: '#00e5ff', width: '8px', height: '8px' }} />
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #222244', paddingBottom: '8px', marginBottom: '10px' }}>
        <div style={{ fontSize: '1.2rem' }}>{data.icon}</div>
        <div style={{ fontWeight: '600', fontSize: '0.9rem', color: data.category === 'input' ? '#4ade80' : data.category === 'action' ? '#00e5ff' : '#c084fc' }}>
          {data.label}
        </div>
      </div>
      
      <div className="node-content">
        {data.type === 'text_input' && (
          <textarea
            value={data.text || ''}
            onChange={e => data.onChange && data.onChange(data.id, e.target.value)}
            placeholder="Enter your prompt..."
            rows={3}
            style={{ width: '100%', background: '#0a0a18', border: '1px solid #333', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '0.8rem', resize: 'vertical' }}
          />
        )}
        
        {data.type === 'translate' && (
          <select
            value={data.language || 'Hindi'}
            onChange={e => data.onLanguageChange && data.onLanguageChange(data.id, e.target.value)}
            style={{ width: '100%', background: '#0a0a18', border: '1px solid #333', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '0.8rem' }}
          >
            <option>Hindi</option>
            <option>Bengali</option>
            <option>Tamil</option>
            <option>Telugu</option>
            <option>French</option>
            <option>Spanish</option>
          </select>
        )}
        
        {data.status && (
          <div style={{ marginTop: '10px', fontSize: '0.75rem', fontWeight: 'bold', 
            color: data.status === 'running' ? '#facc15' : data.status === 'done' ? '#4ade80' : '#f87171' 
          }}>
            {data.status === 'running' && '⏳ Running...'}
            {data.status === 'done' && '✅ Done'}
            {data.status === 'error' && '❌ Error'}
          </div>
        )}
        
        {data.output && (
          <div style={{ marginTop: '10px', background: '#0a0a18', padding: '6px', borderRadius: '4px', fontSize: '0.75rem', maxHeight: '100px', overflowY: 'auto', border: '1px solid #222244' }}>
            <div style={{ color: '#888', marginBottom: '4px' }}>Result:</div>
            {data.output}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} style={{ background: '#00e5ff', width: '8px', height: '8px' }} />
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
  const [globalError, setGlobalError] = useState("");

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

  // Load template 1 by default
  useEffect(() => {
    loadTemplate("t1");
  }, [handleTextChange, handleLangChange]);

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

    try {
      // Find initial input
      const startNodes = nodes.filter(n => n.data.type === 'text_input');
      let initial_input = "Start";
      if (startNodes.length > 0) initial_input = startNodes[0].data.text || "";

      // We handle the topological sort in the backend to save frontend state complexity.
      // But we need to fake real-time updates. Since backend `/flow/execute` runs as one request right now,
      // we'll just show "running" on all nodes, then "done" when the payload comes back.
      // A more robust flow engine would use WebSockets.
      
      setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: 'running' } })));

      const res = await fetch(`${API_BASE}/api/flow/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, edges, initial_input })
      });

      if (!res.ok) throw new Error("Flow execution failed on the server.");
      const data = await res.json();
      const resultsMap = data.results || {};

      setNodes(nds => nds.map(n => ({
        ...n,
        data: {
          ...n.data,
          status: 'done',
          output: resultsMap[n.id] ? (typeof resultsMap[n.id] === 'string' ? resultsMap[n.id].substring(0, 150) + "..." : "Success") : ''
        }
      })));

      if (resultsMap.should_download && resultsMap.pdf_content) {
        // trigger fake download
        const blob = new Blob([resultsMap.pdf_content], { type: 'text/markdown' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `lacunex_output_${Date.now()}.md`;
        a.click();
      }

    } catch (e) {
      setGlobalError(e.message);
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
    <div className="flow-canvas-wrapper" style={{ width: '100%', height: '100%', minHeight: '700px', background: '#0a0a2e' }}>
      <RF
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background gap={20} size={2} color="#222244" />
        <MiniMap nodeColor="#00e5ff" maskColor="rgba(0,0,0,0.8)" style={{ background: '#111128', border: '1px solid #333' }} />
        <Controls style={{ fill: '#00e5ff' }} />
        
        <Panel position="top-left" style={{ display: 'flex', gap: '10px' }}>
          <select 
            onChange={(e) => loadTemplate(e.target.value)}
            style={{ background: '#111128', color: '#fff', border: '1px solid #00e5ff', padding: '8px', borderRadius: '4px' }}
          >
            <option value="">Load Template...</option>
            {TEMPLATES.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </Panel>

        <Panel position="top-right" style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
          <button 
            onClick={executeFlow} 
            disabled={isRunning}
            style={{ 
              background: isRunning ? '#333' : '#00e5ff', 
              color: isRunning ? '#888' : '#000', 
              fontWeight: 'bold', 
              border: 'none', 
              padding: '10px 20px', 
              borderRadius: '4px', 
              cursor: isRunning ? 'not-allowed' : 'pointer' 
            }}
          >
            {isRunning ? '⏳ Executing Pipeline...' : '▶ Run Data Workflow'}
          </button>
          
          {globalError && (
            <div style={{ background: '#450a0a', color: '#f87171', padding: '8px', borderRadius: '4px', border: '1px solid #7f1d1d', maxWidth: '300px' }}>
              {globalError}
            </div>
          )}
        </Panel>
      </RF>
    </div>
  );
}
