/* eslint-disable @next/next/no-img-element */
"use client";

import React, { memo, useMemo, useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getUser } from "@/lib/auth";
import { executeCode } from "@/lib/api";
import ImageSlider from "./ImageSlider";
import QuizWidget from "./QuizWidget";
import CodeTerminal from "./CodeTerminal";
import { LANGUAGES, getLanguageByMonaco } from "@/lib/languages";

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

const getSuggestionChips = (userMsg, aiResp) => {
  const msg = (userMsg || "").toLowerCase().trim();
  const respLen = (aiResp || "").length;

  // NEVER show chips for:
  if (
    msg.length < 20 ||
    respLen < 200 ||
    /^(hi|hello|hey|thanks|bye|ok|okay|yes|no|cool|nice|great|got it|understood|sure|fine|wow|amazing|perfect|awesome)/.test(msg) ||
    /who are you|what are you|your name|about lacunex|how are you/.test(msg)
  ) return [];

  // ACADEMIC / NOTES / STUDY
  if (/notes|explain|concept|theory|chapter|unit|topic|history|science|physics|chemistry|biology|engineering|describe|what is|how does|why does/.test(msg)) {
    return [
      { icon: '📝', label: 'Quiz Me', action: 'Create a 10-question quiz from the above explanation' },
      { icon: '🗺️', label: 'Mind Map', action: 'Create a mind map outline of the above topic' },
      { icon: '🎯', label: 'Key Points', action: 'List the 5 most important exam points from above' },
    ];
  }

  // CODE / PROGRAMMING
  if (/code|function|program|script|build|create.*app|website|api|implement|develop|debug|error/.test(msg) || aiResp.includes('```')) {
    return [
      { icon: '⚡', label: 'Optimize', action: 'Optimize the above code for better performance' },
      { icon: '🛡️', label: 'Add Error Handling', action: 'Add comprehensive error handling to the above code' },
      { icon: '🧪', label: 'Write Tests', action: 'Write unit tests for the above code' },
    ];
  }

  // MATH / ENGINEERING / NUMERICALS
  if (/calculate|find|solve|formula|equation|numerical|design|shaft|stress|torque|derive|proof|theorem/.test(msg)) {
    return [
      { icon: '➕', label: 'Another Example', action: 'Solve another similar problem with different values' },
      { icon: '📐', label: 'All Formulas', action: 'List all formulas used above with derivations' },
      { icon: '⚠️', label: 'Common Mistakes', action: 'What are common mistakes in this type of problem?' },
    ];
  }

  // HISTORY / FACTUAL / RESEARCH
  if (/history|origin|when|who invented|timeline|war|revolution|movement|culture|civilization/.test(msg)) {
    return [
      { icon: '📅', label: 'Full Timeline', action: 'Give a detailed timeline of the above events' },
      { icon: '🌍', label: 'Global Impact', action: 'What was the global impact of the above?' },
      { icon: '📚', label: 'Key Figures', action: 'Who were the key people involved in the above?' },
    ];
  }

  // CREATIVE / WRITING
  if (/write|story|poem|essay|email|letter|script|blog|article|content/.test(msg)) {
    return [
      { icon: '✨', label: 'Make it Better', action: 'Make the above more engaging and impactful' },
      { icon: '📏', label: 'Shorten', action: 'Condense the above to half the length' },
      { icon: '🌐', label: 'Translate', action: 'Translate the above to Hindi' },
    ];
  }

  // COMPARISON / ANALYSIS
  if (/compare|difference|vs|versus|better|best|pros.*cons|advantages|disadvantages/.test(msg)) {
    return [
      { icon: '📊', label: 'Full Comparison Table', action: 'Create a detailed comparison table for the above' },
      { icon: '✅', label: 'Final Recommendation', action: 'Based on the above, give your final recommendation' },
      { icon: '🔍', label: 'Dive Deeper', action: 'Analyze the above comparison in more depth' },
    ];
  }

  return []; // no chips if no category matched
};

/* ── Helper: Is this language executable? ─── */
const RUNNABLE_LANGS = new Set([
  "python", "py", "python3", "javascript", "js", "typescript", "ts",
  "java", "c", "cpp", "c++", "csharp", "cs", "go", "golang",
  "rust", "rs", "php", "ruby", "rb", "swift", "kotlin", "kt",
  "bash", "sh", "perl", "lua", "dart", "scala", "r", "haskell", "elixir", "sql",
]);

const MessageBubble = memo(({ message, onOpenArtifact, onSendFollowUp, onOpenCodeStudio }) => {
  const markdownRef = useRef(null);
  const currentUser = useMemo(() => getUser(), []);
  const isUser = message.role === "user";
  const imageSource = useMemo(() => createImageSource(message.image), [message.image]);

  const artifactCode = useMemo(() => {
    if (isUser || !message.content) return null;
    
    const content = message.content;
    const tagMatch = content.match(/<lacunex-artifact[^>]*>([\s\S]*?)<\/lacunex-artifact>/i) || 
                     content.match(/<lacunex-artifact[^>]*>([\s\S]+)/i);
    
    if (tagMatch && tagMatch[1]) {
      const raw = tagMatch[1].trim();
      if (raw.includes("<file name=")) {
        const files = {};
        const fileRegex = /<file name=["']([^"']+)["']>([\s\S]*?)<\/file>/gi;
        let m;
        while ((m = fileRegex.exec(raw)) !== null) {
          files[m[1]] = m[2].trim();
        }
        if (Object.keys(files).length > 0) return { isMultiFile: true, files };
      }
      return raw;
    }
    
    const mdMatch = content.match(/```(?:html|jsx|tsx|js)\s*\n([\s\S]*?)\n\s*```/i);
    if (mdMatch && mdMatch[1] && mdMatch[1].trim().length > 80) return mdMatch[1].trim();
    
    return null;
  }, [message.content, isUser]);

  // Extract Quiz Data
  const quizData = useMemo(() => {
    if (isUser || !message.content) return null;
    const match = message.content.match(/<lacunex-quiz>([\s\S]*?)<\/lacunex-quiz>/i);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch {
        return null; // ignore invalid JSON
      }
    }
    return null;
  }, [message.content, isUser]);

  // Clean content: strip artifact blocks from the displayed markdown
  const cleanContent = useMemo(() => {
    let content = message.content || "";
    // 1. Strip properly closed <lacunex-artifact>...</lacunex-artifact> tags
    content = content.replace(/<lacunex-artifact[^>]*>[\s\S]*?<\/lacunex-artifact>/ig, "");
    // 2. Strip UNCLOSED artifact tags (AI response cut off before closing tag)
    content = content.replace(/<lacunex-artifact[^>]*>[\s\S]*/ig, "");
    // 3. Strip Quiz blocks
    content = content.replace(/<lacunex-quiz>[\s\S]*?<\/lacunex-quiz>/ig, "");
    // Citation formatting
    // Fact-check badges
    content = content.replace(/\[✓ Verified\]/g, "[✓ Verified](#badge-verified)");
    content = content.replace(/\[~Approx\]/g, "[~Approx](#badge-approx)");
    content = content.replace(/«verified»/g, "[✓ Verified](#badge-verified)");
    content = content.replace(/«approx»/g, "[~Approx](#badge-approx)");
    return content.trim();
  }, [message.content]);

  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedCodeBlock, setCopiedCodeBlock] = useState("");
  const [runningCode, setRunningCode] = useState("");
  const [codeOutputs, setCodeOutputs] = useState({}); // { [codeHash]: { output, success } }

  const copyText = async (value, callback) => {
    try {
      await navigator.clipboard.writeText(value);
      callback?.();
    } catch {
      // Clipboard not available
    }
  };

  // Render KaTeX Math — enhanced with more delimiters
  useEffect(() => {
    if (markdownRef.current && typeof window !== 'undefined' && window.renderMathInElement) {
      try {
        window.renderMathInElement(markdownRef.current, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
            { left: "\\(", right: "\\)", display: false },
            { left: "\\[", right: "\\]", display: true },
          ],
          throwOnError: false,
          errorColor: '#ff6b6b',
        });
      } catch (e) {
        // KaTeX may not be loaded yet, ignore
      }
    }
  }, [cleanContent]);

  const handleRunCode = async (code, lang) => {
    const key = code.slice(0, 100);
    const lowLang = lang.toLowerCase();
    setRunningCode(key);
    
    try {
      let result;
      // 1. Try local execution for primary languages
      if (lowLang === "python" || lowLang === "py" || lowLang === "python3") {
        const { runPythonLocally } = await import("../lib/sandbox");
        result = await runPythonLocally(code);
      } else if (lowLang === "javascript" || lowLang === "js") {
        const { runJSLocally } = await import("../lib/sandbox");
        result = await runJSLocally(code);
      } else {
        // 2. Fallback to backend for everything else
        result = await executeCode(code, lang);
      }
      
      setCodeOutputs(prev => ({ 
        ...prev, 
        [key]: { 
          output: result.output, 
          success: result.success,
          isLocal: result.isLocal 
        } 
      }));
    } catch (err) {
      setCodeOutputs(prev => ({ ...prev, [key]: { output: err.message || "Execution failed", success: false } }));
    } finally {
      setRunningCode("");
    }
  };

  const markdownComponents = useMemo(() => ({
    code({ inline, className, children, ...props }) {
      const codeStr = String(children).replace(/\n$/, "");
      const lang = className?.replace("language-", "") || "code";
      const isRunnable = RUNNABLE_LANGS.has(lang.toLowerCase());
      const codeKey = codeStr.slice(0, 100);
      const output = codeOutputs[codeKey];

      if (!inline) {
        // Runnable code → full CodeTerminal
        if (isRunnable) {
          return <CodeTerminal code={codeStr} language={lang} />;
        }
        
        // Non-runnable code → code block with copy button
        return (
          <div className="code-block-wrapper">
            <div className="code-block-header">
              <span className="code-lang-label">{lang || 'code'}</span>
              <div className="code-block-actions">
                <button
                  type="button"
                  onClick={() =>
                    copyText(codeStr, () => {
                      setCopiedCodeBlock(codeStr);
                      setTimeout(() => setCopiedCodeBlock(""), 2000);
                    })
                  }
                  className="code-copy-btn"
                >
                  {copiedCodeBlock === codeStr ? (
                    <>✅ Copied!</>
                  ) : (
                    <>📋 Copy</>
                  )}
                </button>
              </div>
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
      if (href === "#badge-verified") {
        return <span className="fact-badge verified">✓ Verified</span>;
      }
      if (href === "#badge-approx") {
        return <span className="fact-badge approx">~ Approx</span>;
      }
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
  }), [copiedCodeBlock, codeOutputs, runningCode]);

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
        {message.type === 'images' && message.data ? (
          <div className={`msg-bubble ${isUser ? "msg-bubble-user" : "msg-bubble-bot"}`}>
            <ImageSlider images={message.data} query={message.query} />
          </div>
        ) : (
        <div className={`msg-bubble ${isUser ? "msg-bubble-user" : "msg-bubble-bot"}`}>
          {/* Sender Label */}
          <div className="msg-sender">
            {isUser ? (
              <><IconUserRound /> {currentUser?.name || "You"}</>
            ) : (
              <>
                <IconBot />
                LACUNEX AI
                {message.provider && <span className="msg-provider-badge">[{message.provider}]</span>}
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
          <div className="markdown-body" ref={markdownRef}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {cleanContent}
            </ReactMarkdown>
          </div>

          {/* Open in Code Studio button — for AI messages with code blocks */}
          {!isUser && cleanContent.includes('```') && onOpenCodeStudio && (
            (() => {
              const match = cleanContent.match(/```(\w+)?\n([\s\S]*?)```/);
              if (match) {
                const lang = getLanguageByMonaco(match[1]);
                const extractedCode = match[2].trim();
                return (
                  <button
                    className="open-studio-btn"
                    onClick={() => onOpenCodeStudio(extractedCode, lang)}
                  >
                    ⚡ Open in Code Studio
                  </button>
                );
              }
              return null;
            })()
          )}

          {/* Refinement Buttons (v4.0) */}
          {!isUser && message.content && message.role !== 'system' && onSendFollowUp && (
            <div className="msg-refinement-buttons" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
              {message.suggestions?.length > 0 ? (
                message.suggestions.map((sug, i) => (
                  <button key={i} onClick={() => onSendFollowUp(sug)} className="refinement-btn">
                    <span className="eyebrow" style={{ color: "var(--accent-primary)" }}>✨ Follow-up</span> {sug}
                  </button>
                ))
              ) : (
                getSuggestionChips(message.user_prompt || "", cleanContent).map((chip, i) => (
                  <button key={i} onClick={() => onSendFollowUp(chip.action)} className="refinement-btn" title={chip.action}>
                    {chip.icon} {chip.label}
                  </button>
                ))
              )}
            </div>
          )}

          {/* Search Data */}
          {!isUser && message.image_results?.length > 0 && (
            <div className="msg-gallery">
              <ImageSlider images={message.image_results} />
            </div>
          )}

          {/* Interactive Quiz Mode */}
          {quizData && (
            <QuizWidget quizData={quizData} />
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
        )}

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
