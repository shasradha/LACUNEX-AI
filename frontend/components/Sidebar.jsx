"use client";

import { useMemo, useState, useEffect } from "react";

/* ── Inline icons ─────────────────────────────── */
function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M5 12h14"/><path d="M12 5v14"/>
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
    </svg>
  );
}

function IconChat() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/>
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    </svg>
  );
}

function formatAge(value) {
  if (!value) return "Just now";
  
  // Ensure "Z" is appended if it's a naive UTC timestamp from backend
  let valStr = String(value);
  if (!valStr.endsWith('Z') && !valStr.includes('+')) {
    valStr += 'Z';
  }

  const date = new Date(valStr);
  const diffMin = Math.round((Date.now() - date.getTime()) / 60000);
  
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)} hr`;
  if (diffMin < 2880) return "Yesterday";
  
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function Sidebar({
  conversations,
  activeId,
  collapsed,
  onDelete,
  onNew,
  onSelect,
  onToggle,
  onRename,
}) {
  const [query, setQuery] = useState("");
  const [, setTick] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  // Force re-render every minute so the relative times (e.g. "Just now" -> "1 min") automatically update
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000); // 30s
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, query]);

  return (
    <>
      {!collapsed && (
        <div className="sidebar-mobile-overlay" onClick={onToggle} aria-hidden="true" />
      )}
      <aside className={`sidebar-wrap ${collapsed ? "sidebar-collapsed" : ""}`}>
        <div className="sidebar-inner">
        <div className="sidebar-actions">
          <button type="button" onClick={onNew} className="btn btn-primary sidebar-new-btn">
            <IconPlus />
            {!collapsed && <span>New workspace</span>}
          </button>
          {!collapsed && (
            <button type="button" onClick={onToggle} className="btn btn-ghost" style={{ fontSize: "0.75rem", padding: "0.4rem 0.6rem" }}>
              Hide
            </button>
          )}
        </div>

        {!collapsed && (
          <div className="sidebar-search field-shell">
            <span className="input-icon"><IconSearch /></span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search workspaces"
              className="input-field input-with-icon"
              style={{ fontSize: "0.75rem", padding: "0.5rem 0.625rem 0.5rem 2.25rem" }}
            />
          </div>
        )}

        <div className="sidebar-list">
          {filtered.length === 0 ? (
            <div className="sidebar-empty">
              <IconChat />
              {!collapsed && <span>No workspaces yet</span>}
            </div>
          ) : (
            filtered.map((conversation) => {
              const active = conversation.id === activeId;
              return (
                <div
                  key={conversation.id}
                  role="button"
                  tabIndex={0}
                  className={`ws-item ${active ? "ws-item-active" : ""}`}
                  onClick={() => onSelect(conversation.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(conversation.id);
                    }
                  }}
                  title={collapsed ? conversation.title : undefined}
                >
                  <div className="ws-icon">
                    <IconChat />
                  </div>

                  {!collapsed && (
                    <>
                      <div className="ws-content">
                        <div className="ws-title">
                          <span
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setEditingId(conversation.id);
                              setEditValue(conversation.title);
                            }}
                            style={{ display: editingId === conversation.id ? 'none' : 'block' }}
                          >
                            {conversation.title}
                          </span>
                          {editingId === conversation.id && (
                            <input
                              autoFocus
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={() => {
                                if (editValue.trim() && editValue !== conversation.title && onRename) {
                                  onRename(conversation.id, editValue.trim());
                                }
                                setEditingId(null);
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  if (editValue.trim() && editValue !== conversation.title && onRename) {
                                    onRename(conversation.id, editValue.trim());
                                  }
                                  setEditingId(null);
                                }
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              className="workspace-rename-input"
                              style={{ width: '100%', background: 'transparent', border: '1px solid var(--border)', color: 'inherit', padding: '2px 4px', borderRadius: '4px' }}
                              onClick={e => e.stopPropagation()}
                            />
                          )}
                          {!editingId && (
                            <button
                              className="ws-edit-icon"
                              style={{ opacity: 0, padding: '0 4px', fontSize: '0.8rem', background: 'none', border: 'none', cursor: 'pointer', display: 'none' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(conversation.id);
                                setEditValue(conversation.title);
                              }}
                              title="Rename workspace"
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                        <div className="ws-meta">
                          <span className="ws-meta-item">
                            <IconClock />
                            {formatAge(conversation.updated_at)}
                          </span>
                          <span>{conversation.message_count || 0} msg</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="ws-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(conversation.id);
                        }}
                        aria-label={`Delete ${conversation.title}`}
                      >
                        <IconTrash />
                      </button>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
    </>
  );
}
