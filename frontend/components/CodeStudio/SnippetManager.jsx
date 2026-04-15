'use client'
import { useState, useEffect, useRef } from 'react'

const IconFolder = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
const IconSave = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
const IconTrash = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
const IconX = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>

export default function SnippetManager({ code, language, onLoad }) {
  const [snippets, setSnippets] = useState([])
  const [show, setShow] = useState(false)
  const [name, setName] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    try { const s = localStorage.getItem('lacunex_snippets'); if (s) setSnippets(JSON.parse(s)) } catch {}
  }, [])

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const save = () => {
    if (!name.trim()) return
    const updated = [...snippets, { id: Date.now(), name: name.trim(), code, language: language.monaco, date: new Date().toLocaleDateString() }]
    setSnippets(updated)
    localStorage.setItem('lacunex_snippets', JSON.stringify(updated))
    setName('')
  }

  const remove = (id) => {
    const updated = snippets.filter(s => s.id !== id)
    setSnippets(updated)
    localStorage.setItem('lacunex_snippets', JSON.stringify(updated))
  }

  return (
    <div className="cs-snippets" ref={ref}>
      <button className="cs-tool-btn" onClick={() => setShow(!show)} title="Snippets">
        <IconFolder />
        <span>Snippets</span>
        {snippets.length > 0 && <span className="cs-snippet-count">{snippets.length}</span>}
      </button>

      {show && (
        <div className="cs-snippet-panel">
          <div className="cs-snippet-head">
            <span>Saved Snippets</span>
            <button onClick={() => setShow(false)}><IconX /></button>
          </div>
          <div className="cs-snippet-save">
            <input placeholder="Name..." value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} />
            <button onClick={save} disabled={!name.trim()}><IconSave /> Save</button>
          </div>
          <div className="cs-snippet-list">
            {snippets.length === 0 && <div className="cs-snippet-empty">No snippets saved yet</div>}
            {snippets.map(s => (
              <div key={s.id} className="cs-snippet-item">
                <button className="cs-snippet-load" onClick={() => { onLoad(s.code, s.language); setShow(false) }}>
                  <span className="cs-snippet-name">{s.name}</span>
                  <span className="cs-snippet-meta">{s.language}</span>
                </button>
                <button className="cs-snippet-del" onClick={() => remove(s.id)}><IconTrash /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
