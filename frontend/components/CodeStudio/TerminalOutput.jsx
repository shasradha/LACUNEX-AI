'use client'
import { useRef, useEffect, useState } from 'react'

// SVG Icons
const IconCopy = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
const IconCheck = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3fb950" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
const IconWand = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 4-1 1m4.5-1.5L17 5m3 3-1 1"/><path d="m21 3-9 9"/><path d="M3.5 20.5 12 12"/></svg>
const IconTerminal = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>

export default function TerminalOutput({ result, loading, onAiFix }) {
  const termRef = useRef(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight
  }, [result, loading])

  const copyOutput = () => {
    const text = result?.stdout || result?.stderr || result?.compile_output || ''
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const hasError = result && (result.stderr || result.compile_output || (result.status?.id && result.status.id !== 3))
  const isSuccess = result?.status?.id === 3

  return (
    <div className="cs-terminal">
      <div className="cs-terminal-header">
        <div className="cs-terminal-title">
          <IconTerminal />
          <span>Terminal</span>
        </div>
        <div className="cs-terminal-actions">
          {result && (
            <>
              <button className="cs-term-btn" onClick={copyOutput} title="Copy output">
                {copied ? <IconCheck /> : <IconCopy />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              {hasError && onAiFix && (
                <button className="cs-term-btn cs-term-btn-fix" onClick={onAiFix} title="Fix with AI">
                  <IconWand />
                  <span>AI Fix</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Status badge */}
      {result?.status && (
        <div className={`cs-status-bar ${isSuccess ? 'success' : 'error'}`}>
          <span className="cs-status-dot" />
          <span>{isSuccess ? 'Accepted' : (result.status.description || 'Error')}</span>
          <div className="cs-status-meta">
            {result.time && <span>{result.time}s</span>}
            {result.memory && <span>{(result.memory / 1024).toFixed(1)} MB</span>}
          </div>
        </div>
      )}

      <div className="cs-terminal-body" ref={termRef}>
        {loading && (
          <div className="cs-terminal-loading">
            <div className="cs-loading-bar"><div className="cs-loading-fill" /></div>
            <span>Executing...</span>
          </div>
        )}

        {!loading && !result && (
          <div className="cs-terminal-empty">
            <span className="cs-cursor-blink">_</span>
            <span>Press Run or Ctrl+Enter to execute</span>
          </div>
        )}

        {result?.compile_output && (
          <div className="cs-output-block">
            <div className="cs-output-tag error">COMPILE ERROR</div>
            <pre className="cs-output-pre error">{result.compile_output}</pre>
          </div>
        )}

        {result?.stdout && (
          <div className="cs-output-block">
            <div className="cs-output-tag success">OUTPUT</div>
            <pre className="cs-output-pre success">{result.stdout}</pre>
          </div>
        )}

        {result?.stderr && (
          <div className="cs-output-block">
            <div className="cs-output-tag error">STDERR</div>
            <pre className="cs-output-pre error">{result.stderr}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
