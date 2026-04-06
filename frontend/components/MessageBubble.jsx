/* eslint-disable @next/next/no-img-element */
"use client";

import React, { memo, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getUser } from "@/lib/auth";
import ImageGallery from "./ImageGallery";

/* ── Inline icons ─────────────────────────────── */
function IconBot() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
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

function IconCopy() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  );
}

function IconShare() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
}

function IconFileText() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  );
}

function IconGauge() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

function IconBrain() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.96-3.96 2.5 2.5 0 0 1-.96-3.58 2.5 2.5 0 0 1 .96-4.5A2.5 2.5 0 0 1 9.5 2"/>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.96-3.96 2.5 2.5 0 0 0 .96-3.58 2.5 2.5 0 0 0-.96-4.5A2.5 2.5 0 0 0 14.5 2"/>
    </svg>
  );
}

function IconSourceLink() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function WebSources({ sources }) {
  if (!sources || sources.length === 0) return null;
  const [expanded, setExpanded] = useState(false);
  
  // Show 4 by default, expand to show all
  const displaySources = expanded ? sources : sources.slice(0, 4);

  return (
    <div className="web-sources-wrap">
      <div className="web-sources-header" onClick={() => setExpanded(!expanded)}>
        <IconSourceLink />
        <span>{sources.length} sources</span>
        <div style={{ flex: 1 }} />
        <IconChevronDown style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
      </div>
      <div className="web-sources-grid">
        {displaySources.map((s, i) => {
          // Get a clean domain name for display
          let domain = "";
          try { domain = new URL(s.url).hostname.replace("www.", ""); } catch {}
          return (
            <a key={i} href={s.url} target="_blank" rel="noreferrer" className="source-card">
              <div className="source-card-top">
                <img src={`https://icons.duckduckgo.com/ip3/${domain}.ico`} alt="" className="source-favicon" onError={(e) => e.target.style.display="none"} />
                <span className="source-domain">{domain || "Web"}</span>
                <span className="source-index">{i + 1}</span>
              </div>
              <div className="source-title">{s.title}</div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function createImageSource(image) {
  if (!image) return null;
  if (image.url) return image.url;
  if (image.data && image.mime_type) return `data:${image.mime_type};base64,${image.data}`;
  return null;
}

const MessageBubble = memo(({ message, onOpenArtifact }) => {
  const currentUser = useMemo(() => getUser(), []);
  const isUser = message.role === "user";
  const imageSource = useMemo(() => createImageSource(message.image), [message.image]);

  // Extract artifact code from this message for the "Launch Artifact" card
  const artifactCode = useMemo(() => {
    if (isUser || !message.content) return null;
    // 1. Properly closed tags
    const tagMatch = message.content.match(/<lacunex-artifact[^>]*>([\s\S]*?)<\/lacunex-artifact>/i);
    if (tagMatch && tagMatch[1]) return tagMatch[1].trim();
    // 2. Unclosed tags (AI cut off)
    const openMatch = message.content.match(/<lacunex-artifact[^>]*>([\s\S]+)/i);
    if (openMatch && openMatch[1] && openMatch[1].trim().length > 80) return openMatch[1].trim();
    // 3. Markdown code blocks
    const mdMatch = message.content.match(/```(?:html|jsx|tsx|js)\s*\n([\s\S]*?)\n\s*```/i);
    if (mdMatch && mdMatch[1] && mdMatch[1].trim().length > 80) return mdMatch[1].trim();
    return null;
  }, [message.content, isUser]);

  // Clean content: strip artifact blocks from the displayed markdown
  const cleanContent = useMemo(() => {
    let content = message.content || "";
    // 1. Strip properly closed <lacunex-artifact>...</lacunex-artifact> tags
    content = content.replace(/<lacunex-artifact[^>]*>[\s\S]*?<\/lacunex-artifact>/ig, "");
    // 2. Strip UNCLOSED artifact tags (AI response cut off before closing tag)
    content = content.replace(/<lacunex-artifact[^>]*>[\s\S]*/ig, "");
    // Citation formatting
    content = content.replace(/\[(\d+)\]/g, "[$1](#source-$1)");
    return content.trim();
  }, [message.content]);

  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedCodeBlock, setCopiedCodeBlock] = useState("");

  const copyText = async (value, callback) => {
    try {
      await navigator.clipboard.writeText(value);
      callback?.();
    } catch {
      // Clipboard not available
    }
  };

  const markdownComponents = useMemo(() => ({
    code({ inline, className, children, ...props }) {
      const code = String(children).replace(/\n$/, "");

      if (!inline) {
        return (
          <div className="code-block">
            <div className="code-header">
              <span>{className?.replace("language-", "") || "code"}</span>
              <button
                type="button"
                onClick={() =>
                  copyText(code, () => {
                    setCopiedCodeBlock(code);
                    setTimeout(() => setCopiedCodeBlock(""), 1800);
                  })
                }
                className="code-copy-btn"
              >
                {copiedCodeBlock === code ? (
                  <><IconCheck /> Copied</>
                ) : (
                  <><IconCopy /> Copy</>
                )}
              </button>
            </div>
            <pre className="code-content">
              <code className={className} {...props}>{children}</code>
            </pre>
          </div>
        );
      }

      return (
        <code className="inline-code" {...props}>{children}</code>
      );
    },
    a({ href, children }) {
      if (href?.startsWith("#source-")) {
        return <span className="citation-badge" title={`Source ${children}`}>{children}</span>;
      }
      return (
        <a href={href} target="_blank" rel="noreferrer">{children}</a>
      );
    },
    p({ children }) {
      return <div className="md-para">{children}</div>;
    },
  }), [copiedCodeBlock]);

  const handleCopyMessage = () => {
    copyText(message.content || "", () => {
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 1800);
    });
  };

  const handleShareMessage = async () => {
    const content = message.content || "";
    if (navigator.share) {
      try {
        await navigator.share({ title: "LACUNEX AI Response", text: content });
      } catch {
        // User dismissed
      }
      return;
    }
    handleCopyMessage();
  };

  return (
    <article className={`msg-row ${isUser ? "msg-row-user" : "msg-row-bot"}`}>
      {/* Avatar — bot side */}
      {!isUser && (
        <div className="msg-avatar" style={{ flexShrink: 0 }}>
          <div className="brand-badge brand-badge-sm">
            <IconBot />
          </div>
        </div>
      )}

      <div className="msg-body">
        <div className={`msg-bubble ${isUser ? "msg-bubble-user" : "msg-bubble-bot"}`}>
          {/* Sender Label */}
          <div className="msg-sender">
            {isUser ? (
              <><IconUserRound /> {currentUser?.name || "You"}</>
            ) : (
              <>
                <IconBot />
                LACUNEX AI
                {message.model_name && <span className="msg-model-name">({message.model_name})</span>}
                {message.web_search && (
                  <span className="msg-mode-badge msg-mode-badge-search">
                    <IconGlobe /> Web Search
                  </span>
                )}
                {(message.mode === "think" || message.reasoning) && (
                  <span className="msg-mode-badge msg-mode-badge-reason">
                    <IconBrain /> Reasoning
                  </span>
                )}
              </>
            )}
          </div>

          {/* Thinking Block */}
          {message.thinking && (
            <details className="thinking-block" open={Boolean(message.thinking && !message.content)}>
              <summary className="thinking-summary">
                <span>Reasoning trace</span>
                <IconChevronDown />
              </summary>
              <div className="thinking-content">{message.thinking}</div>
            </details>
          )}

          {/* Generated image (single) */}
          {imageSource && (
            <div className="msg-image">
              <img src={imageSource} alt="Generated result" />
            </div>
          )}

          {/* User Attachments (Red/Orange File Cards) */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="msg-attachments-container" style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "1rem" }}>
              {message.attachments.map((file, i) => (
                <div key={i} className="msg-attachment-card" style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "10px", padding: "10px 14px", color: "#f87171", cursor: "default" }}>
                  <div style={{ background: "rgba(239,68,68,0.2)", padding: "10px", borderRadius: "8px", display: "flex" }}>
                    <IconFileText />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.85rem", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#fca5a5" }}>{file.name}</span>
                    <span style={{ fontSize: "0.7rem", opacity: 0.8 }}>Document</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Launch Artifact Card */}
          {artifactCode && onOpenArtifact && (
            <button
              type="button"
              className="launch-artifact-card"
              onClick={() => onOpenArtifact(artifactCode)}
            >
              <div className="launch-artifact-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              </div>
              <div className="launch-artifact-info">
                <span className="launch-artifact-title">Interactive Artifact</span>
                <span className="launch-artifact-sub">Click to open live preview</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto", opacity: 0.5 }}>
                <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Content */}
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {cleanContent}
            </ReactMarkdown>
          </div>

          {/* Search Image Gallery */}
          {message.image_results?.length > 0 && (
            <ImageGallery images={message.image_results} />
          )}

          {/* Web Sources Citation Block */}
          {message.web_results?.length > 0 && (
            <WebSources sources={message.web_results} />
          )}

          {/* Confidence & Gaps */}
          {(message.confidence != null || message.gaps_found?.length > 0) && !isUser && (
            <div className="msg-meta">
              {message.confidence != null && (
                <span className="confidence-pill">
                  <IconGauge />
                  {message.confidence}% confidence
                </span>
              )}
              {message.gaps_found?.length > 0 && (
                <details className="gaps-block">
                  <summary className="gaps-summary">
                    {message.gaps_found.length} gap{message.gaps_found.length === 1 ? "" : "s"} detected
                  </summary>
                  <div className="gaps-content">
                    {message.gaps_found.map((gap, i) => (
                      <p key={i} style={{ margin: "0.25rem 0" }}>{gap}</p>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {message.content && (
          <div className="msg-actions" style={{ justifyContent: isUser ? "flex-end" : "flex-start" }}>
            <button type="button" onClick={handleCopyMessage} className="msg-action-btn">
              {copiedMessage ? <><IconCheck /> Copied</> : <><IconCopy /> Copy</>}
            </button>
            {!isUser && (
              <button type="button" onClick={handleShareMessage} className="msg-action-btn">
                <IconShare /> Share
              </button>
            )}
          </div>
        )}
      </div>

      {/* Avatar — user side */}
      {isUser && (
        <div className="msg-avatar" style={{ flexShrink: 0 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "2.125rem",
            height: "2.125rem",
            borderRadius: "0.75rem",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "white",
          }}>
            <IconUserRound />
          </div>
        </div>
      )}
    </article>
  );
});

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
