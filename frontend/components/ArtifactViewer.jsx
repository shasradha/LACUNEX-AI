"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";

// Lazy load SyntaxHighlighter - it's heavy and causes freezing on mobile
const SyntaxHighlighter = dynamic(
  () => import("react-syntax-highlighter").then(mod => ({ default: mod.Prism })),
  { ssr: false, loading: () => <div style={{ padding: '1.25rem', color: '#8b949e', fontFamily: 'monospace', fontSize: '0.85rem' }}>Loading editor...</div> }
);
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

/* ── Icons ──────────────────────────────────────── */
function IconEye() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconCode() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

function IconFile() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

/* ── Helpers ─────────────────────────────────────── */

function wrapSnippet(code) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; padding: 1.5rem; font-family: system-ui, -apple-system, sans-serif; background: #0f111a; color: #e2e8f0; }
  </style>
</head>
<body>
${code}
</body>
</html>`;
}

function detectLanguage(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  if (ext === "html") return "html";
  if (ext === "css") return "css";
  if (ext === "js" || ext === "javascript") return "javascript";
  if (ext === "json") return "json";
  return "html";
}

function downloadFile(content, filename) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── Component ───────────────────────────────────── */
export default function ArtifactViewer({ code, onClose }) {

  const [activeFile, setActiveFile] = useState("");
  const [copied, setCopied] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const downloadMenuRef = useRef(null);

  const [localFiles, setLocalFiles] = useState({});
  const [debouncedFiles, setDebouncedFiles] = useState({});
  const editorRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Smart file-type extraction logic to detect if HTML preview is needed
  const isHtmlProject = useMemo(() => {
    if (typeof code === "object" && code.isMultiFile) {
      return Object.keys(code.files).some(n => detectLanguage(n) === "html");
    }
    return typeof code === "string" && code.toLowerCase().includes("<html");
  }, [code]);

  const [view, setView] = useState(isHtmlProject ? "preview" : "code");

  useEffect(() => {
    setView(isHtmlProject ? "preview" : "code");
  }, [isHtmlProject]);

  // Normalize code into a files object (init once or when external code completely changes)
  useEffect(() => {
    if (typeof code === "object" && code.isMultiFile) {
      setLocalFiles(code.files);
      setDebouncedFiles(code.files);
    } else {
      const content = typeof code === "object" ? "" : code;
      setLocalFiles({ "index.html": content });
      setDebouncedFiles({ "index.html": content });
    }
  }, [code]);

  // Debounce the code to prevent intense iframe reloading and thread blocking
  // Use longer debounce on mobile to prevent freezing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFiles(localFiles);
    }, isMobile ? 1000 : 500);
    return () => clearTimeout(timer);
  }, [localFiles, isMobile]);

  const files = localFiles;

  // Set initial active file
  useEffect(() => {
    if (!activeFile || !files[activeFile]) {
      const names = Object.keys(files);
      if (names.includes("index.html")) setActiveFile("index.html");
      else if (names.length > 0) setActiveFile(names[0]);
    }
  }, [files, activeFile]);

  // Build the unified srcdoc for preview using debounced files for performance
  const srcdocHtml = useMemo(() => {
    // Try index.html first, then any .html file, then first file as fallback
    let htmlFile = debouncedFiles["index.html"];
    if (!htmlFile) {
      const htmlKey = Object.keys(debouncedFiles).find(k => k.endsWith('.html'));
      if (htmlKey) htmlFile = debouncedFiles[htmlKey];
    }
    if (!htmlFile) {
      // Last resort: use the first file's content if it looks like HTML
      const firstKey = Object.keys(debouncedFiles)[0];
      const firstContent = firstKey ? debouncedFiles[firstKey] : "";
      if (firstContent && (firstContent.includes('<html') || firstContent.includes('<!DOCTYPE') || firstContent.includes('<body'))) {
        htmlFile = firstContent;
      }
    }
    if (!htmlFile) {
      // Wrap any content as HTML snippet for preview
      const firstKey = Object.keys(debouncedFiles)[0];
      if (firstKey) return wrapSnippet(`<pre>${debouncedFiles[firstKey]}</pre>`);
      return "<h3>No previewable content.</h3>";
    }

    let bundled = htmlFile;

    // Inject CSS
    Object.keys(debouncedFiles).forEach(name => {
      if (name.endsWith(".css")) {
        const cssContent = `<style>\n/* Injected from ${name} */\n${debouncedFiles[name]}\n</style>`;
        if (bundled.includes("</head>")) {
          bundled = bundled.replace("</head>", `${cssContent}\n</head>`);
        } else {
          bundled = cssContent + bundled;
        }
      }
    });

    // Inject JS
    Object.keys(debouncedFiles).forEach(name => {
      if (name.endsWith(".js")) {
        const jsContent = `<script>\n/* Injected from ${name} */\n${debouncedFiles[name]}\n</script>`;
        if (bundled.includes("</body>")) {
          bundled = bundled.replace("</body>", `${jsContent}\n</body>`);
        } else {
          bundled += `\n${jsContent}`;
        }
      }
    });

    // If it's just a snippet, wrap it
    if (!bundled.trim().toLowerCase().startsWith("<!doctype") && !bundled.trim().toLowerCase().startsWith("<html")) {
      bundled = wrapSnippet(bundled);
    }

    return bundled;
  }, [debouncedFiles]);

  // Close download menu on outside click
  useEffect(() => {
    function handleClick(e) {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target)) {
        setShowDownloadMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleCopy = async () => {
    const content = files[activeFile] || "";
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  const handleDownloadAll = () => {
    // For now, download the current active file
    downloadFile(files[activeFile], activeFile);
    setShowDownloadMenu(false);
  };

  const handleDownloadBundled = () => {
    downloadFile(srcdocHtml, "bundled-artifact.html");
    setShowDownloadMenu(false);
  };

  const currentLang = detectLanguage(activeFile);
  const fileNames = Object.keys(files);

  return (
    <div className="artifact-panel">
      {/* ── Header ─────────────────────────────── */}
      <div className="artifact-header">
        <div className="artifact-tabs">
          <button
            type="button"
            className={`artifact-tab ${view === "preview" ? "active" : ""}`}
            onClick={() => setView("preview")}
          >
            <IconEye /> Preview
          </button>
          <button
            type="button"
            className={`artifact-tab ${view === "code" ? "active" : ""}`}
            onClick={() => setView("code")}
          >
            <IconCode /> Code
          </button>
        </div>

        <div style={{ flex: 1 }} />

        {/* Copy */}
        <button
          className="artifact-action-btn"
          onClick={handleCopy}
          title="Copy current file"
        >
          {copied ? <><IconCheck /> <span>Copied</span></> : <><IconCopy /> <span>Copy</span></>}
        </button>

        {/* Download dropdown */}
        <div className="artifact-download-wrap" ref={downloadMenuRef}>
          <button
            className="artifact-action-btn"
            onClick={() => setShowDownloadMenu(v => !v)}
            title="Download"
          >
            <IconDownload /> <span>Download</span> <IconChevronDown />
          </button>
          {showDownloadMenu && (
            <div className="artifact-download-menu" style={{ zIndex: 99999 }}>
              <button onClick={handleDownloadAll} className="artifact-download-item">
                <span className="artifact-dl-icon">.{activeFile.split('.').pop()}</span>
                <div>
                  <div className="artifact-dl-title">Current File</div>
                  <div className="artifact-dl-sub">Download {activeFile}</div>
                </div>
              </button>
              <button onClick={handleDownloadBundled} className="artifact-download-item">
                <span className="artifact-dl-icon" style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>.html</span>
                <div>
                  <div className="artifact-dl-title">Bundled HTML</div>
                  <div className="artifact-dl-sub">Ready to run in browser</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Refresh */}
        {view === "preview" && (
          <button
            className="artifact-action-btn"
            onClick={() => setRefreshKey(k => k + 1)}
            title="Re-run preview"
          >
            <IconRefresh />
          </button>
        )}

        {/* Close */}
        <button
          className="artifact-action-btn artifact-close-btn"
          onClick={onClose}
          title="Close"
        >
          <IconX />
        </button>
      </div>

      {/* ── File Explorer (Only in Code view) ──── */}
      {view === "code" && fileNames.length > 1 && (
        <div 
          className="artifact-file-explorer" 
          style={{ 
            display: 'flex', 
            overflowX: 'auto', 
            whiteSpace: 'nowrap', 
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            paddingBottom: '2px'
          }}
          onWheel={(e) => {
            if (e.currentTarget) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
        >
          {fileNames.map(name => (
            <button
              key={name}
              className={`artifact-file-tab ${activeFile === name ? "active" : ""}`}
              onClick={() => setActiveFile(name)}
            >
              <IconFile />
              <span>{name}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Body ───────────────────────────────── */}
      <div className="artifact-body">
        {view === "preview" ? (
          <iframe
            key={refreshKey}
            title="Artifact Preview"
            srcDoc={srcdocHtml}
            sandbox="allow-scripts allow-modals"
            className="artifact-iframe"
            loading="lazy"
            style={isMobile ? { touchAction: 'pan-x pan-y', WebkitOverflowScrolling: 'touch' } : undefined}
          />
        ) : (
          <div className="artifact-code-view">
            <SyntaxHighlighter
              language={currentLang}
              style={vscDarkPlus}
              showLineNumbers={!isMobile}
              wrapLongLines={isMobile}
              lineNumberStyle={{ color: "#4a5568", minWidth: "3em", paddingRight: "1em", userSelect: "none" }}
              customStyle={{
                margin: 0,
                padding: "1.25rem",
                background: "transparent",
                fontSize: "0.85rem",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                lineHeight: "1.6",
                borderRadius: 0,
                minHeight: "100%",
              }}
            >
              {files[activeFile] || ""}
            </SyntaxHighlighter>
          </div>
        )}
      </div>

      {/* Mobile: Floating close button for easy access */}
      {isMobile && (
        <button
          className="artifact-mobile-close"
          onClick={onClose}
          aria-label="Close artifact"
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.9)',
            border: '2px solid rgba(255,255,255,0.2)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 100,
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <IconX />
        </button>
      )}
    </div>
  );
}
