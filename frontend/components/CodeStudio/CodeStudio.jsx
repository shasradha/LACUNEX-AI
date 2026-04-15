'use client'
import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import TerminalOutput from './TerminalOutput'
import LanguageSelector from './LanguageSelector'
import { LANGUAGES } from '@/lib/languages'

// Dynamic import Monaco (SSR breaks it)
const MonacoEditorPanel = dynamic(
  () => import('./MonacoEditor'),
  { ssr: false, loading: () => <div className="editor-loading">Loading Monaco...</div> }
)

export default function CodeStudio({
  initialCode = '',
  initialLanguage = null,
  onClose,
  chatContext = null, // AI chat context for "AI Fix"
}) {
  const startLang = initialLanguage || LANGUAGES[0]
  const [code, setCode] = useState(initialCode || startLang.template)
  const [language, setLanguage] = useState(startLang)
  const [stdin, setStdin] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [runHistory, setRunHistory] = useState([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [layout, setLayout] = useState('split') // 'split' | 'editor' | 'output'
  const [showStdin, setShowStdin] = useState(false)

  // When language changes, load template if code is empty/template
  const handleLanguageChange = (lang) => {
    const prevTemplate = language.template
    setLanguage(lang)
    if (!code || code === prevTemplate) {
      setCode(lang.template)
    }
  }

  // Run code via backend proxy
  const runCode = useCallback(async () => {
    if (!code.trim()) return
    setLoading(true)
    setResult(null)

    const startTime = Date.now()
    try {
      const { executeCode } = await import('@/lib/api')
      const data = await executeCode(code, language.monaco, stdin)

      // Map the existing executor response to our expected format
      const statusId = data.exit_code === 0 ? 3 : (data.compile_output ? 6 : 11)
      setResult({
        stdout: data.stdout || '',
        stderr: data.stderr || '',
        compile_output: data.compile_output || '',
        message: '',
        status: { id: statusId, description: data.status_description || (data.exit_code === 0 ? 'Accepted' : 'Error') },
        time: data.execution_time || null,
        memory: null,
        exit_code: data.exit_code,
      })
      // Add to run history
      setRunHistory(h => [...h.slice(-19), {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        language: language.name,
        status: statusId,
        duration: Date.now() - startTime,
      }])
    } catch (err) {
      setResult({
        stderr: `Network error: ${err.message}`,
        status: { id: 13, description: 'Network Error' }
      })
    } finally {
      setLoading(false)
    }
  }, [code, language, stdin])

  // AI Fix Errors — sends code + error to chat
  const handleAiFix = useCallback(() => {
    const errorText = result?.stderr || result?.compile_output || ''
    const prompt = `Fix this ${language.name} code error:\n\n\`\`\`${language.monaco}\n${code}\n\`\`\`\n\nError:\n\`\`\`\n${errorText}\n\`\`\`\n\nFix the bug and return the corrected code.`

    // Send to LACUNEX chat
    if (chatContext?.sendMessage) {
      chatContext.sendMessage(prompt)
    }
  }, [code, language, result, chatContext])

  // Explain Code
  const handleExplainCode = useCallback(() => {
    const prompt = `Explain this ${language.name} code step by step:\n\n\`\`\`${language.monaco}\n${code}\n\`\`\``
    if (chatContext?.sendMessage) {
      chatContext.sendMessage(prompt)
    }
  }, [code, language, chatContext])

  // Download code
  const handleDownload = useCallback(() => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lacunex-code.${language.extension}`
    a.click()
    URL.revokeObjectURL(url)
  }, [code, language])

  // Copy code to clipboard
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code)
  }, [code])

  // Auto-detect if stdin needed
  useEffect(() => {
    const needsInput = {
      python: /input\s*\(/,
      javascript: /readline|prompt\s*\(/,
      java: /Scanner|nextLine|nextInt/,
      cpp: /cin\s*>>/,
      c: /scanf\s*\(/,
      go: /fmt\.Scan/,
      rust: /std::io::stdin/,
      ruby: /gets/,
      php: /fgets|readline/,
    }
    const pattern = needsInput[language.monaco]
    setShowStdin(pattern ? pattern.test(code) : false)
  }, [code, language])

  // F11 fullscreen toggle
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'F11') {
        e.preventDefault()
        setIsFullscreen(f => !f)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className={`code-studio ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Top Toolbar */}
      <div className="studio-topbar">
        <div className="studio-title">
          <span className="studio-icon">⚡</span>
          <span>LACUNEX Code Studio</span>
        </div>

        <LanguageSelector
          languages={LANGUAGES}
          selected={language}
          onChange={handleLanguageChange}
        />

        <div className="studio-controls">
          {/* Layout toggles */}
          <div className="layout-toggle">
            <button
              className={layout === 'editor' ? 'active' : ''}
              onClick={() => setLayout('editor')}
              title="Editor only"
            >⬜</button>
            <button
              className={layout === 'split' ? 'active' : ''}
              onClick={() => setLayout('split')}
              title="Split view"
            >⬛</button>
            <button
              className={layout === 'output' ? 'active' : ''}
              onClick={() => setLayout('output')}
              title="Output only"
            >▦</button>
          </div>

          <button
            className="fullscreen-btn"
            onClick={() => setIsFullscreen(f => !f)}
            title="Toggle fullscreen (F11)"
          >
            {isFullscreen ? '⊡' : '⊞'}
          </button>

          {onClose && (
            <button className="close-btn" onClick={onClose}>✕</button>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="studio-actionbar">
        <button
          className="run-btn primary"
          onClick={runCode}
          disabled={loading}
          title="Run (Ctrl+Enter)"
        >
          {loading ? (
            <><span className="spinner-tiny"/>Running...</>
          ) : (
            <>▶ Run</>
          )}
        </button>

        {result?.stderr || result?.compile_output ? (
          <button className="action-btn ai-fix" onClick={handleAiFix}>
            🤖 AI Fix
          </button>
        ) : null}

        <button className="action-btn" onClick={handleExplainCode}>
          💡 Explain
        </button>

        <button className="action-btn" onClick={handleCopy}>
          📋 Copy
        </button>

        <button className="action-btn" onClick={handleDownload}>
          ⬇️ Download
        </button>

        <div className="keyboard-hint">
          Ctrl+Enter to run
        </div>
      </div>

      {/* Main content area */}
      <div className={`studio-content layout-${layout}`}>
        {/* Editor panel */}
        {layout !== 'output' && (
          <div className="editor-panel">
            <MonacoEditorPanel
              code={code}
              language={language.monaco}
              onChange={setCode}
              onRun={runCode}
              height="100%"
            />

            {/* stdin section — only shown when needed */}
            {showStdin && (
              <div className="stdin-panel">
                <div className="stdin-header">
                  <span>📥 Program Input (stdin)</span>
                  <button onClick={() => setStdin('')}>Clear</button>
                </div>
                <textarea
                  className="stdin-textarea"
                  value={stdin}
                  onChange={e => setStdin(e.target.value)}
                  placeholder="Enter input for your program (one value per line)..."
                  rows={3}
                />
              </div>
            )}
          </div>
        )}

        {/* Divider for split layout */}
        {layout === 'split' && (
          <div className="studio-divider"/>
        )}

        {/* Output panel */}
        {layout !== 'editor' && (
          <div className="output-panel">
            <TerminalOutput
              result={result}
              loading={loading}
              onAiFix={handleAiFix}
            />

            {/* Run history */}
            {runHistory.length > 0 && (
              <div className="run-history">
                <span className="history-label">Recent runs:</span>
                {runHistory.slice(-5).reverse().map(r => (
                  <span
                    key={r.id}
                    className={`history-item ${r.status === 3 ? 'ok' : 'fail'}`}
                    title={`${r.language} · ${r.duration}ms`}
                  >
                    {r.status === 3 ? '✅' : '❌'} {r.time}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
