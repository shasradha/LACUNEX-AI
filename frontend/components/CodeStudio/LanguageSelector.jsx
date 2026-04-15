'use client'
import { useState, useRef, useEffect } from 'react'

const IconChevron = ({ open }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

export default function LanguageSelector({ languages, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = languages.filter(l => l.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="cs-lang-selector" ref={ref}>
      <button className="cs-lang-trigger" onClick={() => setOpen(o => !o)}>
        <span className="cs-lang-dot" />
        <span>{selected.name}</span>
        <IconChevron open={open} />
      </button>

      {open && (
        <div className="cs-lang-dropdown">
          <input
            className="cs-lang-search"
            placeholder="Filter..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <div className="cs-lang-list">
            {filtered.map(lang => (
              <button
                key={lang.id}
                className={`cs-lang-option ${lang.id === selected.id ? 'active' : ''}`}
                onClick={() => { onChange(lang); setOpen(false); setSearch('') }}
              >
                <span>{lang.name}</span>
                {lang.id === selected.id && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
