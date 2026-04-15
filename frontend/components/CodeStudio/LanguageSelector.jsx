'use client'
import { useState, useRef, useEffect } from 'react'

export default function LanguageSelector({ languages, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = languages.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="lang-selector" ref={ref}>
      <button className="lang-trigger" onClick={() => setOpen(o => !o)}>
        <span className="lang-icon">{selected.icon}</span>
        <span className="lang-name">{selected.name}</span>
        <span className="lang-chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="lang-dropdown">
          <input
            className="lang-search"
            placeholder="Search languages..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <div className="lang-list">
            {filtered.map(lang => (
              <button
                key={lang.id}
                className={`lang-option ${lang.id === selected.id ? 'active' : ''}`}
                onClick={() => { onChange(lang); setOpen(false); setSearch('') }}
              >
                <span>{lang.icon}</span>
                <span>{lang.name}</span>
                {lang.id === selected.id && <span className="lang-check">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
