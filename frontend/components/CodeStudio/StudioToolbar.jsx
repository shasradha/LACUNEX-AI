'use client'

export default function StudioToolbar({
  language,
  onLanguageChange,
  languages,
  layout,
  onLayoutChange,
  isFullscreen,
  onToggleFullscreen,
  onClose,
}) {
  return (
    <div className="studio-topbar">
      <div className="studio-title">
        <span className="studio-icon">⚡</span>
        <span>LACUNEX Code Studio</span>
      </div>

      <div className="studio-controls">
        {/* Layout toggles */}
        <div className="layout-toggle">
          <button
            className={layout === 'editor' ? 'active' : ''}
            onClick={() => onLayoutChange('editor')}
            title="Editor only"
          >⬜</button>
          <button
            className={layout === 'split' ? 'active' : ''}
            onClick={() => onLayoutChange('split')}
            title="Split view"
          >⬛</button>
          <button
            className={layout === 'output' ? 'active' : ''}
            onClick={() => onLayoutChange('output')}
            title="Output only"
          >▦</button>
        </div>

        <button
          className="fullscreen-btn"
          onClick={onToggleFullscreen}
          title="Toggle fullscreen (F11)"
        >
          {isFullscreen ? '⊡' : '⊞'}
        </button>

        {onClose && (
          <button className="close-btn" onClick={onClose}>✕</button>
        )}
      </div>
    </div>
  )
}
