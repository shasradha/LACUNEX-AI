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
// Universal Custom Node: LacunexNode (Premium v5)
// ---------------------------------------------------------
function LacunexNode({ data, selected }) {
  const Handle = ReactFlowModule?.Handle;
  const Position = ReactFlowModule?.Position;

  if (!Handle || !Position) return <div className="flow-node">...</div>;

  const categoryColor = data.category === 'input' ? '#00d4ff' : data.category === 'action' ? '#7c3aed' : '#16a34a';

  return (
    <div className={`flow-node-v5 ${data.category || ''} ${selected ? 'selected' : ''}`} style={{
      background: 'linear-gradient(180deg, rgba(20, 24, 39, 0.95) 0%, rgba(10, 12, 20, 0.98) 100%)',
      backdropFilter: 'blur(24px)',
      border: selected ? `2px solid ${categoryColor}` : '1px solid rgba(255, 255, 255, 0.12)',
      borderTop: `4px solid ${categoryColor}`,
      borderRadius: '16px',
      padding: '0',
      width: '320px',
      color: '#fff',
      boxShadow: selected 
        ? `0 0 0 2px rgba(0,212,255,0.2), 0 20px 60px rgba(0,0,0,0.8)` 
        : '0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'var(--font-inter, Inter, sans-serif)',
    }}>
      <Handle type="target" position={Position.Left} className="flow-handle" style={{ 
        background: categoryColor,
        width: '26px', 
        height: '26px',
        border: '4px solid #1a1b26',
        borderRadius: '50%',
        left: '-13px',
        boxShadow: `0 0 16px ${categoryColor}`,
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        zIndex: 10,
        cursor: 'crosshair',
        minWidth: '26px',
        minHeight: '26px'
      }} />
      
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.3)',
        padding: '14px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '1.4rem', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.2))' }}>{data.icon}</div>
          <div style={{ 
            fontWeight: '800', 
            fontSize: '0.9rem', 
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: '#ffffff',
            textShadow: `0 0 10px ${categoryColor}`
          }}>
            {data.label}
          </div>
        </div>
        {data.onDelete && (
          <button 
            onClick={(e) => { e.stopPropagation(); data.onDelete(data.id); }}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-tertiary)', 
              cursor: 'pointer', 
              fontSize: '1.2rem', 
              lineHeight: 1,
              padding: '0 4px',
              transition: 'color 0.2s' 
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
            onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
            title="Delete Node"
          >×</button>
        )}
      </div>
      
      <div className="node-content" style={{ padding: '16px' }}>
        {data.type === 'text_input' && (
          <textarea
            value={data.text || ''}
            onChange={e => data.onChange && data.onChange(data.id, e.target.value)}
            placeholder="Type your prompt here..."
            rows={3}
            style={{ 
              width: '100%', 
              background: 'rgba(255,255,255,0.06)', 
              border: '1px solid rgba(255,255,255,0.12)', 
              color: '#e2e8f0', 
              padding: '10px', 
              borderRadius: '6px', 
              fontSize: '0.8rem', 
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = 'rgba(0,212,255,0.5)'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
          />
        )}
        
        {data.type === 'translate' && (
          <div style={{ position: 'relative' }}>
             <select
                value={data.language || 'Hindi'}
                onChange={e => data.onLanguageChange && data.onLanguageChange(data.id, e.target.value)}
                style={{ 
                  width: '100%', 
                  background: 'rgba(255,255,255,0.06)', 
                  border: '1px solid rgba(255,255,255,0.12)', 
                  color: '#e2e8f0', 
                  padding: '8px 10px', 
                  borderRadius: '6px', 
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
            color: data.status === 'running' ? 'var(--warning, #f59e0b)' : data.status === 'done' ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)' 
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
          <div style={{ 
            marginTop: '16px', 
            background: data.output.startsWith('[ERROR]') ? 'rgba(239, 68, 68, 0.08)' : 'rgba(0,0,0,0.4)', 
            padding: '12px', 
            borderRadius: '8px', 
            fontSize: '0.8rem', 
            maxHeight: '140px', 
            overflowY: 'auto', 
            border: data.output.startsWith('[ERROR]') ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255,255,255,0.1)',
            color: data.output.startsWith('[ERROR]') ? '#f87171' : '#cbd5e1',
            lineHeight: '1.5'
          }}>
            <div style={{ 
              color: data.output.startsWith('[ERROR]') ? '#fca5a5' : '#00d4ff', 
              marginBottom: '8px', 
              fontWeight: '800',
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {data.output.startsWith('[ERROR]') ? 'System Diagnostic:' : 'Live Output:'}
            </div>
            {data.output.startsWith('[ERROR]') ? data.output.replace('[ERROR] ', '') : data.output}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="flow-handle" style={{ 
        background: categoryColor,
        width: '26px', 
        height: '26px',
        border: '4px solid #1a1b26',
        borderRadius: '50%',
        right: '-13px',
        boxShadow: `0 0 16px ${categoryColor}`,
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        zIndex: 10,
        cursor: 'crosshair',
        minWidth: '26px',
        minHeight: '26px'
      }} />

    </div>
  );
}

// ---------------------------------------------------------
// TEMPLATES
// ---------------------------------------------------------
const TEMPLATES = [
  {
    id: "t1",
    name: "Student Notes Package",
    icon: "📚",
    description: "Type a topic → get notes + quiz + PDF",
    nodes: [
      { id: 'n1', type: 'lacunexNode', position: { x: 50, y: 150 }, data: { id: 'n1', type: 'text_input', category: 'input', icon: '📝', label: 'Topic Input', text: 'Quantum Physics' } },
      { id: 'n2', type: 'lacunexNode', position: { x: 400, y: 50 }, data: { id: 'n2', type: 'generate_notes', category: 'action', icon: '🧠', label: 'Generate Notes' } },
      { id: 'n3', type: 'lacunexNode', position: { x: 400, y: 250 }, data: { id: 'n3', type: 'quiz_generator', category: 'action', icon: '❓', label: 'Quiz Generator' } },
      { id: 'n4', type: 'lacunexNode', position: { x: 750, y: 150 }, data: { id: 'n4', type: 'download_pdf', category: 'output', icon: '📥', label: 'Download PDF' } }
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true, style: { stroke: '#00d4ff', strokeWidth: 2 } },
      { id: 'e1-3', source: 'n1', target: 'n3', animated: true, style: { stroke: '#00d4ff', strokeWidth: 2 } },
      { id: 'e2-4', source: 'n2', target: 'n4', animated: true, style: { stroke: '#00d4ff', strokeWidth: 2 } },
    ]
  },
  {
    id: "t2",
    name: "Research & Summarize",
    icon: "🔍",
    description: "Type a question → get live researched summary",
    nodes: [
      { id: 'n1', type: 'lacunexNode', position: { x: 50, y: 150 }, data: { id: 'n1', type: 'text_input', category: 'input', icon: '📝', label: 'Research Question', text: 'What is the latest advancement in AI?' } },
      { id: 'n2', type: 'lacunexNode', position: { x: 400, y: 150 }, data: { id: 'n2', type: 'web_search', category: 'action', icon: '🔍', label: 'Web Search' } },
      { id: 'n3', type: 'lacunexNode', position: { x: 750, y: 150 }, data: { id: 'n3', type: 'summarize', category: 'action', icon: '📋', label: 'Summarize' } },
      { id: 'n4', type: 'lacunexNode', position: { x: 1100, y: 150 }, data: { id: 'n4', type: 'show_in_chat', category: 'output', icon: '💬', label: 'Show in Chat' } }
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true, style: { stroke: '#00d4ff', strokeWidth: 2 } },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true, style: { stroke: '#00d4ff', strokeWidth: 2 } },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true, style: { stroke: '#00d4ff', strokeWidth: 2 } },
    ]
  },
  {
    id: "t3",
    name: "Code & Explain",
    icon: "💻",
    description: "Describe what you want → get code + explanation",
    nodes: [
      { id: 'n1', type: 'lacunexNode', position: { x: 50, y: 150 }, data: { id: 'n1', type: 'text_input', category: 'input', icon: '📝', label: 'Code Request', text: 'Write a python script to parse CSV' } },
      { id: 'n2', type: 'lacunexNode', position: { x: 400, y: 50 }, data: { id: 'n2', type: 'write_code', category: 'action', icon: '💻', label: 'Write Code' } },
      { id: 'n3', type: 'lacunexNode', position: { x: 400, y: 250 }, data: { id: 'n3', type: 'summarize', category: 'action', icon: '📋', label: 'Explain Code' } },
      { id: 'n4', type: 'lacunexNode', position: { x: 750, y: 150 }, data: { id: 'n4', type: 'show_in_chat', category: 'output', icon: '💬', label: 'Show in Chat' } }
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true, style: { stroke: '#00d4ff', strokeWidth: 2 } },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true, style: { stroke: '#00d4ff', strokeWidth: 2 } },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true, style: { stroke: '#00d4ff', strokeWidth: 2 } },
    ]
  },
  {
    id: "t4",
    name: "Translate Content",
    icon: "🌐",
    description: "Topic → notes → translated to your language",
    nodes: [
      { id: 'n1', type: 'lacunexNode', position: { x: 50, y: 150 }, data: { id: 'n1', type: 'text_input', category: 'input', icon: '📝', label: 'Source Text', text: 'Artificial Intelligence' } },
      { id: 'n2', type: 'lacunexNode', position: { x: 400, y: 150 }, data: { id: 'n2', type: 'generate_notes', category: 'action', icon: '🧠', label: 'Generate Notes' } },
      { id: 'n3', type: 'lacunexNode', position: { x: 750, y: 150 }, data: { id: 'n3', type: 'translate', category: 'action', icon: '🌐', label: 'Translate', language: 'Hindi' } },
      { id: 'n4', type: 'lacunexNode', position: { x: 1100, y: 150 }, data: { id: 'n4', type: 'show_in_chat', category: 'output', icon: '💬', label: 'Show in Chat' } }
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true, style: { stroke: '#00d4ff', strokeWidth: 2 } },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true, style: { stroke: '#00d4ff', strokeWidth: 2 } },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true, style: { stroke: '#00d4ff', strokeWidth: 2 } },
    ]
  }
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ---------------------------------------------------------
// Styled Template Dropdown
// ---------------------------------------------------------
function TemplateDropdown({ onSelect }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 16px',
          background: 'rgba(0,212,255,0.1)',
          border: '1px solid rgba(0,212,255,0.3)',
          borderRadius: '8px',
          color: '#00d4ff',
          cursor: 'pointer',
          fontWeight: 500,
          fontSize: '0.85rem',
          transition: 'all 0.2s',
          fontFamily: 'inherit',
          height: '38px',
          boxSizing: 'border-box'
        }}
        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(0,212,255,0.2)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(0,212,255,0.3)'; }}
        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0,212,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
      >
        📂 Load Template
        <span style={{ 
          display: 'inline-block', 
          transition: 'transform 0.2s', 
          transform: open ? 'rotate(-90deg)' : 'rotate(90deg)' 
        }}>›</span>
      </button>
      
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,
          minWidth: '280px',
          borderRadius: '12px',
          overflow: 'hidden',
          zIndex: 100,
          backdropFilter: 'blur(20px)',
          background: 'rgba(10,10,46,0.95)',
          border: '1px solid rgba(0,212,255,0.2)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          animation: 'slideDown 0.2s ease',
        }}>
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => { onSelect(t.id); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px', width: '100%',
                border: 'none', background: 'transparent',
                cursor: 'pointer', textAlign: 'left',
                transition: 'background 0.15s',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                fontFamily: 'inherit',
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,212,255,0.08)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: '20px' }}>{t.icon}</span>
              <div>
                <span style={{ display: 'block', color: '#fff', fontWeight: 500, fontSize: '14px' }}>{t.name}</span>
                <span style={{ display: 'block', color: '#888', fontSize: '12px', marginTop: '2px' }}>{t.description}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth < 768);
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Auto-show help for first-time users (if no nodes)
  useEffect(() => {
    if (loaded && nodes.length === 0 && !isMobile) {
      if (!localStorage.getItem('lacunex_flow_help_seen')) {
        const timer = setTimeout(() => setShowHelp(true), 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [loaded, nodes.length, isMobile]); 


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

  const handleDeleteNode = useCallback((id) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    // Also clean up any edges connected to this node
    setEdges((eds) => eds.filter(e => e.source !== id && e.target !== id));
  }, []);

  const handleClearDisconnectedEdges = useCallback(() => {
    // Completely wipes all edges so user can start fresh
    setEdges([]);
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
        onLanguageChange: handleLangChange,
        onDelete: handleDeleteNode
      }
    }));
    
    setNodes(wiredNodes);
    setEdges(tmpl.edges);
    setGlobalError("");
  };

  const runTemplateDirectly = async (template) => {
    // For mobile: run the first input node's text through chat directly
    const inputNode = template.nodes.find(n => n.data.type === 'text_input');
    const inputText = inputNode?.data?.text || 'Hello';
    window.dispatchEvent(new CustomEvent('lacunex_flow_output', {
      detail: { text: `Running "${template.name}" template with input: "${inputText}"...\n\nPlease switch to desktop for the full visual workflow experience.`, initial_input: inputText }
    }));
  };

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
    setEdges((eds) => mod.addEdge({ ...params, animated: true, style: { stroke: '#00d4ff', strokeWidth: 2 } }, eds));
  }, [mod]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow/type');
      const label = event.dataTransfer.getData('application/reactflow/label');
      const icon = event.dataTransfer.getData('application/reactflow/icon');
      const category = event.dataTransfer.getData('application/reactflow/category');

      if (!type) {
        return;
      }

      // Simple absolute coordinate placement based on canvas
      const wrapperElement = document.querySelector('.flow-canvas-wrapper');
      let position = { x: 100, y: 100 };
      if (wrapperElement) {
        const reactFlowBounds = wrapperElement.getBoundingClientRect();
        // Fallback for zoom/pan (approximate):
        position = {
          x: event.clientX - reactFlowBounds.left - 100,
          y: event.clientY - reactFlowBounds.top - 50,
        };
      }
      
      let initialText = '';
      if(type === 'text_input') initialText = 'New input';

      const newNode = {
        id: `node_dnd_${Date.now()}`,
        type: 'lacunexNode',
        position,
        data: { 
          id: `node_dnd_${Date.now()}`, 
          type, 
          label, 
          icon, 
          category, 
          text: initialText,
          onChange: handleTextChange, 
          onLanguageChange: handleLangChange,
          onDelete: handleDeleteNode
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [handleTextChange, handleLangChange, handleDeleteNode, nodes]
  );

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

      // Extract final output either explicitly from Show in Chat node, or take the last node's output
      const finalOutput = resultsMap.final_output || data.final;

      // Only dispatch "Show in Chat" if we have REAL content (not an error message)
      if (finalOutput && !finalOutput.startsWith('[ERROR]') && !pipelineError) {
        window.dispatchEvent(new CustomEvent('lacunex_flow_output', {
          detail: { text: finalOutput, initial_input }
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
      <div className="flow-canvas-wrapper" style={{ width: '100%', height: '100%', minHeight: '600px', background: '#06060f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#00d4ff' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🌟</div>
          <div style={{ fontSize: '1rem', opacity: 0.8 }}>Loading LACUNEX Flow Engine...</div>
        </div>
      </div>
    );
  }

  if (!mod) {
    return (
      <div className="flow-canvas-wrapper" style={{ width: '100%', height: '100%', minHeight: '600px', background: '#06060f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#ef4444', maxWidth: '400px', padding: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
          <div style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Flow Engine could not load</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>The @xyflow/react dependency may not be installed.</div>
        </div>
      </div>
    );
  }

  // Mobile view — simplified notice + quick templates
  if (isMobile) {
    return (
      <div style={{
        width: '100%', height: '100%', minHeight: '500px',
        background: '#06060f',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}>
        <div style={{
          background: 'rgba(10, 10, 46, 0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 212, 255, 0.2)',
          borderRadius: '16px',
          padding: '32px 24px',
          textAlign: 'center',
          maxWidth: '340px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⚡</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>LACUNEX Flow</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '24px' }}>
            The visual workflow builder works best on desktop. Use a larger screen for the full drag-and-drop experience.
          </p>
          <div style={{ textAlign: 'left' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#00d4ff', marginBottom: '12px' }}>Quick Templates:</h3>
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => runTemplateDirectly(t)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  width: '100%', padding: '10px 12px',
                  background: 'rgba(0,212,255,0.06)',
                  border: '1px solid rgba(0,212,255,0.15)',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  marginBottom: '8px',
                  fontSize: '0.85rem',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,212,255,0.12)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0,212,255,0.06)'}
              >
                <span style={{ fontSize: '1.2rem' }}>{t.icon}</span>
                <span>{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { ReactFlow: RF, Background, MiniMap, Controls, Panel, MarkerType } = mod;

  const defaultEdgeOptions = {
    type: 'smoothstep',
    animated: true,
    style: {
      stroke: '#00d4ff',
      strokeWidth: 2,
    },
    markerEnd: MarkerType ? {
      type: MarkerType.ArrowClosed,
      color: '#00d4ff',
      width: 20,
      height: 20,
    } : undefined,
  };

  const onDragStart = (event, node) => {
    event.dataTransfer.setData('application/reactflow/type', node.type);
    event.dataTransfer.setData('application/reactflow/label', node.label);
    event.dataTransfer.setData('application/reactflow/icon', node.icon);
    event.dataTransfer.setData('application/reactflow/category', node.category);
    event.dataTransfer.effectAllowed = 'move';
  };

  const DRAGGABLE_NODES = [
    { type: 'text_input', label: 'Topic Input', icon: '📝', category: 'input' },
    { type: 'generate_notes', label: 'Generate Notes', icon: '🧠', category: 'action' },
    { type: 'quiz_generator', label: 'Quiz Generator', icon: '❓', category: 'action' },
    { type: 'web_search', label: 'Web Search', icon: '🔍', category: 'action' },
    { type: 'summarize', label: 'Summarize', icon: '📋', category: 'action' },
    { type: 'translate', label: 'Translate', icon: '🌐', category: 'action' },
    { type: 'write_code', label: 'Write Code', icon: '💻', category: 'action' },
    { type: 'download_pdf', label: 'Download PDF', icon: '📥', category: 'output' },
    { type: 'show_in_chat', label: 'Show in Chat', icon: '💬', category: 'output' }
  ];

  return (
      <div className="flow-canvas-wrapper" style={{ width: '100%', height: '100%', minHeight: '700px', background: '#0a0a0f', position: 'relative' }}>
      <RF
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineStyle={{ stroke: '#00d4ff', strokeWidth: 3 }}
        connectionLineType="smoothstep"
        deleteKeyCode={['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }}
        fitView
      >
        <Background variant="lines" gap={40} size={1} color="rgba(255, 255, 255, 0.05)" />
        <MiniMap 
          nodeColor={(n) => {
            if (n.data.category === 'input') return '#00d4ff';
            if (n.data.category === 'action') return '#7c3aed';
            return '#16a34a';
          }} 
          maskColor="rgba(5, 10, 20, 0.7)" 
          style={{ background: 'rgba(10,10,46,0.8)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: '8px' }} 
        />
        
        <Panel position="top-left" style={{ display: 'flex', gap: '12px', marginTop: '12px', marginLeft: '12px', zIndex: 100 }}>
          <TemplateDropdown onSelect={loadTemplate} />

          <button
            onClick={() => setShowHelp(true)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              color: '#00d4ff',
              fontWeight: 'bold',
              cursor: 'pointer',
              border: '1px solid rgba(0,212,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(0,212,255,0.06)',
              fontSize: '0.85rem',
              fontFamily: 'inherit',
              transition: 'all 0.2s',
              height: '38px',
              boxSizing: 'border-box'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(0,212,255,0.15)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0,212,255,0.06)'; }}
          >
            <span style={{ fontSize: '1.1rem' }}>❓</span> Help
          </button>
          
          <button
            onClick={handleClearDisconnectedEdges}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              color: '#f87171',
              fontWeight: 'bold',
              cursor: 'pointer',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(239, 68, 68, 0.05)',
              fontSize: '0.85rem',
              fontFamily: 'inherit',
              transition: 'all 0.2s',
              height: '38px',
              boxSizing: 'border-box'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'; }}
            title="Remove disconnected connections"
          >
            <span style={{ fontSize: '1.1rem' }}>🧹</span> Clean Edges
          </button>
        </Panel>

        <Panel position="left" style={{ 
          display: 'flex', flexDirection: 'column', gap: '10px', 
          marginTop: '70px', marginLeft: '12px', padding: '16px',
          background: 'rgba(10, 12, 20, 0.85)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
          maxWidth: '220px',
        }}>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
            Node Library
          </div>
          <div style={{ color: '#64748b', fontSize: '0.7rem', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '8px' }}>
            Drag elements to construct your pipeline.
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
            {DRAGGABLE_NODES.map((node, i) => {
              const categoryColor = node.category === 'input' ? '#00d4ff' : node.category === 'action' ? '#7c3aed' : '#16a34a';
              return (
                <div
                  key={i}
                  className="dndnode"
                  onDragStart={(event) => onDragStart(event, node)}
                  draggable
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid rgba(255,255,255,0.05)`,
                    borderLeft: `3px solid ${categoryColor}`,
                    borderRadius: '8px',
                    color: '#e2e8f0',
                    cursor: 'grab',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    transition: 'all 0.15s',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{node.icon}</span>
                  {node.label}
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel position="top-right" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end', marginTop: '12px', marginRight: '12px' }}>
          <button 
            onClick={executeFlow} 
            disabled={isRunning || nodes.length === 0}
            className={isRunning || nodes.length === 0 ? "" : "animate-glow"}
            style={{ 
              background: isRunning || nodes.length === 0 ? 'var(--bg-elevated, #141d2e)' : 'var(--gradient-brand, linear-gradient(135deg, #a855f7 0%, #06b6d4 100%))', 
              color: isRunning || nodes.length === 0 ? 'var(--text-tertiary, #64748b)' : '#fff', 
              fontWeight: '800', 
              border: 'none', 
              padding: '14px 28px', 
              borderRadius: '12px', 
              cursor: isRunning || nodes.length === 0 ? 'not-allowed' : 'pointer',
              boxShadow: isRunning || nodes.length === 0 ? 'none' : '0 8px 32px rgba(0,0,0,0.4)',
              transition: 'all 0.3s',
              fontSize: '0.9rem',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              fontFamily: 'inherit',
            }}
          >
            {isRunning ? '⏳ Processing Ecosystem...' : '▶ Launch Neural Flow'}
          </button>
          
          {globalError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '14px', borderRadius: '12px', border: '1px solid #ef4444', maxWidth: '320px', fontSize: '0.85rem', backdropFilter: 'blur(10px)' }}>
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
          .react-flow__edge-path {
            stroke: #00d4ff !important;
            stroke-width: 3 !important;
          }
          /* Handle hover effects */
          .react-flow__handle {
            width: 18px !important;
            height: 18px !important;
            background: #00d4ff !important;
            border: 3px solid #1a1b26 !important;
            border-radius: 50% !important;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
            z-index: 10 !important;
          }
          .react-flow__handle:hover {
            transform: scale(1.4) !important;
            box-shadow: 0 0 16px #00d4ff !important;
            cursor: crosshair !important;
            background: #ffffff !important;
            border-color: #00d4ff !important;
          }
          /* Node hover */
          .flow-node-v5:hover {
            border-color: rgba(0,212,255,0.5) !important;
            box-shadow: 0 0 20px rgba(0,212,255,0.15) !important;
            transform: translateY(-1px);
          }
          .animate-glow {
            animation: glow-pulse 2s infinite;
          }
          @keyframes glow-pulse {
            0% { box-shadow: 0 0 5px rgba(168, 85, 247, 0.4); }
            50% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.7); }
            100% { box-shadow: 0 0 5px rgba(168, 85, 247, 0.4); }
          }
          @keyframes pulse {
            0% { opacity: 0.5; transform: scale(0.9); }
            50% { opacity: 1; transform: scale(1.1); }
            100% { opacity: 0.5; transform: scale(0.9); }
          }
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          /* Dark background for flow */
          .react-flow__background {
            background-color: #0d0f14 !important;
          }
          /* Connection line */
          .react-flow__connection-line {
            stroke: #00d4ff !important;
            stroke-width: 2 !important;
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
            borderRadius: '20px',
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
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#00d4ff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>1</div>
                <div>
                  <h4 style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Construct</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Pick a template or build from scratch by dragging nodes from the left panel.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#7c3aed', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>2</div>
                <div>
                  <h4 style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Connect</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Drag from the cyan dots to connect nodes and define data flow.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>3</div>
                <div>
                  <h4 style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Execute</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Click &apos;Launch Neural Flow&apos; to run the entire pipeline at once.</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => { setShowHelp(false); localStorage.setItem('lacunex_flow_help_seen', 'true'); }}
              style={{ 
                marginTop: '40px', 
                width: '100%', 
                padding: '14px', 
                borderRadius: '12px', 
                background: 'var(--gradient-brand, linear-gradient(135deg, #a855f7 0%, #06b6d4 100%))', 
                color: '#fff', 
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
              }}
            >
              Got it, let&apos;s build!
            </button>
          </div>
        </div>
      )}

      {/* Empty State Overlay */}
      {nodes.length === 0 && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(6, 6, 15, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          pointerEvents: 'none'
        }}>
          <div style={{ textAlign: 'center', background: 'rgba(10, 10, 46, 0.9)', backdropFilter: 'blur(20px)', padding: '40px', borderRadius: '16px', border: '1px solid rgba(0,212,255,0.2)', pointerEvents: 'auto', maxWidth: '500px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <h2 style={{ fontSize: '1.8rem', color: '#00d4ff', marginBottom: '10px' }}>Welcome to LACUNEX Flow</h2>
            <p style={{ color: '#94a3b8', marginBottom: '30px', lineHeight: '1.5' }}>
              Build infinite parallel AI pipelines. String together Code generation, Translation, APIs, and Web searches visually without writing code.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', textAlign: 'left' }}>
              {TEMPLATES.slice(0, 4).map(t => (
                <div key={t.id} onClick={() => loadTemplate(t.id)} style={{ background: 'rgba(0,212,255,0.05)', padding: '15px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid rgba(0,212,255,0.1)' }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(0,212,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0,212,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(0,212,255,0.1)'; }}
                >
                  <div style={{ fontSize: '1.1rem', marginBottom: '5px', color: '#fff' }}>{t.icon} {t.name}</div>
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
