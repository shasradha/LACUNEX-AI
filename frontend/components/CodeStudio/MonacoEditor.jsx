'use client'
import { useRef, useCallback, memo, useEffect } from 'react'
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

// One Dark Theme
const ONE_DARK = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'c678dd' },
    { token: 'string', foreground: '98c379' },
    { token: 'number', foreground: 'd19a66' },
    { token: 'type', foreground: 'e5c07b' },
    { token: 'function', foreground: '61afef' },
    { token: 'variable', foreground: 'abb2bf' },
    { token: 'operator', foreground: '56b6c2' },
  ],
  colors: {
    'editor.background': '#282c34',
    'editor.foreground': '#abb2bf',
    'editor.lineHighlightBackground': '#2c313a',
    'editor.selectionBackground': '#3e4451',
    'editorCursor.foreground': '#528bff',
    'editorLineNumber.foreground': '#4b5263',
  },
}

// Dracula Theme
const DRACULA = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'ff79c6' },
    { token: 'string', foreground: 'f1fa8c' },
    { token: 'number', foreground: 'bd93f9' },
    { token: 'type', foreground: '8be9fd' },
    { token: 'function', foreground: '50fa7b' },
    { token: 'variable', foreground: 'f8f8f2' },
    { token: 'operator', foreground: 'ffb86c' },
  ],
  colors: {
    'editor.background': '#282a36',
    'editor.foreground': '#f8f8f2',
    'editor.lineHighlightBackground': '#44475a',
    'editor.selectionBackground': '#44475a',
    'editorCursor.foreground': '#f8f8f0',
    'editorLineNumber.foreground': '#6272a4',
  },
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

export default memo(function MonacoEditorPanel({ code, language, onChange, onRun, theme = 'github-dark', height = '100%' }) {
  const editorRef = useRef(null)
  const monacoRef = useRef(null)

  const handleMount = useCallback((editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    monaco.editor.defineTheme('github-dark', GITHUB_DARK)
    monaco.editor.defineTheme('one-dark', ONE_DARK)
    monaco.editor.defineTheme('dracula', DRACULA)

    monaco.editor.setTheme(theme)

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRun?.())
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, (e) => {
      editor.getAction('editor.action.formatDocument')?.run()
    })

    editor.focus()
  }, [onRun, theme])

  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(theme)
    }
  }, [theme])

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
})
