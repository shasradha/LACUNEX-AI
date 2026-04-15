"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuth, getUser } from "@/lib/auth";

/* ── Chaos Logos Config ──────────────────────── */
const LOGOS = [
  { id: 'cat', src: '/cat-with-helmet.png', line: "Yep, we will handle that army of bugs." },
  { id: 'fine', src: '/this-is-fine.png', line: "Yea, 'this is fine'—we will fix this." },
  { id: 'doge', src: '/doge-dog.png', line: "Don't worry, the main character is here." }
];

const CHAOS_SUBTEXT = "Lacunex developer was so cooked while making this project he couldn't choose a logo anymore. Enjoy the chaos!";
const CHAOS_CREDIT = "© These logos are not mine; credit goes to their respected owners.";

/* ── Inline icons ─────────────────────────────── */
function IconMenu() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>
    </svg>
  );
}

function IconLogOut() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>
    </svg>
  );
}

function IconUserRound() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>
    </svg>
  );
}

export default function Navbar({ conversationCount, onToggleSidebar, viewMode, onToggleFlow }) {
  const router = useRouter();
  const user = getUser();
  const [chaosLogo, setChaosLogo] = useState(null);

  useEffect(() => {
    // Select a random logo once on refresh
    const random = LOGOS[Math.floor(Math.random() * LOGOS.length)];
    setChaosLogo(random);
  }, []);

  const handleLogout = () => {
    clearAuth();
    router.replace("/login");
  };

  return (
    <header className="topbar-wrap">
      <div className="topbar">
        <div className="topbar-left">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="btn btn-icon"
            aria-label="Toggle sidebar"
          >
            <IconMenu />
          </button>

          <div className="topbar-brand">
            <div className="chaos-logo-wrap">
              {chaosLogo ? (
                <>
                  <div className="chaos-badge">
                    <img src={chaosLogo.src} alt="Chaos Logo" className="chaos-img" />
                  </div>
                  <div className="chaos-tooltip">
                    <div className="tooltip-line">{chaosLogo.line}</div>
                    <div className="tooltip-subtext">{CHAOS_SUBTEXT}</div>
                    <div className="tooltip-credit">{CHAOS_CREDIT}</div>
                  </div>
                </>
              ) : (
                <div className="brand-badge brand-badge-sm">L</div>
              )}
            </div>
            <div className="brand-text">
              <div className="brand-name">LACUNEX AI</div>
              <div className="brand-tagline">Filling the gaps humans can&apos;t reach</div>
            </div>
          </div>
        </div>

        <div className="topbar-right">
          <button 
            type="button" 
            onClick={onToggleFlow}
            className={`btn ${viewMode === 'flow' ? 'btn-primary' : 'btn-ghost'} hide-on-mobile`}
            style={{ fontSize: "0.75rem", padding: "0.375rem 0.75rem" }}
          >
            {viewMode === 'flow' ? 'Close Flow Canvas' : '🌟 LACUNEX Flow'}
          </button>

          <div className="stat-pill">
            <span className="stat-pill-value">{conversationCount}</span>
            <span>workspace{conversationCount === 1 ? "" : "s"}</span>
          </div>

          <div className="user-chip">
            <div className="user-avatar">
              <IconUserRound />
            </div>
            <div>
              <div className="user-info-label">Account</div>
              <div className="user-info-name">{user?.name || "User"}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="btn btn-icon"
            aria-label="Logout"
          >
            <IconLogOut />
          </button>
        </div>
      </div>
    </header>
  );
}
