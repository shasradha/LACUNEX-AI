'use client'
import { useRef } from 'react'
import Editor from '@monaco-editor/react'

const MONACO_OPTIONS = {
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
  fontLigatures: true,
  lineNumbers: 'on',
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  wordWrap: 'on',
  padding: { top: 16, bottom: 16 },
  smoothScrolling: true,
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: 'on',
  renderLineHighlight: 'all',
  bracketPairColorization: { enabled: true },
  guides: {
    bracketPairs: true,
    indentation: true,
  },
  suggest: {
    showKeywords: true,
    showSnippets: true,
  },
  quickSuggestions: true,
  formatOnPaste: true,
  formatOnType: true,
  overviewRulerBorder: false,
  hideCursorInOverviewRuler: true,
  glyphMargin: false,
  folding: true,
  lineDecorationsWidth: 0,
  lineNumbersMinChars: 3,
}

export default function MonacoEditorPanel({
  code,
  language,
  onChange,
  onRun,
  readOnly = false,
  height = '100%',
}) {
  const editorRef = useRef(null)
  const monacoRef = useRef(null)

  const handleMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    // Ctrl+Enter → Run
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => onRun?.()
    )

    // Ctrl+S → Format + Run
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      () => {
        editor.getAction('editor.action.formatDocument')?.run()
        setTimeout(() => onRun?.(), 300)
      }
    )

    // Define LACUNEX custom dark theme
    monaco.editor.defineTheme('lacunex-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A737D', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'FF79C6' },
        { token: 'string', foreground: 'F1FA8C' },
        { token: 'number', foreground: 'BD93F9' },
        { token: 'type', foreground: '8BE9FD' },
        { token: 'function', foreground: '50FA7B' },
        { token: 'variable', foreground: 'F8F8F2' },
        { token: 'operator', foreground: 'FF79C6' },
      ],
      colors: {
        'editor.background': '#0a0a1e',
        'editor.foreground': '#f8f8f2',
        'editor.lineHighlightBackground': '#ffffff08',
        'editor.selectionBackground': '#00d4ff22',
        'editor.inactiveSelectionBackground': '#00d4ff11',
        'editorLineNumber.foreground': '#3d3d5c',
        'editorLineNumber.activeForeground': '#00d4ff',
        'editorCursor.foreground': '#00d4ff',
        'editorIndentGuide.background': '#ffffff0a',
        'editorIndentGuide.activeBackground': '#00d4ff33',
        'editor.findMatchBackground': '#00d4ff33',
        'editorBracketMatch.background': '#00d4ff22',
        'editorBracketMatch.border': '#00d4ff',
        'scrollbarSlider.background': '#00d4ff15',
        'scrollbarSlider.hoverBackground': '#00d4ff30',
        'scrollbarSlider.activeBackground': '#00d4ff50',
      },
    })
    monaco.editor.setTheme('lacunex-dark')

    // Focus editor
    editor.focus()
  }

  return (
    <div className="monaco-wrapper" style={{ height, position: 'relative' }}>
      <Editor
        height={height}
        language={language}
        value={code}
        onChange={onChange}
        onMount={handleMount}
        options={{ ...MONACO_OPTIONS, readOnly }}
        loading={
          <div className="monaco-loading">
            <div className="monaco-spinner"/>
            <span>Loading editor...</span>
          </div>
        }
      />
    </div>
  )
}
