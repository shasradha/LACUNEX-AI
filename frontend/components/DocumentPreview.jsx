"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { exportDocument, exportDocumentAll } from "@/lib/api";

/* ── Icons ─────────────────────────────────────── */
function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.22-8.56" strokeLinecap="round"/>
    </svg>
  );
}

function IconFileText() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
      <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
      <path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>
    </svg>
  );
}

function IconPackage() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
      <path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
    </svg>
  );
}

const THEMES = [
  { id: "professional", name: "Professional", color: "#2563eb" },
  { id: "dark", name: "Dark", color: "#a78bfa" },
  { id: "minimal", name: "Minimal", color: "#374151" },
];

export default function DocumentPreview({
  documentJson,
  documentHtml,
  docProgress,
  docToc,
  isGenerating,
  onClose,
  onThemeChange,
  currentTheme = "professional",
}) {
  const [theme, setTheme] = useState(currentTheme);
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState(null);
  const [showToc, setShowToc] = useState(true);
  const previewRef = useRef(null);
  const contentRef = useRef(null);

  // Sync theme with parent
  useEffect(() => {
    setTheme(currentTheme);
  }, [currentTheme]);

  const handleThemeChange = useCallback((newTheme) => {
    setTheme(newTheme);
    onThemeChange?.(newTheme);
  }, [onThemeChange]);

  // Auto-scroll to bottom during generation
  useEffect(() => {
    if (isGenerating && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [documentHtml, isGenerating]);

  const handleExport = useCallback(async (format) => {
    if (!documentJson || isExporting) return;
    setIsExporting(true);
    setExportingFormat(format);
    try {
      await exportDocument(documentJson, theme, format);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  }, [documentJson, theme, isExporting]);

  const handleExportAll = useCallback(async () => {
    if (!documentJson || isExporting) return;
    setIsExporting(true);
    setExportingFormat("all");
    try {
      await exportDocumentAll(documentJson, theme);
    } catch (err) {
      console.error("Export all failed:", err);
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  }, [documentJson, theme, isExporting]);

  // Parse TOC from docToc event
  const tocItems = (() => {
    if (!docToc) return [];
    try {
      const parsed = typeof docToc === "string" ? JSON.parse(docToc) : docToc;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  const progress = docProgress || {};
  const progressPercent = progress.total
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <div className="doc-preview-panel" ref={previewRef}>
      {/* Header */}
      <div className="doc-preview-header">
        <div className="doc-preview-header-left">
          <IconFileText />
          <span className="doc-preview-title">Document Preview</span>
          {isGenerating && (
            <span className="doc-preview-badge doc-preview-badge-generating">
              <IconSpinner /> Generating
            </span>
          )}
          {!isGenerating && documentJson && (
            <span className="doc-preview-badge doc-preview-badge-ready">
              Ready
            </span>
          )}
        </div>
        <div className="doc-preview-header-right">
          <button className="doc-preview-close" onClick={onClose} title="Close preview">
            <IconX />
          </button>
        </div>
      </div>

      {/* Theme Switcher */}
      <div className="doc-theme-bar">
        <div className="doc-theme-switcher">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`doc-theme-pill ${theme === t.id ? "doc-theme-pill-active" : ""}`}
              onClick={() => handleThemeChange(t.id)}
              style={{ "--theme-accent": t.color }}
            >
              <span className="doc-theme-dot" style={{ background: t.color }} />
              {t.name}
            </button>
          ))}
        </div>

        {/* Export Actions */}
        <div className="doc-export-actions">
          <button
            className="doc-export-btn doc-export-btn-pdf"
            onClick={() => handleExport("pdf")}
            disabled={!documentJson || isExporting}
            title="Export as PDF"
          >
            {exportingFormat === "pdf" ? <IconSpinner /> : <IconDownload />}
            PDF
          </button>
          <button
            className="doc-export-btn doc-export-btn-docx"
            onClick={() => handleExport("docx")}
            disabled={!documentJson || isExporting}
            title="Export as DOCX"
          >
            {exportingFormat === "docx" ? <IconSpinner /> : <IconDownload />}
            DOCX
          </button>
          <button
            className="doc-export-btn doc-export-btn-xlsx"
            onClick={() => handleExport("xlsx")}
            disabled={!documentJson || isExporting}
            title="Export as XLSX"
          >
            {exportingFormat === "xlsx" ? <IconSpinner /> : <IconDownload />}
            XLSX
          </button>
          <button
            className="doc-export-all-btn"
            onClick={handleExportAll}
            disabled={!documentJson || isExporting}
            title="Export all formats (ZIP)"
          >
            {exportingFormat === "all" ? <IconSpinner /> : <IconPackage />}
            Export All
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {isGenerating && progress.total > 0 && (
        <div className="doc-progress-bar-wrap">
          <div className="doc-progress-bar">
            <div
              className="doc-progress-bar-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="doc-progress-label">
            <span>{progress.content || "Generating..."}</span>
            <span className="doc-progress-count">
              {progress.current}/{progress.total}
            </span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="doc-preview-body" ref={contentRef}>
        {/* TOC Sidebar */}
        {tocItems.length > 0 && showToc && (
          <div className="doc-preview-toc-sidebar">
            <div className="doc-toc-sidebar-header">
              <span>Contents</span>
              <button className="doc-toc-toggle" onClick={() => setShowToc(false)}>×</button>
            </div>
            <ul className="doc-toc-sidebar-list">
              {tocItems.map((item, idx) => (
                <li key={idx} className="doc-toc-sidebar-item">
                  <span className="doc-toc-sidebar-num">{idx + 1}</span>
                  <span className="doc-toc-sidebar-text">{item.title}</span>
                  {isGenerating && progress.current === idx + 1 && (
                    <span className="doc-toc-sidebar-active">
                      <IconSpinner />
                    </span>
                  )}
                  {!isGenerating || progress.current > idx + 1 ? (
                    <span className="doc-toc-sidebar-check">✓</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Document Render */}
        <div className={`doc-preview-render ${showToc && tocItems.length > 0 ? "doc-preview-render-with-toc" : ""}`}>
          {documentHtml ? (
            <div
              className={`doc-rendered-content doc-theme-${theme}`}
              dangerouslySetInnerHTML={{ __html: documentHtml }}
            />
          ) : (
            <div className="doc-preview-empty">
              {isGenerating ? (
                <>
                  <div className="doc-preview-empty-icon">
                    <IconSpinner />
                  </div>
                  <p>Generating document...</p>
                  <p className="doc-preview-empty-sub">
                    {progress.content || "Planning document structure..."}
                  </p>
                </>
              ) : (
                <>
                  <div className="doc-preview-empty-icon">
                    <IconFileText />
                  </div>
                  <p>No document generated yet</p>
                  <p className="doc-preview-empty-sub">
                    Ask LACUNEX to &quot;make detailed notes&quot; or &quot;write a complete guide&quot; to activate MAX OUTPUT MODE
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
