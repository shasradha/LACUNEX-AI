"use client";

import React from "react";

function IconGlobe({ active }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ opacity: active ? 1 : 0.7 }}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

export default function SearchToggle({ enabled, onChange }) {
  return (
    <button
      type="button"
      className={`search-toggle ${enabled ? "search-toggle-active" : ""}`}
      onClick={() => onChange(!enabled)}
      title={enabled ? "Web Search: ON" : "Web Search: OFF"}
      aria-label="Toggle web search"
    >
      <IconGlobe active={enabled} />
      <span className="search-toggle-label">Search</span>
    </button>
  );
}
