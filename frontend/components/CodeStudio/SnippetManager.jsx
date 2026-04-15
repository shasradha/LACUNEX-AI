'use client'
import { useState, useEffect } from 'react'

export default function SnippetManager({ code, language, onLoad }) {
  const [snippets, setSnippets] = useState([])
  const [show, setShow] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('lacunex_snippets')
    if (saved) setSnippets(JSON.parse(saved))
  }, [])

  const saveSnippet = () => {
    if (!name.trim()) return
    const newSnippet = {
      id: Date.now(),
      name: name.trim(),
      code,
      language: language.monaco,
      date: new Date().toLocaleDateString(),
    }
    const updated = [...snippets, newSnippet]
    setSnippets(updated)
    localStorage.setItem('lacunex_snippets', JSON.stringify(updated))
    setName('')
  }

  const deleteSnippet = (id) => {
    const updated = snippets.filter(s => s.id !== id)
    setSnippets(updated)
    localStorage.setItem('lacunex_snippets', JSON.stringify(updated))
  }

  return (
    <div className="snippet-manager">
      <button className="action-btn" onClick={() => setShow(!show)}>
        📁 Snippets ({snippets.length})
      </button>

      {show && (
        <div className="snippet-modal glass-panel">
          <div className="snippet-header">
            <h3>Saved Snippets</h3>
            <button onClick={() => setShow(false)}>✕</button>
          </div>

          <div className="snippet-save-row">
            <input
              placeholder="Snippet name..."
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <button onClick={saveSnippet}>Save</button>
          </div>

          <div className="snippet-list">
            {snippets.length === 0 && <p className="empty-hint">No saved snippets yet.</p>}
            {snippets.map(s => (
              <div key={s.id} className="snippet-item">
                <div className="snippet-info">
                  <span className="s-name">{s.name}</span>
                  <span className="s-meta">{s.language} · {s.date}</span>
                </div>
                <div className="snippet-actions">
                  <button onClick={() => { onLoad(s.code, s.language); setShow(false) }}>Load</button>
                  <button className="delete" onClick={() => deleteSnippet(s.id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
