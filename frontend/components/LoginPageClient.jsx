"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { login, signup } from "@/lib/api";
import { getToken, setAuth } from "@/lib/auth";

function getPasswordStrength(password) {
  if (!password) {
    return { score: 0, label: "Add a strong password", color: "rgba(148,163,184,0.35)" };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) return { score, label: "Weak", color: "#ef4444" };
  if (score <= 3) return { score, label: "Good", color: "#f59e0b" };
  if (score === 4) return { score, label: "Strong", color: "#10b981" };
  return { score, label: "Excellent", color: "#06b6d4" };
}

/* ── Icons (inline SVG) ─────────────────────────── */
function IconMail() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function IconEye() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function IconEyeOff() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
    </svg>
  );
}

function IconSparkles() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/>
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

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const sessionExpired = searchParams.get("reason") === "session-expired";
  const isSignup = mode === "signup";

  useEffect(() => {
    if (getToken()) {
      router.replace("/chat");
    }
  }, [router]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (isSignup && !name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const result = isSignup
        ? await signup(email.trim(), password, name.trim())
        : await login(email.trim(), password);

      setAuth(result.access_token, result.user);
      router.replace("/chat");
    } catch (requestError) {
      setError(requestError.message || "Unable to continue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-shell">
      {/* Animated floating orbs */}
      <div className="login-orb login-orb-1" aria-hidden="true" />
      <div className="login-orb login-orb-2" aria-hidden="true" />
      <div className="login-orb login-orb-3" aria-hidden="true" />

      <div className="login-grid animate-enter">
        {/* ── Left: Hero ──────────────────────────────── */}
        <section className="glass-panel login-hero">
          <div className="brand-badge brand-badge-lg animate-glow">L</div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <span className="eyebrow">
              <IconSparkles />
              From lacuna
            </span>
          </div>

          <h1 className="heading-xl">LACUNEX AI</h1>

          <p className="login-hero-tagline">
            <em>Lacuna</em> — a gap, a missing piece, an unfilled space in knowledge or text.
          </p>
          <p className="login-hero-meaning">
            An AI that exists to fill the gaps humans can&apos;t reach.
          </p>

          <div className="login-features">
            <span className="feature-chip">⚡ Fast chat</span>
            <span className="feature-chip">🔍 Image analysis</span>
            <span className="feature-chip">🎨 Image generation</span>
            <span className="feature-chip">🔐 Encrypted history</span>
            <span className="feature-chip">🧠 Deep reasoning</span>
          </div>
        </section>

        {/* ── Right: Auth Card ────────────────────────── */}
        <section className="glass-panel login-card">
          <div className="login-card-header">
            <div>
              <p className="eyebrow">Secure access</p>
              <h2 className="heading-lg" style={{ marginTop: "0.25rem" }}>
                {isSignup ? "Create account" : "Welcome back"}
              </h2>
            </div>
            <div className="stat-pill">
              <span className="stat-pill-value">AES-256</span>
              <span>encrypted</span>
            </div>
          </div>

          {sessionExpired && (
            <div className="banner banner-warning">
              Your session expired. Please sign in again.
            </div>
          )}

          <div className="toggle-row">
            <button
              type="button"
              onClick={() => { setMode("signin"); setError(""); }}
              className={`toggle-chip ${!isSignup ? "toggle-chip-active" : ""}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setError(""); }}
              className={`toggle-chip ${isSignup ? "toggle-chip-active" : ""}`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="form-stack">
            {isSignup && (
              <label className="field-shell">
                <span className="input-icon"><IconUser /></span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field input-with-icon"
                  placeholder="Your name"
                  autoComplete="name"
                />
              </label>
            )}

            <label className="field-shell">
              <span className="input-icon"><IconMail /></span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field input-with-icon"
                placeholder="Email"
                autoComplete="email"
                required
              />
            </label>

            <label className="field-shell">
              <span className="input-icon"><IconLock /></span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field input-with-icon"
                style={{ paddingRight: "2.5rem" }}
                placeholder="Password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((c) => !c)}
                className="password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <IconEyeOff /> : <IconEye />}
              </button>
            </label>

            {isSignup && password && (
              <div className="strength-card">
                <div className="strength-row">
                  <span>Password strength</span>
                  <span style={{ color: strength.color, fontWeight: 600 }}>{strength.label}</span>
                </div>
                <div className="strength-bars">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="strength-bar"
                      style={{
                        backgroundColor: i <= strength.score ? strength.color : "rgba(148,163,184,0.12)",
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {error && <div className="banner banner-danger">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-submit"
            >
              {loading ? "Please wait..." : isSignup ? "Create account" : "Enter LACUNEX"}
              {!loading && <IconArrowRight />}
            </button>
          </form>
        </section>
      </div>

      {/* Copyright Footer */}
      <footer className="copyright-footer copyright-footer-fixed">
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
    </main>
  );
}
