'use client'
import { useState, useCallback, useEffect, useMemo } from 'react'
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

export default function CodeStudio({ initialCode = '', initialLanguage = null, onClose, chatContext = null }) {
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

  const handleLanguageChange = useCallback((lang) => {
    const prev = language.template
    setLanguage(lang)
    if (!code || code === prev) setCode(lang.template)
  }, [code, language])

  // Run code
  const handleRun = useCallback(async () => {
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
  }, [code, language, stdin, loading])

  // AI Fix — sends prompt to chat but explicitly prevents document generation
  const handleAiFix = useCallback(() => {
    const errorText = result?.stderr || result?.compile_output || ''
    if (!errorText || !chatContext?.sendMessage) return
    const prompt = `IMPORTANT: Do NOT generate a document. Just provide a quick code fix in a code block.\n\nFix this ${language.name} error. Return ONLY the corrected code:\n\n\`\`\`${language.monaco}\n${code}\n\`\`\`\n\nError: ${errorText.substring(0, 500)}`
    chatContext.sendMessage(prompt)
  }, [code, language, result, chatContext])

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
    const patterns = {
      python: /input\s*\(/, javascript: /readline|prompt\s*\(/, java: /Scanner|nextLine|nextInt/,
      cpp: /cin\s*>>|getline/, c: /scanf\s*\(/, go: /fmt\.Scan/, rust: /std::io::stdin/, ruby: /gets/, php: /fgets|readline/,
    }
    const p = patterns[language.monaco]
    setShowStdin(p ? p.test(code) : false)
  }, [code, language])

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
        </div>
        <div className="cs-titlebar-right">
          <button className="cs-titlebar-btn" onClick={() => setIsFullscreen(f => !f)} title="Toggle fullscreen">
            {isFullscreen ? <IconMinimize /> : <IconMaximize />}
          </button>
          {onClose && <button className="cs-titlebar-btn cs-close-btn" onClick={onClose} title="Close"><IconX /></button>}
        </div>
      </div>

      {/* Toolbar */}
      <div className="cs-toolbar">
        <button className={`cs-run-btn ${loading ? 'running' : ''}`} onClick={handleRun} disabled={loading}>
          {loading ? <><IconSquare /><span>Stop</span></> : <><IconPlay /><span>Run</span></>}
        </button>

        <div className="cs-toolbar-divider" />
        <LanguageSelector languages={LANGUAGES} selected={language} onChange={handleLanguageChange} />
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

        <div className="cs-toolbar-divider" />
        <div className="cs-layout-group">
          <button className={`cs-layout-btn ${layout === 'editor' ? 'active' : ''}`} onClick={() => setLayout('editor')} title="Editor only">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
          </button>
          <button className={`cs-layout-btn ${layout === 'split' ? 'active' : ''}`} onClick={() => setLayout('split')} title="Split view"><IconColumns /></button>
          <button className={`cs-layout-btn ${layout === 'output' ? 'active' : ''}`} onClick={() => setLayout('output')} title="Terminal only"><IconSidebar /></button>
        </div>

        <span className="cs-shortcut-hint">Ctrl+Enter</span>
      </div>

      {/* Main area */}
      <div className={`cs-main cs-layout-${layout}`}>
        {layout !== 'output' && (
          <div className="cs-editor-pane">
            <MonacoEditorPanel code={code} language={language.monaco} onChange={setCode} onRun={handleRun} height="100%" />
            {showStdin && (
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
            <TerminalOutput result={result} loading={loading} onAiFix={chatContext ? handleAiFix : null} />
            {history.length > 0 && (
              <div className="cs-history">
                {history.slice(0, 5).map(r => (
                  <span key={r.id} className={`cs-hist-dot ${r.ok ? 'ok' : 'err'}`} title={r.time} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="cs-statusbar">
        <span>{language.name}</span>
        <span>UTF-8</span>
        <span>Spaces: 4</span>
        {result?.time && <span>{result.time}s</span>}
        <span className="cs-statusbar-spacer" />
        <span className="cs-powered">LACUNEX</span>
      </div>
    </div>
  )
}
