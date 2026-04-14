"use client";

import React, { useState, useEffect, useMemo } from "react";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";

/**
 * Extracts code from fenced code blocks (```lang\ncode\n```)
 * If no fence is found, treat entire content as code.
 */
const extractCode = (rawContent) => {
  if (!rawContent) return { language: 'python', code: '' };
  const fenceMatch = rawContent.match(/```(\w+)?\n([\s\S]*?)```/);
  if (fenceMatch) {
    return {
      language: fenceMatch[1] || 'python',
      code: fenceMatch[2].trim()
    };
  }
  // If no fence, treat entire content as code
  return { language: 'python', code: rawContent.trim() };
};

/**
 * Detects if code needs stdin (input from user)
 */
const needsStdin = (code, lang) => {
  const patterns = {
    python: /input\s*\(/,
    python3: /input\s*\(/,
    py: /input\s*\(/,
    java: /Scanner|nextLine|nextInt|BufferedReader/,
    cpp: /cin\s*>>/,
    'c++': /cin\s*>>/,
    c: /scanf\s*\(/,
    javascript: /readline|prompt\s*\(/,
    js: /readline|prompt\s*\(/,
    ruby: /gets/,
    go: /fmt\.Scan/,
    rust: /std::io::stdin/,
  };
  const pattern = patterns[lang?.toLowerCase()];
  return pattern ? pattern.test(code) : false;
};

const CodeTerminal = ({ code: rawCode, language, onCodeChange }) => {
  const [output, setOutput] = useState('');
  const [stderr, setStderr] = useState('');
  const [stdin, setStdin] = useState('');
  const [running, setRunning] = useState(false);
  const [exitCode, setExitCode] = useState(null);
  const [execTime, setExecTime] = useState(null);
  const [history, setHistory] = useState([]);

  // Extract actual code from fenced blocks
  const { language: extractedLang, code } = useMemo(() => extractCode(rawCode), [rawCode]);

  // Auto-detect language from code block fence:
  const detectLanguage = (codeText, hint) => {
    if (hint && hint !== 'code') {
      let hl = hint.toLowerCase();
      if (hl === 'lang') return 'python'; // fallback if poorly passed
      return hl;
    }
    if (codeText.includes('def ') || codeText.includes('import ')) return 'python';
    if (codeText.includes('public static void main')) return 'java';
    if (codeText.includes('#include')) return 'cpp';
    if (codeText.includes('func main()')) return 'go';
    if (codeText.includes('fn main()')) return 'rust';
    if (codeText.includes('console.log') || codeText.includes('const ') || codeText.includes('let ')) return 'javascript';
    return 'python'; // default
  };

  const detectedLanguage = detectLanguage(code, language || extractedLang);
  const showStdin = needsStdin(code, detectedLanguage);

  // Ctrl+Enter keyboard shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        run();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [code, detectedLanguage, stdin, running]);

  const run = async () => {
    if (running) return;
    setRunning(true);
    setOutput('');
    setStderr('');
    setExitCode(null);

    try {
      const { executeCode } = await import('../lib/api');
      // Send only the extracted code, NOT the full message content
      const data = await executeCode(code, detectedLanguage, stdin);
      console.log("[CodeTerminal] execute response", data);
      
      setOutput(data.stdout || '');
      setStderr(data.stderr || data.compile_output || '');
      setExitCode(data.exit_code);
      setExecTime(data.execution_time);
      setHistory(h => [...h.slice(-9), {
        time: new Date().toLocaleTimeString(),
        exitCode: data.exit_code
      }]);
    } catch (e) {
      setStderr('Connection error: ' + e.message);
      setExitCode(1);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="code-terminal">
      {/* Terminal Header */}
      <div className="terminal-header">
        <div className="terminal-dots">
          <span style={{background:'#ff5f57'}}/>
          <span style={{background:'#febc2e'}}/>
          <span style={{background:'#28c840'}}/>
        </div>
        <span className="terminal-lang">
          {detectedLanguage?.toUpperCase() || 'CODE'} Terminal
        </span>
        <div className="terminal-controls">
          <button
            className={`run-btn ${running ? 'running' : ''}`}
            onClick={run}
            disabled={running}
            title="Run (Ctrl+Enter)"
          >
            {running ? '⏳' : '▶'} {running ? 'Running...' : 'Run'}
          </button>
          <button onClick={() => {setOutput(''); setStderr(''); setExitCode(null);}}
            title="Clear output">
            🗑️
          </button>
        </div>
      </div>

      <div className="terminal-pane-top" style={{ maxHeight: '350px', overflowY: 'auto' }}>
        <SyntaxHighlighter
          language={detectedLanguage}
          style={vscDarkPlus}
          showLineNumbers
          customStyle={{ margin: 0, padding: "1rem", fontSize: "0.85rem", background: "transparent" }}
          lineNumberStyle={{ paddingRight: "1rem", color: "#4a5568", userSelect: "none" }}
        >
          {code}
        </SyntaxHighlighter>
      </div>

      {/* stdin input — only show when code actually needs it */}
      {showStdin && (
        <div className="stdin-section" style={{ padding: '0.8rem', background: '#1e1e1e', borderTop: '1px solid #333' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.4rem' }}>📥 Input (stdin):</label>
          <textarea
            value={stdin}
            onChange={e => setStdin(e.target.value)}
            placeholder="Program input (if needed)..."
            rows={2}
            className="stdin-input"
            style={{ width: '100%', background: '#252526', color: '#fff', border: '1px solid #444', borderRadius: '4px', padding: '0.5rem', fontFamily: 'monospace' }}
          />
        </div>
      )}

      {/* Output */}
      <div className="terminal-output-area" style={{ padding: '0.8rem', background: '#0d0d0d', minHeight: '120px', fontFamily: 'monospace', fontSize: '0.85rem' }}>
        {running && (
          <div className="terminal-running" style={{ color: '#a855f7' }}>
            <span className="pulse-dot"/> Executing {detectedLanguage}...
          </div>
        )}

        {output && (
          <pre className="terminal-stdout" style={{ color: '#e5e5e5', margin: '0 0 1rem 0' }}>
            <span className="terminal-label stdout" style={{ color: '#28c840', display: 'block', marginBottom: '0.2rem', fontSize: '0.75rem' }}>stdout</span>
            {output}
          </pre>
        )}

        {stderr && (
          <pre className="terminal-stderr" style={{ color: '#ff5f57', margin: '0 0 1rem 0', whiteSpace: 'pre-wrap' }}>
            <span className="terminal-label stderr" style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.75rem' }}>error</span>
            {stderr}
          </pre>
        )}

        {exitCode !== null && !running && (
          <div className={`exit-status ${exitCode === 0 ? 'ok' : 'fail'}`} style={{ color: exitCode === 0 ? '#28c840' : '#ff5f57', marginTop: '0.5rem', borderTop: '1px solid #222', paddingTop: '0.5rem' }}>
            {exitCode === 0 ? '✅ Success' : `❌ Failed`}
            {' · '}exit {exitCode}
            {execTime !== null && execTime !== undefined ? ` · ⚡ ${execTime}ms` : ''}
          </div>
        )}

        {!output && !stderr && !running && exitCode === null && (
          <div className="terminal-hint" style={{ color: '#666' }}>
            Press ▶ Run or Ctrl+Enter to execute
          </div>
        )}
      </div>

      {/* Run history */}
      {history.length > 0 && (
        <div className="run-history" style={{ display: 'flex', gap: '0.5rem', padding: '0.4rem 0.8rem', background: '#1e1e1e', fontSize: '0.75rem' }}>
          {history.length > 0 && <span style={{ color: '#666' }}>History:</span>}
          {history.slice(-5).map((h,i) => (
            <span key={i} className={h.exitCode === 0 ? 'hist-ok' : 'hist-fail'} style={{ color: h.exitCode === 0 ? '#28c840' : '#ff5f57' }}>
              {h.exitCode === 0 ? '✅' : '❌'} {h.time}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default CodeTerminal;
