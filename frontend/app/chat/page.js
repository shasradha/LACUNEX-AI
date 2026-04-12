"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import ChatBox from "@/components/ChatBox";
import FlowCanvas from "@/components/FlowCanvas";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { AuthError, deleteConversation, getConversations, pingServer } from "@/lib/api";
import { clearAuth, getToken } from "@/lib/auth";

function IconSpinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin" style={{ color: "#a855f7" }}>
      <path d="M21 12a9 9 0 1 1-6.22-8.56" strokeLinecap="round"/>
    </svg>
  );
}

function IconWarning() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>
    </svg>
  );
}

function IconGithub() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

function IconHeart() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}

function CopyrightFooter() {
  return (
    <footer className="copyright-footer">
      <span>Made with</span>
      <span className="copyright-heart"><IconHeart /></span>
      <span>by</span>
      <a
        href="https://github.com/shasradha"
        target="_blank"
        rel="noopener noreferrer"
        className="copyright-link"
      >
        <IconGithub />
        Shasradha Karmakar
      </a>
    </footer>
  );
}

export default function ChatPage() {
  const router = useRouter();

  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [bootState, setBootState] = useState("booting");
  const [error, setError] = useState("");
  const [resetToken, setResetToken] = useState(0);
  const [viewMode, setViewMode] = useState("chat"); // "chat" | "flow"

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      setSidebarCollapsed(true);
    }
  }, []);

  const handleAuthExpired = useCallback(() => {
    clearAuth();
    router.replace("/login?reason=session-expired");
  }, [router]);

  const loadConversations = useCallback(
    async ({ selectConversationId } = {}) => {
      try {
        const items = await getConversations();
        setConversations(items);
        setActiveId((current) => {
          if (selectConversationId && items.some((i) => i.id === selectConversationId)) {
            return selectConversationId;
          }
          if (current && items.some((i) => i.id === current)) {
            return current;
          }
          return null;
        });
        setError("");
        setBootState("ready");
      } catch (err) {
        if (err instanceof AuthError) { handleAuthExpired(); return; }
        setBootState("error");
        setError(err.message || "Unable to load workspaces.");
      }
    },
    [handleAuthExpired]
  );

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    const t = setTimeout(() => loadConversations(), 0);
    
    // Safety: if boot takes more than 12s, force into ready state
    const bootSafety = setTimeout(() => {
      setBootState((prev) => {
        if (prev === "booting") {
          setError("Server is waking up — refresh to try again.");
          return "ready";
        }
        return prev;
      });
    }, 12000);

    // Keep-alive: ping server every 4 minutes (Render sleep timeout is usually 5-15 mins)
    const pingInterval = setInterval(() => {
      pingServer().catch(() => {}); // Silent ignore
    }, 4 * 60 * 1000);
    
    return () => { 
      clearTimeout(t); 
      clearTimeout(bootSafety); 
      clearInterval(pingInterval);
    };
  }, [loadConversations, router]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [activeId, conversations]
  );

  const handleNew = useCallback(() => {
    setActiveId(null);
    setResetToken((c) => c + 1);
    setError("");
  }, []);

  const handleDelete = useCallback(
    async (id) => {
      try {
        await deleteConversation(id);
        if (activeId === id) {
          setActiveId(null);
          setResetToken((c) => c + 1);
        }
        await loadConversations();
      } catch (err) {
        if (err instanceof AuthError) { handleAuthExpired(); return; }
        setError(err.message || "Unable to delete workspace.");
      }
    },
    [activeId, handleAuthExpired, loadConversations]
  );

  const handleRename = useCallback(
    async (id, newTitle) => {
      try {
        setConversations(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
        const { updateConversationTitle } = await import("@/lib/api");
        await updateConversationTitle(id, newTitle);
      } catch (err) {
        if (err instanceof AuthError) { handleAuthExpired(); return; }
        setError(err.message || "Unable to rename workspace.");
      }
    },
    [handleAuthExpired]
  );

  /* ── Boot screen (Initial Load) ──────────────── */
  if (bootState === "booting") {
    return (
      <div className="boot-screen animate-enter">
        <div className="glass-panel boot-card">
          <div className="brand-badge brand-badge-sm animate-glow">L</div>
          <div style={{ flex: 1 }}>
            <p className="eyebrow" style={{ margin: 0, opacity: 0.6 }}>Initializing</p>
            <h1 className="heading-md" style={{ margin: "0 0 4px" }}>LACUNEX AI</h1>
            <p className="text-xs" style={{ opacity: 0.4 }}>Connecting to secure neural network...</p>
          </div>
          <IconSpinner />
        </div>
      </div>
    );
  }

  /* ── Main layout ─────────────────────────────── */
  return (
    <main className="chat-page">
      <Navbar
        conversationCount={conversations.length}
        onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
        sidebarCollapsed={sidebarCollapsed}
        viewMode={viewMode}
        onToggleFlow={() => setViewMode(v => v === "flow" ? "chat" : "flow")}
      />

      <div className="chat-layout">
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          collapsed={sidebarCollapsed}
          onDelete={handleDelete}
          onNew={() => {
            handleNew();
            if (typeof window !== "undefined" && window.innerWidth <= 768) {
              setSidebarCollapsed(true);
            }
          }}
          onSelect={(id) => {
            setActiveId(id);
            if (typeof window !== "undefined" && window.innerWidth <= 768) {
              setSidebarCollapsed(true);
            }
          }}
          onToggle={() => setSidebarCollapsed((c) => !c)}
          onRename={handleRename}
        />

        {viewMode === "flow" ? (
          <section className="chat-main" style={{ padding: 0 }}>
            <FlowCanvas />
          </section>
        ) : (
          <section className="chat-main">
            {error && (
              <div className="banner banner-warning animate-fade" style={{ margin: "0 0 0.5rem" }}>
                <IconWarning />
                <span>{error}</span>
              </div>
            )}

            <ChatBox
              conversation={activeConversation}
              conversationId={activeId}
              onConversationCreated={loadConversations}
              onRequireLogin={handleAuthExpired}
              resetToken={resetToken}
              setConversationId={setActiveId}
            />
          </section>
        )}
      </div>
    </main>
  );
}
