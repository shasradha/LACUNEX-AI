'use client'
import { useRef, useEffect, useState } from 'react'

const STATUS_MAP = {
  3: { label: 'Accepted', color: '#00c951', icon: '✅' },
  4: { label: 'Wrong Answer', color: '#ff6b6b', icon: '❌' },
  5: { label: 'Time Limit Exceeded', color: '#ff9900', icon: '⏱️' },
  6: { label: 'Compilation Error', color: '#ff6b6b', icon: '🔴' },
  7: { label: 'Runtime Error', color: '#ff6b6b', icon: '💥' },
  11: { label: 'Runtime Error', color: '#ff6b6b', icon: '💥' },
}

export default function TerminalOutput({
  result,
  loading,
  onAiFix,
}) {
  const termRef = useRef(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight
    }
  }, [result, loading])

  const copyOutput = () => {
    const text = result?.stdout || result?.stderr || result?.compile_output || ''
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const status = result?.status
  const statusInfo = STATUS_MAP[status?.id] || { label: status?.description, color: '#888', icon: '•' }
  const hasError = result && (result.stderr || result.compile_output || (status?.id && status.id !== 3))

  return (
    <div className="terminal-panel">
      {/* Terminal Header */}
      <div className="terminal-header">
        <div className="terminal-dots">
          <span className="dot" style={{ background: '#ff5f57' }}/>
          <span className="dot" style={{ background: '#febc2e' }}/>
          <span className="dot" style={{ background: '#28c840' }}/>
        </div>
        <span className="terminal-title">
          🖥️ Output Terminal
        </span>
        <div className="terminal-actions">
          {result && (
            <>
              <button className="term-btn" onClick={copyOutput}>
                {copied ? '✅ Copied' : '📋 Copy'}
              </button>
              {hasError && onAiFix && (
                <button className="term-btn ai-fix" onClick={onAiFix}>
                  🤖 AI Fix
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Status bar */}
      {result?.status && (
        <div
          className="status-bar"
          style={{ borderColor: statusInfo.color }}
        >
          <span style={{ color: statusInfo.color }}>
            {statusInfo.icon} {statusInfo.label}
          </span>
          <div className="status-meta">
            {result.time && (
              <span>⚡ {result.time}s</span>
            )}
            {result.memory && (
              <span>💾 {(result.memory / 1000).toFixed(1)}MB</span>
            )}
          </div>
        </div>
      )}

      {/* Output content */}
      <div className="terminal-body" ref={termRef}>
        {loading && (
          <div className="terminal-loading">
            <div className="loading-bar">
              <div className="loading-progress"/>
            </div>
            <span>Executing on secure sandbox...</span>
          </div>
        )}

        {!loading && !result && (
          <div className="terminal-empty">
            <span className="terminal-cursor">█</span>
            <span className="terminal-hint">
              Press ▶ Run or Ctrl+Enter to execute
            </span>
          </div>
        )}

        {result?.compile_output && (
          <div className="output-section">
            <div className="output-label error">🔴 Compilation Error</div>
            <pre className="output-text error-text">
              {result.compile_output}
            </pre>
          </div>
        )}

        {result?.stdout && (
          <div className="output-section">
            <div className="output-label success">📤 Output</div>
            <pre className="output-text success-text">
              {result.stdout}
            </pre>
          </div>
        )}

        {result?.stderr && (
          <div className="output-section">
            <div className="output-label error">⚠️ Error</div>
            <pre className="output-text error-text">
              {result.stderr}
            </pre>
          </div>
        )}

        {result?.message && (
          <div className="output-section">
            <div className="output-label warning">ℹ️ Message</div>
            <pre className="output-text warning-text">
              {result.message}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
