"use client";

import React, { useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// ---------------------------------------------------------
// Custom Node: ChatPromptNode
// ---------------------------------------------------------
function ChatPromptNode({ data, id }) {
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
          onChange={(e) => data.onChange(id, e.target.value)}
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
// Engine Logic
// ---------------------------------------------------------

async function runChatCompletion(prompt, inputContext, jwtToken) {
  let finalPrompt = prompt;
  if (inputContext) {
    finalPrompt = `Context from previous step:\n<context>\n${inputContext}\n</context>\n\nInstructions:\n${prompt}`;
  }

  // Use the chat streaming API or fallback to direct execution. For simplicity, we use the standard chat route without stream if possible, or simulate it using the code runner. Let's hit the generic code runner or a new completions endpoint?
  // Actually, we can fetch from our /api/chat route as regular user message.
  const res = await fetch("http://localhost:8000/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${jwtToken || "guest"}`
    },
    body: JSON.stringify({
      message: finalPrompt,
      session_id: "flow_session_" + Date.now(),
      mode: "chat"
    })
  });

  if (!res.ok) throw new Error("API failed");
  
  // Since our chat route is SSE, we can just consume it as text and extract the final message.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    
    // Parse SSE
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(5));
          if (data.type === "chunk") {
            fullText += data.content;
          }
        } catch(e) {}
      }
    }
  }

  return fullText;
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
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isRunning, setIsRunning] = useState(false);

  // Provide onChange callback to update node state
  const handlePromptChange = useCallback((id, newPrompt) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          node.data = { ...node.data, prompt: newPrompt };
        }
        return node;
      })
    );
  }, [setNodes]);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)), [setEdges]);

  // Inject handlePromptChange on initial mount
  useEffect(() => {
    const initializedNodes = initialNodes.map(n => ({
      ...n,
      data: { ...n.data, onChange: handlePromptChange }
    }));
    setNodes(initializedNodes);
  }, [handlePromptChange, setNodes]);

  const nodeTypes = useMemo(() => ({ chatPrompt: ChatPromptNode }), []);

  const executeFlow = async () => {
    if (isRunning) return;
    setIsRunning(true);
    
    // Basic Topological Sort
    const getTopoOrder = () => {
      const adj = {};
      const inDegree = {};
      nodes.forEach(n => {
        adj[n.id] = [];
        inDegree[n.id] = 0;
      });
      edges.forEach(e => {
        if (adj[e.source]) adj[e.source].push(e.target);
        if (inDegree[e.target] !== undefined) inDegree[e.target]++;
      });

      const queue = [];
      Object.keys(inDegree).forEach(id => {
        if (inDegree[id] === 0) queue.push(id);
      });

      const order = [];
      while (queue.length > 0) {
        const u = queue.shift();
        order.push(u);
        (adj[u] || []).forEach(v => {
          inDegree[v]--;
          if (inDegree[v] === 0) queue.push(v);
        });
      }
      return order;
    };

    const order = getTopoOrder();
    
    // Execute
    const nodeOutputs = {};
    const localToken = localStorage.getItem("token");

    // Reset status
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: 'idle', output: '' } })));

    for (const nodeId of order) {
      setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'running' } } : n));
      
      const nodeObj = nodes.find(n => n.id === nodeId);
      const prompt = nodeObj.data.prompt;

      // Find predecessors to collect input contexts
      const predecessors = edges.filter(e => e.target === nodeId).map(e => e.source);
      const inputContext = predecessors.map(pId => nodeOutputs[pId]).join("\n\n");

      try {
        const resultText = await runChatCompletion(prompt, inputContext, localToken);
        nodeOutputs[nodeId] = resultText;
        
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'success', output: resultText } } : n));
      } catch (err) {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'error', output: err.message } } : n));
        break; // Stop execution on error
      }
    }

    setIsRunning(false);
  };

  const addNode = () => {
    const newNode = {
      id: (nodes.length + 1).toString(),
      type: 'chatPrompt',
      position: { x: Math.random() * 300 + 100, y: Math.random() * 300 + 100 },
      data: { prompt: '', output: '', status: 'idle', onChange: handlePromptChange }
    };
    setNodes((nds) => nds.concat(newNode));
  };

  return (
    <div className="flow-canvas-wrapper" style={{ width: '100%', height: '100%', minHeight: '600px', background: '#0a0a0a' }}>
      <ReactFlow
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
      </ReactFlow>
    </div>
  );
}
