"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { executeCode } from "@/lib/api";

function IconPlay() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function IconTerminal() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export default function CodeTerminal({ code, lang }) {
  const [stdin, setStdin] = useState("");
  const [history, setHistory] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const codeRef = useRef(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const runCode = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    
    let result = { output: "", success: false };
    const startTime = performance.now();
    
    try {
      // For demo, try local first if applicable, otherwise API
      const lowLang = lang.toLowerCase();
      if (lowLang === "python" || lowLang === "py" || lowLang === "python3") {
        try {
          const { runPythonLocally } = await import("@/lib/sandbox");
          const localCheck = await runPythonLocally(code);
          if (localCheck && localCheck.isLocal) {
            result = localCheck;
            // Hack for stdin missing locally in sandbox
          }
        } catch { /* fallback */ }
      } else if (lowLang === "javascript" || lowLang === "js") {
        try {
          const { runJSLocally } = await import("@/lib/sandbox");
          const localCheck = await runJSLocally(code);
          if (localCheck && localCheck.isLocal) {
            result = localCheck;
          }
        } catch { /* fallback */ }
      }

      if (!result.success && !result.output) {
        // Run via generic fallback / backend
        result = await executeCode(code, lang, stdin);
      }
    } catch (e) {
      result = { output: e.message || "Execution Failed", success: false };
    }
    
    const timeTaken = Math.round(performance.now() - startTime);

    setHistory(prev => [
      ...prev,
      {
        timestamp: new Date().toISOString(),
        stdin: stdin,
        stdout: result.output || result.stdout,
        success: result.success,
        executionTime: timeTaken,
        isLocal: result.isLocal
      }
    ]);
    setIsRunning(false);
  }, [code, lang, stdin, isRunning]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === "Enter") {
        // Verify user is focused inside this terminal container
        if (codeRef.current && codeRef.current.contains(document.activeElement)) {
          runCode();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [runCode]);

  return (
    <div className="code-block code-terminal-split" ref={codeRef} tabIndex={0}>
      <div className="code-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <IconTerminal /> {lang}
        </span>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button 
            type="button" 
            className="code-run-btn" 
            onClick={runCode}
            disabled={isRunning}
          >
            {isRunning ? "⏳ Running..." : <><IconPlay /> Run (Ctrl+Enter)</>}
          </button>
          <button type="button" className="code-copy-btn" onClick={handleCopy}>
            {copied ? <><IconCheck /> Copied</> : <><IconCopy /> Copy</>}
          </button>
        </div>
      </div>
      
      <div className="terminal-pane-top">
        <SyntaxHighlighter
          language={lang}
          style={vscDarkPlus}
          showLineNumbers
          customStyle={{ margin: 0, padding: "1rem", fontSize: "0.85rem", background: "transparent" }}
          lineNumberStyle={{ paddingRight: "1rem", color: "#4a5568", userSelect: "none" }}
        >
          {code}
        </SyntaxHighlighter>
      </div>

      <div className="terminal-pane-middle">
        <textarea
          placeholder="Standard Input (stdin)... (Optional)"
          value={stdin}
          onChange={(e) => setStdin(e.target.value)}
          className="terminal-stdin"
          rows={3}
        />
      </div>

      {history.length > 0 && (
        <div className="terminal-pane-bottom">
          <div className="history-header">Execution Logs</div>
          <div className="history-list">
            {history.map((run, i) => (
              <div key={i} className={`history-run ${run.success ? "success" : "error"}`}>
                <div className="run-meta">
                  <span>Run #{i + 1}</span>
                  <span>{new Date(run.timestamp).toLocaleTimeString()}</span>
                  <span>⏱ {run.executionTime}ms</span>
                  {run.isLocal && <span className="local-badge">Local</span>}
                </div>
                {run.stdin && <div className="run-stdin">Input: {run.stdin}</div>}
                <pre className="run-stdout">{run.stdout || "(No output)"}</pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
