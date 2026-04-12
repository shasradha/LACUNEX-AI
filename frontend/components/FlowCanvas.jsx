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
      setLoaded(true); // still set loaded so we can show error
    });
  }, []);

  return { loaded, mod };
}

// ---------------------------------------------------------
// Custom Node: ChatPromptNode
// ---------------------------------------------------------
function ChatPromptNode({ data, id }) {
  // Safely import Handle + Position at render time from the cached module
  const Handle = ReactFlowModule?.Handle;
  const Position = ReactFlowModule?.Position;

  if (!Handle || !Position) return <div className="flow-custom-node glass-panel-strong">Loading...</div>;

  return (
    <div className="flow-custom-node glass-panel-strong">
      <Handle type="target" position={Position.Top} className="flow-handle" />
      
      <div className="flow-node-header">
        <span className="flow-node-title">AI Prompt Node {id}</span>
        {data.status === 'running' && <span className="flow-status running">⏳ Running</span>}
        {data.status === 'success' && <span className="flow-status success">✅ Done</span>}
        {data.status === 'error' && <span className="flow-status error">❌ Error</span>}
      </div>
      
      <div className="flow-node-body">
        <textarea 
          className="flow-textarea" 
          placeholder="System Prompt / Instructions..." 
          value={data.prompt} 
          onChange={(e) => data.onChange?.(id, e.target.value)}
        />
        
        {data.output && (
          <div className="flow-output-console">
            <div className="flow-output-label">Output:</div>
            <div className="flow-output-content">{data.output}</div>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="flow-handle" />
    </div>
  );
}

// ---------------------------------------------------------
// Engine Logic — uses the CORRECT production API URL
// ---------------------------------------------------------
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function runChatCompletion(prompt, inputContext, jwtToken) {
  let finalPrompt = prompt;
  if (inputContext) {
    finalPrompt = `Context from previous step:\n<context>\n${inputContext}\n</context>\n\nInstructions:\n${prompt}`;
  }

  const res = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${jwtToken || "guest"}`
    },
    body: JSON.stringify({
      message: finalPrompt,
      history: [],
      mode: "normal",
      provider: "groq",
      model: "llama-3.3-70b-versatile"
    })
  });

  if (!res.ok) throw new Error(`API failed (${res.status})`);
  
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === "token") {
            fullText += data.content;
          } else if (data.type === "done") {
            if (data.answer && !fullText) fullText = data.answer;
          }
        } catch(e) {}
      }
    }
  }

  return fullText || "(No output)";
}

// ---------------------------------------------------------
// FlowCanvas Main Component
// ---------------------------------------------------------
const initialNodes = [
  {
    id: '1',
    type: 'chatPrompt',
    position: { x: 250, y: 50 },
    data: { prompt: 'Generate 3 startup ideas.', output: '', status: 'idle' },
  },
  {
    id: '2',
    type: 'chatPrompt',
    position: { x: 250, y: 350 },
    data: { prompt: 'Write a catchy slogan for each idea.', output: '', status: 'idle' },
  },
  {
    id: '3',
    type: 'chatPrompt',
    position: { x: 250, y: 650 },
    data: { prompt: 'Translate the slogans into French.', output: '', status: 'idle' },
  }
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3', animated: true },
];

export default function FlowCanvas() {
  const { loaded, mod } = useReactFlow();
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState(initialEdges);
  const [isRunning, setIsRunning] = useState(false);

  const handlePromptChange = useCallback((id, newPrompt) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, prompt: newPrompt } };
        }
        return node;
      })
    );
  }, []);

  // Initialize nodes once
  useEffect(() => {
    const initialized = initialNodes.map(n => ({
      ...n,
      data: { ...n.data, onChange: handlePromptChange }
    }));
    setNodes(initialized);
  }, [handlePromptChange]);

  const nodeTypes = useMemo(() => ({ chatPrompt: ChatPromptNode }), []);

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
    setEdges((eds) => mod.addEdge({ ...params, animated: true }, eds));
  }, [mod]);

  const executeFlow = async () => {
    if (isRunning) return;
    setIsRunning(true);
    
    // Basic Topological Sort
    const adj = {};
    const inDegree = {};
    nodes.forEach(n => { adj[n.id] = []; inDegree[n.id] = 0; });
    edges.forEach(e => {
      if (adj[e.source]) adj[e.source].push(e.target);
      if (inDegree[e.target] !== undefined) inDegree[e.target]++;
    });

    const queue = [];
    Object.keys(inDegree).forEach(id => { if (inDegree[id] === 0) queue.push(id); });

    const order = [];
    while (queue.length > 0) {
      const u = queue.shift();
      order.push(u);
      (adj[u] || []).forEach(v => {
        inDegree[v]--;
        if (inDegree[v] === 0) queue.push(v);
      });
    }
    
    const nodeOutputs = {};
    const localToken = typeof localStorage !== 'undefined' ? localStorage.getItem("token") : null;

    // Reset status
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: 'idle', output: '' } })));

    for (const nodeId of order) {
      setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'running' } } : n));
      
      const nodeObj = nodes.find(n => n.id === nodeId);
      if (!nodeObj) continue;
      const prompt = nodeObj.data.prompt;

      const predecessors = edges.filter(e => e.target === nodeId).map(e => e.source);
      const inputContext = predecessors.map(pId => nodeOutputs[pId]).filter(Boolean).join("\n\n");

      try {
        const resultText = await runChatCompletion(prompt, inputContext, localToken);
        nodeOutputs[nodeId] = resultText;
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'success', output: resultText } } : n));
      } catch (err) {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'error', output: err.message } } : n));
        break;
      }
    }

    setIsRunning(false);
  };

  const addNode = () => {
    const newId = String(Date.now());
    const newNode = {
      id: newId,
      type: 'chatPrompt',
      position: { x: Math.random() * 300 + 100, y: Math.random() * 300 + 100 },
      data: { prompt: '', output: '', status: 'idle', onChange: handlePromptChange }
    };
    setNodes((nds) => [...nds, newNode]);
  };

  // --- Loading / Error States ---
  if (!loaded) {
    return (
      <div className="flow-canvas-wrapper" style={{ width: '100%', height: '100%', minHeight: '600px', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#a855f7' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🌟</div>
          <div style={{ fontSize: '1rem', opacity: 0.8 }}>Loading LACUNEX Flow Engine...</div>
        </div>
      </div>
    );
  }

  if (!mod) {
    return (
      <div className="flow-canvas-wrapper" style={{ width: '100%', height: '100%', minHeight: '600px', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#ef4444', maxWidth: '400px', padding: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
          <div style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Flow Engine could not load</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>The @xyflow/react dependency may not be installed correctly. Try refreshing.</div>
        </div>
      </div>
    );
  }

  // --- Main Render ---
  const { ReactFlow: RF, Background, MiniMap, Controls, Panel } = mod;

  return (
    <div className="flow-canvas-wrapper" style={{ width: '100%', height: '100%', minHeight: '600px', background: '#0a0a0a' }}>
      <RF
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        colorMode="dark"
      >
        <Background gap={16} size={1} color="#333" />
        <MiniMap nodeColor="#a855f7" maskColor="rgba(0,0,0,0.8)" style={{ background: '#111' }} />
        <Controls />
        <Panel position="top-right" className="flow-panel-nav">
          <button className="flow-btn primary" onClick={executeFlow} disabled={isRunning}>
            {isRunning ? '⏳ Executing Pipeline...' : '▶ Run Data Workflow'}
          </button>
          <button className="flow-btn secondary" onClick={addNode}>
            + Add Step
          </button>
        </Panel>
      </RF>
    </div>
  );
}
