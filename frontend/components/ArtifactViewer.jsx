"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
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

/* ── Helpers ─────────────────────────────────────── */

/** Detect if code is a full HTML document or just a snippet */
function isFullHtmlDocument(code) {
  const trimmed = code.trim().toLowerCase();
  return trimmed.startsWith("<!doctype") || trimmed.startsWith("<html");
}

/** Wrap a partial snippet in a full HTML boilerplate */
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

/** Detect the language from code content for syntax highlighting */
function detectLanguage(code) {
  const trimmed = code.trim().toLowerCase();
  if (trimmed.startsWith("<!doctype") || trimmed.startsWith("<html") || trimmed.startsWith("<div") || trimmed.startsWith("<head")) return "html";
  if (trimmed.includes("function ") || trimmed.includes("const ") || trimmed.includes("import ")) return "javascript";
  if (trimmed.includes("{") && trimmed.includes(":") && trimmed.includes(";")) return "css";
  return "html";
}

/** Download a text blob as a file */
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
  const [view, setView] = useState("preview"); // 'preview' | 'code'
  const [copied, setCopied] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const iframeRef = useRef(null);
  const downloadMenuRef = useRef(null);

  // Render iframe content
  const renderPreview = useCallback(() => {
    if (!iframeRef.current || view !== "preview") return;
    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    const htmlContent = isFullHtmlDocument(code) ? code : wrapSnippet(code);

    doc.open();
    doc.write(htmlContent);
    doc.close();
  }, [code, view]);

  useEffect(() => {
    // Small delay to ensure iframe is mounted
    const timer = setTimeout(renderPreview, 50);
    return () => clearTimeout(timer);
  }, [renderPreview]);

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
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  const handleDownloadTxt = () => {
    downloadFile(code, "artifact-code.txt");
    setShowDownloadMenu(false);
  };

  const handleDownloadHtml = () => {
    const htmlContent = isFullHtmlDocument(code) ? code : wrapSnippet(code);
    downloadFile(htmlContent, "artifact.html");
    setShowDownloadMenu(false);
  };

  const lang = detectLanguage(code);

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
          title="Copy code"
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
            <div className="artifact-download-menu">
              <button onClick={handleDownloadTxt} className="artifact-download-item">
                <span className="artifact-dl-icon">.txt</span>
                <div>
                  <div className="artifact-dl-title">Plain Text</div>
                  <div className="artifact-dl-sub">Raw code as .txt</div>
                </div>
              </button>
              <button onClick={handleDownloadHtml} className="artifact-download-item">
                <span className="artifact-dl-icon" style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>.html</span>
                <div>
                  <div className="artifact-dl-title">HTML File</div>
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
            onClick={renderPreview}
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

      {/* ── Body ───────────────────────────────── */}
      <div className="artifact-body">
        {view === "preview" ? (
          <iframe
            ref={iframeRef}
            title="Artifact Preview"
            sandbox="allow-scripts allow-modals"
            className="artifact-iframe"
          />
        ) : (
          <div className="artifact-code-view">
            <SyntaxHighlighter
              language={lang}
              style={vscDarkPlus}
              showLineNumbers
              wrapLines
              lineNumberStyle={{ color: "#4a5568", minWidth: "3em", paddingRight: "1em", userSelect: "none" }}
              customStyle={{
                margin: 0,
                padding: "1.25rem",
                background: "transparent",
                fontSize: "0.85rem",
                lineHeight: "1.6",
                borderRadius: 0,
              }}
            >
              {code}
            </SyntaxHighlighter>
          </div>
        )}
      </div>
    </div>
  );
}
