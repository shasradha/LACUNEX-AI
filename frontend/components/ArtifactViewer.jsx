"use client";

import React, { useState, useEffect, useRef } from "react";

function IconCode() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconMaximize() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}

export default function ArtifactViewer({ code, onClose }) {
  const [view, setView] = useState("preview"); // 'preview' or 'code'
  const iframeRef = useRef(null);

  useEffect(() => {
    if (view === "preview" && iframeRef.current) {
        // Reset iframe nicely
        const doc = iframeRef.current.contentDocument;
        if (doc) {
            doc.open();
            // Wrap the code to ensure it scales nicely and matches our dark theme
            doc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { margin: 0; padding: 1rem; font-family: system-ui, sans-serif; background: #0f111a; color: #fff; }
                        /* Tailwind-like base reset */
                        *, *::before, *::after { box-sizing: border-box; }
                    </style>
                </head>
                <body>
                    ${code}
                </body>
                </html>
            `);
            doc.close();
        }
    }
  }, [code, view]);

  return (
    <div className="artifact-panel animate-enter">
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
        <button className="msg-action-btn" title="Expand (Coming Soon)">
          <IconMaximize />
        </button>
        <button className="msg-action-btn" title="Close" onClick={onClose} style={{ marginLeft: "4px" }}>
          <IconX />
        </button>
      </div>

      <div className="artifact-body">
        {view === "preview" ? (
          <iframe
            ref={iframeRef}
            title="Artifact Preview"
            sandbox="allow-scripts"
            className="artifact-iframe"
          />
        ) : (
          <pre className="artifact-code-view">
            <code>{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
