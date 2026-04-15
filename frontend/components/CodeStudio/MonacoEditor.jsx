'use client'
import { useRef, useCallback } from 'react'
import Editor from '@monaco-editor/react'

const EDITOR_OPTIONS = {
  fontSize: 14,
  fontFamily: "'Cascadia Code', 'JetBrains Mono', 'Fira Code', Consolas, monospace",
  fontLigatures: true,
  lineNumbers: 'on',
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 4,
  wordWrap: 'off',
  padding: { top: 12, bottom: 12 },
  smoothScrolling: true,
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: 'on',
  renderLineHighlight: 'line',
  bracketPairColorization: { enabled: true },
  guides: { bracketPairs: true, indentation: true },
  suggest: { showKeywords: true, showSnippets: true },
  quickSuggestions: true,
  overviewRulerBorder: false,
  hideCursorInOverviewRuler: true,
  glyphMargin: false,
  folding: true,
  lineDecorationsWidth: 8,
  lineNumbersMinChars: 3,
  renderWhitespace: 'none',
  contextmenu: true,
  mouseWheelZoom: true,
}

// GitHub Dark Dimmed theme
const GITHUB_DARK = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '768390', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'f47067' },
    { token: 'string', foreground: '96d0ff' },
    { token: 'number', foreground: '6cb6ff' },
    { token: 'type', foreground: 'f69d50' },
    { token: 'function', foreground: 'dcbdfb' },
    { token: 'variable', foreground: 'adbac7' },
    { token: 'operator', foreground: 'f47067' },
    { token: 'delimiter', foreground: 'adbac7' },
    { token: 'tag', foreground: '7ee787' },
    { token: 'attribute.name', foreground: '6cb6ff' },
    { token: 'attribute.value', foreground: '96d0ff' },
  ],
  colors: {
    'editor.background': '#0d1117',
    'editor.foreground': '#c9d1d9',
    'editor.lineHighlightBackground': '#161b22',
    'editor.selectionBackground': '#264f78',
    'editor.inactiveSelectionBackground': '#264f7844',
    'editorLineNumber.foreground': '#484f58',
    'editorLineNumber.activeForeground': '#c9d1d9',
    'editorCursor.foreground': '#58a6ff',
    'editorIndentGuide.background': '#21262d',
    'editorIndentGuide.activeBackground': '#30363d',
    'editor.findMatchBackground': '#9e6a03aa',
    'editorBracketMatch.background': '#3fb95044',
    'editorBracketMatch.border': '#3fb95088',
    'scrollbarSlider.background': '#484f5833',
    'scrollbarSlider.hoverBackground': '#484f5855',
    'scrollbarSlider.activeBackground': '#484f5877',
    'editorWidget.background': '#161b22',
    'editorSuggestWidget.background': '#161b22',
    'editorSuggestWidget.border': '#30363d',
    'editorSuggestWidget.selectedBackground': '#264f78',
    'input.background': '#0d1117',
    'input.border': '#30363d',
  },
}

export default function MonacoEditorPanel({ code, language, onChange, onRun, height = '100%' }) {
  const editorRef = useRef(null)

  const handleMount = useCallback((editor, monaco) => {
    editorRef.current = editor
    monaco.editor.defineTheme('github-dark', GITHUB_DARK)
    monaco.editor.setTheme('github-dark')

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRun?.())
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, (e) => {
      editor.getAction('editor.action.formatDocument')?.run()
    })

    editor.focus()
  }, [onRun])

  return (
    <div style={{ height, width: '100%' }}>
      <Editor
        height="100%"
        language={language}
        value={code}
        onChange={(v) => onChange?.(v || '')}
        onMount={handleMount}
        options={EDITOR_OPTIONS}
        loading={
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#484f58', fontSize:13, gap:8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.22-8.56" strokeLinecap="round"/></svg>
            Loading editor...
          </div>
        }
      />
    </div>
  )
}
