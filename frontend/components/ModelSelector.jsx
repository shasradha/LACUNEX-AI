"use client";

import React, { useState, useEffect, useRef } from "react";

export default function ModelSelector({ provider, model, onSelect, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [catalog, setCatalog] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch("http://localhost:8000/api/models");
        if (res.ok) {
          const data = await res.json();
          setCatalog(data);
        }
      } catch (err) {
        console.error("Failed to fetch models:", err);
      }
    }
    fetchModels();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!catalog) return <div className="model-library-trigger">Loading models...</div>;

  // Find current model label and icon
  const currentGroup = catalog[provider] || Object.values(catalog)[0];
  const currentModelObj = currentGroup?.models.find((m) => m.id === model) || currentGroup?.models[0];
  const currentName = currentModelObj?.name || "Select Model";
  const currentIcon = currentGroup?.icon || "?";

  // Filter models based on search
  const filteredGroups = Object.entries(catalog).map(([pId, group]) => {
    const matchedModels = group.models.filter(m => 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return { ...group, id: pId, models: matchedModels };
  }).filter(group => group.models.length > 0);

  return (
    <div className="model-library-container" ref={menuRef}>
      <button
        type="button"
        className={`model-library-trigger ${isOpen ? "is-open" : ""}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <div className="trigger-icon" style={{ background: (currentModelObj?.logo || currentGroup?.logo) ? "transparent" : currentGroup?.color }}>
          {(currentModelObj?.logo || currentGroup?.logo) ? (
            <img src={currentModelObj?.logo || currentGroup?.logo} alt="" className="provider-logo" />
          ) : (
            currentIcon
          )}
        </div>
        <span className="trigger-name">{currentName}</span>
        <svg className="trigger-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>

      {isOpen && (
        <div className="model-library-menu">
          <div className="model-menu-search">
            <div className="search-input-wrap">
              <svg className="search-icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Search models..."
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="model-menu-list">
            {filteredGroups.map((group) => (
              <div key={group.id} className="model-group">
                <div className="model-group-title">{group.name}</div>
                {group.models.map((m) => (
                  <button
                    key={`${group.id}:${m.id}`}
                    type="button"
                    className={`model-item ${provider === group.id && model === m.id ? "is-selected" : ""}`}
                    onClick={() => {
                      onSelect(group.id, m.id);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                  >
                    <div className="model-item-icon" style={{ color: group.color, border: `1px solid ${group.color}33`, background: (m.logo || group.logo) ? "rgba(255,255,255,0.03)" : undefined }}>
                      {(m.logo || group.logo) ? (
                        <img src={m.logo || group.logo} alt="" className="provider-logo-sm" />
                      ) : (
                        group.icon
                      )}
                    </div>
                    <div className="model-item-content">
                      <div className="model-item-name">{m.name}</div>
                      <div className="model-item-tags">
                        {m.tags?.map((tag) => (
                          <span key={tag} className={`model-badge badge-${tag}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ))}
            {filteredGroups.length === 0 && (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-tertiary)", fontSize: "0.8125rem" }}>
                No models found matching "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
