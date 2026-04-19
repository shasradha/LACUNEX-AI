"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { getUser } from "@/lib/auth";

/* ── Inline SVG icons (Claude-style elegant strokes) ── */
function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M5 12h14"/><path d="M12 5v14"/>
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
    </svg>
  );
}

function IconChat() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/>
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    </svg>
  );
}

function IconStar() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}

function IconStarFilled() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}

function IconCode() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
    </svg>
  );
}

function IconFlow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  );
}

function IconChevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function IconHide() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>
    </svg>
  );
}

function IconMoreH() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
    </svg>
  );
}

function formatAge(value) {
  if (!value) return "Just now";
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

/* ── Starred workspaces localStorage helpers ── */
function getStarredIds() {
  try {
    return JSON.parse(localStorage.getItem('lacunex_starred') || '[]');
  } catch { return []; }
}
function setStarredIds(ids) {
  localStorage.setItem('lacunex_starred', JSON.stringify(ids));
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
  const [contextMenu, setContextMenu] = useState(null);
  const [starredIds, setStarredIdsState] = useState([]);
  const [starredExpanded, setStarredExpanded] = useState(true);
  const [recentsExpanded, setRecentsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'code-studio' | 'flow'
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  // Load starred IDs from localStorage
  useEffect(() => {
    setStarredIdsState(getStarredIds());
  }, []);

  // Force re-render every 30s for relative times
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Click outside menus to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenu) setContextMenu(null);
      if (showProfileMenu && profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [contextMenu, showProfileMenu]);

  const toggleStar = useCallback((id, e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    setStarredIdsState(prev => {
      const next = prev.includes(id)
        ? prev.filter(s => s !== id)
        : [...prev, id];
      setStarredIds(next);
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, query]);

  const starredConvos = useMemo(() =>
    filtered.filter(c => starredIds.includes(c.id)),
    [filtered, starredIds]
  );

  const recentConvos = useMemo(() =>
    filtered.filter(c => !starredIds.includes(c.id)),
    [filtered, starredIds]
  );

  const handleRenameAccount = () => {
    const current = getUser();
    const currentName = current?.name || 'User';
    const newName = prompt("Enter your new display name:", currentName);
    if (newName && newName.trim() && newName.trim() !== currentName) {
      try {
        const stored = JSON.parse(localStorage.getItem('lacunex_user') || '{}');
        stored.name = newName.trim();
        localStorage.setItem('lacunex_user', JSON.stringify(stored));
      } catch {
        localStorage.setItem('lacunex_user', JSON.stringify({ name: newName.trim() }));
      }
      window.location.reload();
    }
    setShowProfileMenu(false);
  };

  const handleDeleteFullAccount = async () => {
    if (confirm("🚨 DANGER: This will permanently delete your account, fresh start your email, and erase ALL chats. This CANNOT be undone! Are you sure?")) {
      const confirmation = prompt("Type 'DELETE' to confirm account deletion:");
      if (confirmation === 'DELETE') {
        try {
          const { deleteAccount } = await import('@/lib/api');
          await deleteAccount();
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = '/login';
        } catch (e) {
          alert('Failed to delete account: ' + (e.message || 'Unknown error'));
        }
      }
    }
    setShowProfileMenu(false);
  };

  const handleDeleteAllWorkspaces = () => {
    if (!conversations || conversations.length === 0) {
      alert("No workspaces to delete.");
      setShowProfileMenu(false);
      return;
    }
    if (confirm(`Delete ALL ${conversations.length} workspaces? This cannot be undone.`)) {
      conversations.forEach(c => onDelete(c.id));
    }
    setShowProfileMenu(false);
  };

  const handleResetSession = () => {
    if (confirm("This will clear your local session and log you out. Continue?")) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    }
    setShowProfileMenu(false);
  };

  const user = getUser();
  const userName = user?.name || "User";

  const userInitials = userName.slice(0, 2).toUpperCase();

  /* ── Render a workspace item ── */
  const renderWorkspaceItem = (conversation, isStarred) => {
    const active = conversation.id === activeId;
    return (
      <div
        key={conversation.id}
        role="button"
        tabIndex={0}
        className={`sb-ws-item ${active ? "sb-ws-item-active" : ""}`}
        onClick={() => onSelect(conversation.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            id: conversation.id,
            title: conversation.title,
            starred: starredIds.includes(conversation.id)
          });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(conversation.id);
          }
        }}
        title={collapsed ? conversation.title : undefined}
      >
        <div className="sb-ws-icon">
          <IconChat />
        </div>

        {!collapsed && (
          <>
            <div className="sb-ws-content">
              <div className="sb-ws-title">
                {editingId === conversation.id ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={() => {
                      const finalValue = editValue.trim();
                      if (finalValue && finalValue !== conversation.title && onRename) {
                        onRename(conversation.id, finalValue);
                      }
                      setEditingId(null);
                    }}
                    onKeyDown={e => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.target.blur(); // Trigger onBlur to handle save
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        setEditValue(conversation.title); // Revert value
                        e.target.blur(); // Trigger onBlur, won't save since it matches
                      }
                    }}
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => e.stopPropagation()}
                    onDoubleClick={e => e.stopPropagation()}
                    className="sb-rename-input"
                  />
                ) : (
                  <span
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditingId(conversation.id);
                      setEditValue(conversation.title);
                    }}
                  >
                    {conversation.title}
                  </span>
                )}
              </div>
              <div className="sb-ws-meta">
                <span className="sb-ws-meta-item">
                  <IconClock />
                  {formatAge(conversation.updated_at)}
                </span>
                <span>{conversation.message_count || 0} msg</span>
              </div>
            </div>

            <div className="sb-ws-actions">
              <button
                type="button"
                className={`sb-ws-star-btn ${isStarred ? 'starred' : ''}`}
                onClick={(e) => toggleStar(conversation.id, e)}
                onPointerDown={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                aria-label={isStarred ? "Unstar" : "Star"}
              >
                {isStarred ? <IconStarFilled /> : <IconStar />}
              </button>
              <button
                type="button"
                className="sb-ws-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conversation.id);
                }}
                aria-label={`Delete ${conversation.title}`}
              >
                <IconTrash />
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      {!collapsed && (
        <div className="sb-mobile-overlay" onClick={onToggle} aria-hidden="true" />
      )}
      <aside className={`sb-wrap ${collapsed ? "sb-collapsed" : ""}`}>
        <div className="sb-inner" onContextMenu={e => e.preventDefault()}>
          {/* ── Top: Brand Header ── */}
          <div className="sb-header">
            <div className="sb-brand">
              <div className="sb-brand-badge">L</div>
              {!collapsed && (
                <div className="sb-brand-text">
                  <span className="sb-brand-name">LACUNEX</span>
                  <span className="sb-brand-tagline">AI Assistant</span>
                </div>
              )}
            </div>
            {!collapsed && (
              <button type="button" onClick={onToggle} className="sb-hide-btn" title="Collapse sidebar">
                <IconHide />
              </button>
            )}
          </div>

          {/* ── New workspace button ── */}
          <div className="sb-new-section">
            <button type="button" onClick={onNew} className="sb-new-btn">
              <IconPlus />
              {!collapsed && <span>New workspace</span>}
            </button>
          </div>

          {/* ── Search ── */}
          {!collapsed && (
            <div className="sb-search-wrap">
              <span className="sb-search-icon"><IconSearch /></span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search workspaces..."
                className="sb-search-input"
              />
            </div>
          )}

          {/* ── Main App Navigation (Claude-Style) ── */}
          {!collapsed && (
            <div className="sb-main-nav">
              <button
                className={`sb-nav-btn ${activeTab === 'chats' ? 'active' : ''}`}
                onClick={() => setActiveTab('chats')}
              >
                <div className="sb-nav-btn-icon"><IconChat /></div>
                <span>Chats</span>
              </button>
              <button
                className={`sb-nav-btn ${activeTab === 'code-studio' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('code-studio');
                  window.dispatchEvent(new CustomEvent('lacunex_open_codestudio'));
                }}
              >
                <div className="sb-nav-btn-icon" style={{color: '#a855f7'}}><IconCode /></div>
                <span>Code Studio</span>
              </button>
              <button
                className={`sb-nav-btn ${activeTab === 'flow' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('flow');
                  window.dispatchEvent(new CustomEvent('lacunex_open_flow'));
                }}
              >
                <div className="sb-nav-btn-icon" style={{color: '#06b6d4'}}><IconFlow /></div>
                <span>Lacunex Flow</span>
              </button>
            </div>
          )}

          {/* ── Workspace List ── */}
          <div className="sb-workspace-list">
            {activeTab === 'chats' && (
              <>
                {filtered.length === 0 ? (
                  <div className="sb-empty-state">
                    <IconChat />
                    {!collapsed && <span>No workspaces yet</span>}
                  </div>
                ) : (
                  <>
                    {/* Starred Section */}
                    {starredConvos.length > 0 && (
                      <div className="sb-section">
                        {!collapsed && (
                          <button
                            className="sb-section-header"
                            onClick={() => setStarredExpanded(!starredExpanded)}
                          >
                            <div className="sb-section-label">
                              <IconStarFilled />
                              <span>Starred</span>
                            </div>
                            <span className={`sb-section-chevron ${starredExpanded ? 'expanded' : ''}`}>
                              <IconChevron />
                            </span>
                          </button>
                        )}
                        {starredExpanded && (
                          <div className="sb-section-items">
                            {starredConvos.map(c => renderWorkspaceItem(c, true))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Recents Section */}
                    <div className="sb-section">
                      {!collapsed && starredConvos.length > 0 && (
                        <button
                          className="sb-section-header"
                          onClick={() => setRecentsExpanded(!recentsExpanded)}
                        >
                          <div className="sb-section-label">
                            <IconClock />
                            <span>Recents</span>
                          </div>
                          <span className={`sb-section-chevron ${recentsExpanded ? 'expanded' : ''}`}>
                            <IconChevron />
                          </span>
                        </button>
                      )}
                      {recentsExpanded && (
                        <div className="sb-section-items">
                          {(starredConvos.length > 0 ? recentConvos : filtered).map(c =>
                            renderWorkspaceItem(c, starredIds.includes(c.id))
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {activeTab === 'code-studio' && !collapsed && (
              <div className="sb-tab-content">
                <div className="sb-tab-hero">
                  <div className="sb-tab-hero-icon code-studio-icon">
                    <IconCode />
                  </div>
                  <h3>Online Code Studio</h3>
                  <p>Write, run, and debug code in 10+ languages with a professional editor experience.</p>
                  <button
                    className="sb-tab-action-btn"
                    onClick={() => window.dispatchEvent(new CustomEvent('lacunex_open_codestudio'))}
                  >
                    <IconCode />
                    <span>Open Code Studio</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'flow' && !collapsed && (
              <div className="sb-tab-content">
                <div className="sb-tab-hero">
                  <div className="sb-tab-hero-icon flow-icon">
                    <IconFlow />
                  </div>
                  <h3>Lacunex Flow</h3>
                  <p>Build visual AI pipelines with drag-and-drop nodes. Chain prompts, tools, and logic together.</p>
                  <button
                    className="sb-tab-action-btn flow-btn"
                    onClick={() => window.dispatchEvent(new CustomEvent('lacunex_open_flow'))}
                  >
                    <IconFlow />
                    <span>Open Flow Canvas</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Bottom User Profile Card ── */}
          {!collapsed && (
            <div className="sb-user-profile" ref={profileMenuRef}>
              <div className="sb-user-avatar">
                <span>{userInitials}</span>
              </div>
              <div className="sb-user-info">
                <span className="sb-user-name">{userName}</span>
                <span className="sb-user-status">
                  <span className="sb-status-dot"></span>
                  Online
                </span>
              </div>
              <button 
                className={`sb-user-more ${showProfileMenu ? 'active' : ''}`} 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                title="Account Settings"
              >
                <IconMoreH />
              </button>

              {showProfileMenu && (
                <div className="sb-profile-dropdown">
                  <button className="sb-dropdown-item" onClick={handleRenameAccount}>
                    <IconUser />
                    <span>Change Name</span>
                  </button>
                  <div className="sb-dropdown-divider" />
                  <button className="sb-dropdown-item danger" onClick={handleDeleteAllWorkspaces}>
                    <IconTrash />
                    <span>Delete All Workspaces</span>
                  </button>
                  <button className="sb-dropdown-item danger" onClick={handleDeleteFullAccount}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
                      <line x1="15" y1="9" x2="9" y2="15"></line>
                      <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                    <span>Permanently Delete Account</span>
                  </button>
                  <div className="sb-dropdown-divider" />
                  <button className="sb-dropdown-item danger" onClick={handleResetSession}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>
                    </svg>
                    <span>Reset Session &amp; Logout</span>
                  </button>
                </div>
              )}
            </div>
          )}
          {collapsed && (
            <div className="sb-user-profile-collapsed">
              <div className="sb-user-avatar-sm">
                <span>{userInitials}</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Context Menu ── */}
      {contextMenu && (
        <div
          className="sb-context-menu"
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 9999,
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div
            className="sb-context-item"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setEditingId(contextMenu.id);
              setEditValue(contextMenu.title);
              setContextMenu(null);
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            </svg>
            Rename
          </div>
          <div
            className="sb-context-item"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              toggleStar(contextMenu.id);
              setContextMenu(null);
            }}
          >
            {contextMenu.starred ? <IconStarFilled /> : <IconStar />}
            {contextMenu.starred ? 'Unstar' : 'Star'}
          </div>
          <div className="sb-context-divider" />
          <div
            className="sb-context-item sb-context-danger"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onDelete(contextMenu.id);
              setContextMenu(null);
            }}
          >
            <IconTrash />
            Delete
          </div>
        </div>
      )}
    </>
  );
}
