/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef } from "react";

function IconImagePlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 5h6"/><path d="M19 2v6"/><path d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/><circle cx="9" cy="9" r="2"/>
    </svg>
  );
}

function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}

export default function ImageUpload({ onClear, onSelect, preview }) {
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const [file] = e.target.files || [];
    if (file) onSelect(file);
    e.target.value = "";
  };

  if (preview) {
    return (
      <div className="img-preview-card">
        <img src={preview} alt="Selected" className="img-preview-thumb" />
        <div className="img-preview-info">
          <p className="img-preview-title">Image attached</p>
          <p className="img-preview-subtitle">Ready for analysis</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="img-preview-remove"
          aria-label="Remove image"
        >
          <IconX />
        </button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        style={{ display: "none" }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="img-upload-btn"
        aria-label="Upload image"
      >
        <IconImagePlus />
      </button>
    </>
  );
}
