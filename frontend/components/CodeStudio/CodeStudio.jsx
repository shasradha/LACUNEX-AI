'use client'
import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import TerminalOutput from './TerminalOutput'
import LanguageSelector from './LanguageSelector'
import StudioToolbar from './StudioToolbar'
import SnippetManager from './SnippetManager'
import { LANGUAGES, getLanguageByMonaco } from '@/lib/languages'
import useCodeExecution from '@/hooks/useCodeExecution'

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
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [layout, setLayout] = useState('split') // 'split' | 'editor' | 'output'
  const [showStdin, setShowStdin] = useState(false)

  const { run, result, loading, history } = useCodeExecution()

  // When language changes, load template if code is empty/template
  const handleLanguageChange = (lang) => {
    const prevTemplate = language.template
    setLanguage(lang)
    if (!code || code === prevTemplate) {
      setCode(lang.template)
    }
  }

  const handleSnippetLoad = (loadedCode, monacoLang) => {
    const lang = getLanguageByMonaco(monacoLang)
    setLanguage(lang)
    setCode(loadedCode)
  }

  // Run code via hook
  const handleRun = useCallback(() => {
    run(code, language.monaco, stdin, language.name)
  }, [code, language, stdin, run])

  // AI Fix Errors — sends code + error to chat
  const handleAiFix = useCallback(() => {
    const errorText = result?.stderr || result?.compile_output || ''
    const prompt = `Fix this ${language.name} code error:\n\n\`\`\`${language.monaco}\n${code}\n\`\`\`\n\nError:\n\`\`\`\n${errorText}\n\`\`\`\n\nFix the bug and return the corrected code.`

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

  // Key handlers
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
      <StudioToolbar
        language={language}
        languages={LANGUAGES}
        onLanguageChange={handleLanguageChange}
        layout={layout}
        onLayoutChange={setLayout}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        onClose={onClose}
      />

      {/* Action bar */}
      <div className="studio-actionbar">
        <button
          className="run-btn primary"
          onClick={handleRun}
          disabled={loading}
          title="Run (Ctrl+Enter)"
        >
          {loading ? (
            <><span className="spinner-tiny"/>Running...</>
          ) : (
            <>▶ Run</>
          )}
        </button>

        <LanguageSelector
          languages={LANGUAGES}
          selected={language}
          onChange={handleLanguageChange}
        />

        <SnippetManager
          code={code}
          language={language}
          onLoad={handleSnippetLoad}
        />

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
              onRun={handleRun}
              height="100%"
            />

            {/* stdin section */}
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
                  placeholder="Enter input for your program..."
                  rows={3}
                />
              </div>
            )}
          </div>
        )}

        {layout === 'split' && <div className="studio-divider"/>}

        {/* Output panel */}
        {layout !== 'editor' && (
          <div className="output-panel">
            <TerminalOutput
              result={result}
              loading={loading}
              onAiFix={handleAiFix}
            />

            {/* Run history */}
            {history.length > 0 && (
              <div className="run-history">
                <span className="history-label">Recent runs:</span>
                {history.slice(0, 5).map(r => (
                  <span
                    key={r.id}
                    className={`history-item ${r.status === 3 ? 'ok' : 'fail'}`}
                    title={`${r.language} · ${r.duration}s`}
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
