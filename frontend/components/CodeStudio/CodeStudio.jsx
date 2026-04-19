'use client'
import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import TerminalOutput from './TerminalOutput'
import LanguageSelector from './LanguageSelector'
import SnippetManager from './SnippetManager'
import { LANGUAGES, getLanguageByMonaco } from '@/lib/languages'
import { executeCode } from '@/lib/api'

const MonacoEditorPanel = dynamic(() => import('./MonacoEditor'), {
  ssr: false,
  loading: () => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', background:'#0d1117', color:'#484f58', fontSize:13 }}>
      Loading editor...
    </div>
  ),
})

// SVG Icons
const IconPlay = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
const IconSquare = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
const IconWand = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 4-1 1m4.5-1.5L17 5m3 3-1 1"/><path d="m21 3-9 9"/><path d="M3.5 20.5 12 12"/></svg>
const IconCopy = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
const IconDownload = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
const IconMaximize = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
const IconMinimize = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
const IconX = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IconSidebar = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
const IconColumns = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
const IconCheck = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3fb950" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
const IconInput = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
const IconReset = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
const IconTheme = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"/></svg>
const IconHelp = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
const IconEye = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
const IconRefresh = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>

const THEMES = [
  { id: 'github-dark', label: 'GitHub Dark' },
  { id: 'one-dark', label: 'One Dark' },
  { id: 'dracula', label: 'Dracula' }
]

function ThemeSelector({ theme, setTheme }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const currentLabel = THEMES.find(t => t.id === theme)?.label || theme

  return (
    <div className="cs-theme-selector" ref={ref}>
      <button className="cs-theme-trigger" onClick={() => setOpen(!open)} title="Change Theme">
        <IconTheme />
        <span>{currentLabel}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none', opacity: 0.7 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="cs-theme-dropdown">
          {THEMES.map(t => (
            <button
              key={t.id}
              className={`cs-theme-option ${t.id === theme ? 'active' : ''}`}
              onClick={() => { setTheme(t.id); setOpen(false) }}
            >
              <span>{t.label}</span>
              {t.id === theme && (
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── HTML Live Preview Component ── */
function HtmlLivePreview({ code }) {
  const iframeRef = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!iframeRef.current) return
    try {
      const blob = new Blob([code], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      iframeRef.current.src = url
      setError(null)
      return () => URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    }
  }, [code])

  return (
    <div className="cs-preview-container">
      <div className="cs-preview-header">
        <div className="cs-preview-title">
          <IconEye />
          <span>Live Preview</span>
          <span className="cs-preview-badge">HTML</span>
        </div>
        <div className="cs-preview-actions">
          <button
            className="cs-term-btn"
            onClick={() => {
              if (iframeRef.current) {
                const blob = new Blob([code], { type: 'text/html;charset=utf-8' })
                const url = URL.createObjectURL(blob)
                iframeRef.current.src = url
              }
            }}
            title="Refresh preview"
          >
            <IconRefresh />
            <span>Refresh</span>
          </button>
          <button
            className="cs-term-btn"
            onClick={() => {
              const blob = new Blob([code], { type: 'text/html;charset=utf-8' })
              const url = URL.createObjectURL(blob)
              window.open(url, '_blank')
            }}
            title="Open in new tab"
          >
            <IconMaximize />
            <span>New Tab</span>
          </button>
        </div>
      </div>
      {error ? (
        <div className="cs-preview-error">
          <span>Preview Error: {error}</span>
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          className="cs-preview-iframe"
          sandbox="allow-scripts allow-modals allow-forms allow-same-origin allow-popups"
          title="HTML Live Preview"
        />
      )}
    </div>
  )
}

export default function CodeStudio({ initialCode = '', initialLanguage = null, onClose, onMinimize, isMinimized = false, chatContext = null }) {
  const startLang = initialLanguage || LANGUAGES[0]
  const [code, setCode] = useState(initialCode || startLang.template)
  const [language, setLanguage] = useState(startLang)
  const [stdin, setStdin] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [layout, setLayout] = useState('split')
  const [showStdin, setShowStdin] = useState(false)
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState([])
  const [theme, setTheme] = useState('github-dark')
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Android back button: close Code Studio
  useEffect(() => {
    if (!onClose) return
    try {
      const { registerBackButton } = require('@/lib/capacitor-hooks')
      const cleanup = registerBackButton(() => { onClose() })
      return cleanup
    } catch { return () => {} }
  }, [onClose])

  // On mobile, force layout to 'editor' for better fit
  useEffect(() => {
    if (isMobile) setLayout('editor')
  }, [isMobile])

  const isHtml = language.livePreview === true

  const handleLanguageChange = useCallback((lang) => {
    const prev = language.template
    setLanguage(lang)
    if (!code || code === prev) setCode(lang.template)
  }, [code, language])

  // Run code
  const handleRun = useCallback(async () => {
    if (isHtml) return // HTML uses live preview, no execution needed
    if (!code.trim() || loading) return
    setLoading(true)
    setResult(null)
    try {
      const data = await executeCode(code, language.monaco, stdin)
      const statusId = data.status?.id || (data.exit_code === 0 ? 3 : 11)
      setResult({
        stdout: data.stdout || '',
        stderr: data.stderr || '',
        compile_output: data.compile_output || '',
        status: data.status || { id: statusId, description: data.status_description || (data.exit_code === 0 ? 'Accepted' : 'Error') },
        time: data.time || data.execution_time || null,
        memory: data.memory || null,
      })
      setHistory(h => [{ id: Date.now(), ok: data.exit_code === 0, time: new Date().toLocaleTimeString() }, ...h.slice(0, 9)])
    } catch (err) {
      setResult({ stderr: err.message, status: { id: 13, description: 'Connection Error' } })
    } finally {
      setLoading(false)
    }
  }, [code, language, stdin, loading, isHtml])

  const handleAiFix = useCallback(() => {
    const errorText = result?.stderr || result?.compile_output || ''
    if (!errorText || !chatContext?.sendMessage) return
    const prompt = `Fix this ${language.name} code error. Reply with ONLY the corrected code in a single code block. Do NOT generate any document, outline, or structured response. Keep it short.\n\n\`\`\`${language.monaco}\n${code}\n\`\`\`\n\nError:\n\`\`\`\n${errorText.substring(0, 400)}\n\`\`\``
    chatContext.sendMessage(prompt)
    if (onClose) onClose()
  }, [code, language, result, chatContext, onClose])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  const handleDownload = useCallback(() => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `code.${language.extension}`
    a.click()
    URL.revokeObjectURL(url)
  }, [code, language])

  // Detect stdin needs
  useEffect(() => {
    if (isHtml) { setShowStdin(false); return }
    const patterns = {
      python: /input\s*\(/, javascript: /readline|prompt\s*\(/, java: /Scanner|nextLine|nextInt/,
      cpp: /cin\s*>>|getline/, c: /scanf\s*\(/, go: /fmt\.Scan/, rust: /std::io::stdin/, ruby: /gets/, php: /fgets|readline/,
    }
    const p = patterns[language.monaco]
    setShowStdin(p ? p.test(code) : false)
  }, [code, language, isHtml])

  // F11
  useEffect(() => {
    const h = (e) => { if (e.key === 'F11') { e.preventDefault(); setIsFullscreen(f => !f) } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const hasError = result && (result.stderr || result.compile_output)

  return (
    <div className={`cs-root ${isFullscreen ? 'cs-fullscreen' : ''}`}>
      {/* Title bar */}
      <div className="cs-titlebar">
        <div className="cs-titlebar-left">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          <span className="cs-titlebar-text">Code Studio</span>
          <span className="cs-titlebar-sep">—</span>
          <span className="cs-titlebar-file">code.{language.extension}</span>
          {isHtml && <span className="cs-preview-live-dot" title="Live Preview Active">● LIVE</span>}
        </div>
        <div className="cs-titlebar-right">
          {onMinimize && (
            <button className="cs-titlebar-btn" onClick={onMinimize} title={isMinimized ? "Expand to fullscreen" : "Minimize to split screen"}>
              {isMinimized ? <IconMaximize /> : <IconColumns />}
            </button>
          )}
          {!isMinimized && (
            <button className="cs-titlebar-btn" onClick={() => setIsFullscreen(f => !f)} title="Toggle strict fullscreen">
              {isFullscreen ? <IconMinimize /> : <IconMaximize />}
            </button>
          )}
          {onClose && <button className="cs-titlebar-btn cs-close-btn" onClick={onClose} title="Close"><IconX /></button>}
        </div>
      </div>

      {/* Toolbar */}
      <div className="cs-toolbar">
        {!isHtml && (
          <button className={`cs-run-btn ${loading ? 'running' : ''}`} onClick={handleRun} disabled={loading}>
            {loading ? <><IconSquare /><span>Stop</span></> : <><IconPlay /><span>Run</span></>}
          </button>
        )}

        {isHtml && (
          <div className="cs-html-indicator">
            <span className="cs-html-dot"></span>
            <span>Live Preview</span>
          </div>
        )}

        <div className="cs-toolbar-divider" />
        <LanguageSelector languages={LANGUAGES} selected={language} onChange={handleLanguageChange} />
        
        <button className="cs-tool-btn" onClick={() => { if(confirmReset) { setCode(language.template); setConfirmReset(false) } else { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 3000) } }} title="Reset to template">
          <IconReset />
          <span style={{ color: confirmReset ? '#f47067' : 'inherit', fontSize: confirmReset ? 11 : 'inherit' }}>{confirmReset ? 'Sure?' : 'Reset'}</span>
        </button>

        <div className="cs-toolbar-divider" />
        
        <ThemeSelector theme={theme} setTheme={setTheme} />

        <div className="cs-toolbar-divider" />

        <SnippetManager code={code} language={language} onLoad={(c, l) => { setLanguage(getLanguageByMonaco(l)); setCode(c) }} />

        {hasError && chatContext && (
          <>
            <div className="cs-toolbar-divider" />
            <button className="cs-tool-btn cs-fix-btn" onClick={handleAiFix}><IconWand /><span>AI Fix</span></button>
          </>
        )}

        <div className="cs-toolbar-spacer" />

        <button className="cs-tool-btn" onClick={handleCopy} title="Copy code">
          {copied ? <IconCheck /> : <IconCopy />}
        </button>
        <button className="cs-tool-btn" onClick={handleDownload} title="Download"><IconDownload /></button>
        <button className="cs-tool-btn" onClick={() => setShowShortcuts(true)} title="Shortcuts"><IconHelp /></button>

        <div className="cs-toolbar-divider" />
        <div className="cs-layout-group">
          <button className={`cs-layout-btn ${layout === 'editor' ? 'active' : ''}`} onClick={() => setLayout('editor')} title="Editor only">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
          </button>
          <button className={`cs-layout-btn ${layout === 'split' ? 'active' : ''}`} onClick={() => setLayout('split')} title="Split view"><IconColumns /></button>
          <button className={`cs-layout-btn ${layout === 'output' ? 'active' : ''}`} onClick={() => setLayout('output')} title={isHtml ? "Preview only" : "Terminal only"}><IconSidebar /></button>
        </div>

        <span className="cs-shortcut-hint">Ctrl+Enter</span>
      </div>

      {/* Main area */}
      <div className={`cs-main cs-layout-${layout}`}>
        {layout !== 'output' && (
          <div className="cs-editor-pane">
            <MonacoEditorPanel code={code} language={language.monaco} theme={theme} onChange={setCode} onRun={handleRun} height="100%" />
            {showStdin && !isHtml && (
              <div className="cs-stdin">
                <div className="cs-stdin-header">
                  <IconInput /><span>stdin</span>
                  {stdin && <button onClick={() => setStdin('')}>Clear</button>}
                </div>
                <textarea className="cs-stdin-input" value={stdin} onChange={e => setStdin(e.target.value)}
                  placeholder="Provide all inputs here, one per line. Programs that use input() / scanf / cin require pre-entered input."
                  rows={3} />
              </div>
            )}
          </div>
        )}
        {layout === 'split' && <div className="cs-gutter" />}
        {layout !== 'editor' && (
          <div className="cs-terminal-pane">
            {isHtml ? (
              <HtmlLivePreview code={code} />
            ) : (
              <>
                <TerminalOutput result={result} loading={loading} onAiFix={chatContext ? handleAiFix : null} />
                {history.length > 0 && (
                  <div className="cs-history">
                    {history.slice(0, 5).map(r => (
                      <span key={r.id} className={`cs-hist-dot ${r.ok ? 'ok' : 'err'}`} title={r.time} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Shortcuts Overlay */}
      {showShortcuts && (
        <div className="cs-modal-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="cs-modal glass-panel-strong" onClick={e => e.stopPropagation()}>
            <div className="cs-modal-header">
              <h3 className="heading-sm">Keyboard Shortcuts</h3>
              <button onClick={() => setShowShortcuts(false)}><IconX /></button>
            </div>
            <div className="cs-shortcuts-grid">
              <div className="cs-shortcut-item"><span>Run Code</span> <kbd>Ctrl</kbd>+<kbd>Enter</kbd></div>
              <div className="cs-shortcut-item"><span>Format</span> <kbd>Ctrl</kbd>+<kbd>S</kbd></div>
              <div className="cs-shortcut-item"><span>Fullscreen</span> <kbd>F11</kbd></div>
              <div className="cs-shortcut-item"><span>Copy Code</span> <kbd>Ctrl</kbd>+<kbd>C</kbd></div>
              <div className="cs-shortcut-item"><span>Find</span> <kbd>Ctrl</kbd>+<kbd>F</kbd></div>
              <div className="cs-shortcut-item"><span>Zoom</span> <kbd>Ctrl</kbd>+<kbd>+</kbd></div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: Floating Close FAB — always visible and easy to tap */}
      {isMobile && onClose && (
        <button
          className="cs-mobile-close-fab"
          onClick={onClose}
          aria-label="Close Code Studio"
          style={{
            position: 'fixed',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
            right: '16px',
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.9)',
            border: '2px solid rgba(255,255,255,0.2)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10001,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          ✕
        </button>
      )}
    </div>
  )
}
