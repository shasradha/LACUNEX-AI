"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ImageUpload from "./ImageUpload";
import MessageBubble from "./MessageBubble";
import ModelSelector from "./ModelSelector";
import SearchToggle from "./SearchToggle";
import ThinkToggle from "./ThinkToggle";
import TypingIndicator from "./TypingIndicator";
import {
  AuthError,
  analyzeImage,
  createConversation,
  exportConversation,
  generateImage,
  getConversation,
  getModels,
  saveMessage,
  streamChat,
} from "@/lib/api";
import { decryptMessage, encryptMessage } from "@/lib/crypto";

/* ── Inline icons ─────────────────────────────── */
function IconArrowUp() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.22-8.56" strokeLinecap="round"/>
    </svg>
  );
}

function IconSparkle() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

const QUICK_PROMPTS = [
  "Explain this project simply",
  "Help me fix bugs fast",
  "/imagine futuristic ai workspace",
];

function createMessageId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildTitle(text, hasImage) {
  const cleaned = (text || "").replace(/^\/(imagine|generate)\s+/i, "").trim();
  if (cleaned.length > 42) return `${cleaned.slice(0, 42)}...`;
  if (cleaned) return cleaned;
  return hasImage ? "Image analysis" : "New workspace";
}

function updateMsg(messages, id, updater) {
  return messages.map((m) => (m.id === id ? { ...m, ...updater } : m));
}

async function loadHistory(conversation) {
  return Promise.all(
    (conversation.messages || []).map(async (item) => {
      let content = "";
      try {
        content =
          item.encrypted_content && item.iv
            ? await decryptMessage(item.encrypted_content, item.iv)
            : "";
      } catch {
        content = "This message could not be decrypted in the current browser session.";
      }

      let image = null;
      if (item.image_data) {
        try { image = JSON.parse(item.image_data); } catch { image = null; }
      }

      return {
        id: item.id || createMessageId(),
        role: item.role,
        content,
        mode: item.mode,
        confidence: item.confidence,
        gaps_found: item.gaps_found,
        image,
        model_name: item.model_name,
      };
    })
  );
}

export default function ChatBox({
  conversation,
  conversationId,
  onConversationCreated,
  onRequireLogin,
  resetToken,
  setConversationId,
}) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [convError, setConvError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [thinkMode, setThinkMode] = useState(false);
  const [provider, setProvider] = useState("groq");
  const [selectedModel, setSelectedModel] = useState("llama-3.3-70b-versatile");
  const [modelCatalog, setModelCatalog] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [searchStatus, setSearchStatus] = useState("");
  const exportMenuRef = useRef(null);

  const textareaRef = useRef(null);
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const skipReload = useRef(null);

  const currentTitle = conversation?.title || "New workspace";

  /* ── Effects ─────────────────────────────────── */
  useEffect(() => {
    async function fetchModels() {
      try {
        const data = await getModels();
        if (data) setModelCatalog(data);
      } catch (err) {
        console.error("Failed to fetch models:", err);
      }
    }
    fetchModels();
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getModelDisplayName = useCallback((pId, mId) => {
    if (!modelCatalog) return mId;
    const group = modelCatalog[pId];
    const m = group?.models.find(x => x.id === mId);
    return m ? m.name : mId;
  }, [modelCatalog]);

  /* ── Helpers ─────────────────────────────────── */
  const syncHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  const clearImage = useCallback(() => {
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  }, [imagePreview]);

  const handleImageSelect = useCallback((file) => {
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }, [imagePreview]);

  const saveEncrypted = useCallback(async (convId, msg, doneData) => {
    const encrypted = await encryptMessage(msg.content || "");
    await saveMessage({
      conversation_id: convId,
      role: msg.role,
      encrypted_content: encrypted.encrypted_content,
      iv: encrypted.iv,
      mode: msg.mode || "normal",
      confidence: doneData?.confidence ?? msg.confidence ?? null,
      gaps_found: doneData?.gaps_found ?? msg.gaps_found ?? null,
      image_data: msg.image ? JSON.stringify(msg.image) : null,
      model_name: msg.model_name || null,
    });
  }, []);

  const persistSafely = useCallback(async (convId, entries, doneData) => {
    try {
      for (const entry of entries) {
        await saveEncrypted(convId, entry, doneData);
      }
      setSaveNotice("");
      // Tell parent to refresh the sidebar so message counts update!
      onConversationCreated?.();
    } catch (err) {
      setSaveNotice(err?.message ? `Save failed: ${err.message}` : "History save failed.");
    }
  }, [saveEncrypted, onConversationCreated]);

  /* ── Effects ─────────────────────────────────── */
  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  useEffect(() => { syncHeight(); }, [draft, syncHeight]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Smart Scroll: only pin to bottom if user is already near the bottom
    // or if the AI is currently generating and we want to keep up.
    const threshold = 180; // slightly larger for stability
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;

    if (isBusy || isNearBottom) {
      // Use scrollIntoView on a dedicated bottom anchor for rock-solid pinning
      bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    }
  }, [messages, isBusy]);

  useEffect(() => {
    setMessages([]);
    setDraft("");
    setConvError("");
    setSaveNotice("");
    // Don't call clearImage here to avoid dependency cycle
    setImageFile(null);
    setImagePreview(null);
  }, [resetToken]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!conversationId) {
        setMessages([]);
        setConvError("");
        return;
      }

      if (skipReload.current === conversationId) {
        skipReload.current = null;
        // Optimization: If we just created this in-background, we already have the messages!
        setIsLoading(false); 
        return;
      }

      setConvError("");
      setSaveNotice("");
      setIsLoading(true);

      try {
        const res = await getConversation(conversationId);
        if (!active) return;
        const msgs = await loadHistory(res);
        if (active) setMessages(msgs);
      } catch (err) {
        if (err instanceof AuthError) { onRequireLogin?.(); return; }
        if (active) {
          setMessages([]);
          setConvError(err.message || "Could not load workspace.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [conversationId, onRequireLogin]);

  /* ── Send Handler ───────────────────────────── */
  const handleSend = async () => {
    const prompt = draft.trim();
    if ((!prompt && !imageFile) || isBusy) return;

    const history = [...messages];
    const userMsg = {
      id: createMessageId(),
      role: "user",
      content: prompt || "Please analyze this image.",
      mode: thinkMode ? "think" : "normal",
    };

    setMessages((prev) => [...prev, userMsg]);
    setDraft("");
    setConvError("");
    setSaveNotice("");
    setIsBusy(true);

    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = "40px";
    });

    let localConvId = conversationId;
    let createConvPromise = null;

    try {
      // Background conversation creation — DO NOT AWAIT, instantly proceed to stream!
      if (!localConvId) {
        createConvPromise = createConversation(buildTitle(prompt, Boolean(imageFile))).then(created => {
          localConvId = created.id;
          skipReload.current = created.id;
          setConversationId(created.id);
          // Background sidebar update
          onConversationCreated?.({ selectConversationId: created.id });
          return created.id;
        }).catch(err => {
          console.error("BG Conv creation failed:", err);
          setSaveNotice("History saving may be delayed.");
          return null; 
        });
      } else {
        createConvPromise = Promise.resolve(localConvId);
      }

      // Image analysis
      if (imageFile) {
        const result = await analyzeImage(imageFile, prompt || undefined);
        const botMsg = {
          id: createMessageId(),
          role: "assistant",
          content: result.analysis || "No analysis was returned.",
          mode: "normal",
          model_name: "Visual Engine",
        };
        setMessages((prev) => [...prev, botMsg]);
        const finalId = await createConvPromise;
        await persistSafely(finalId, [userMsg, botMsg]);
        clearImage();
        return;
      }

      // Image generation
      if (/^\/(imagine|generate)\s+/i.test(prompt)) {
        const imagePrompt = prompt.replace(/^\/(imagine|generate)\s+/i, "");
        const result = await generateImage(imagePrompt);
        const botMsg = {
          id: createMessageId(),
          role: "assistant",
          content: result.text || "Your image is ready.",
          image: result.image,
          mode: "normal",
          model_name: "Imagine v1",
        };
        setMessages((prev) => [...prev, botMsg]);
        const finalId = await createConvPromise;
        await persistSafely(finalId, [userMsg, botMsg]);
        return;
      }


      // Streaming chat
      const botId = createMessageId();
      let streamed = "";
      let streamedThinking = "";

      setMessages((prev) => [
        ...prev,
        {
          id: botId,
          role: "assistant",
          content: "",
          mode: thinkMode ? "think" : "normal",
          model_name: getModelDisplayName(provider, selectedModel),
        },
      ]);

      await streamChat(
        prompt,
        thinkMode ? "think" : "normal",
        history.slice(-20).map((m) => ({ role: m.role, content: m.content })),
        {
          onModeDetected: (modeData) => {
            // Update bot message with auto-detected badges immediately
            setMessages((prev) => updateMsg(prev, botId, {
              web_search: modeData.web_search,
              reasoning: modeData.reasoning,
              mode: modeData.reasoning ? "think" : "normal",
            }));
          },
          onSearchStatus: (status) => {
            setSearchStatus(status);
          },
          onToken: (token) => {
            setSearchStatus("");
            streamed += token;
            setMessages((prev) => updateMsg(prev, botId, { content: streamed }));
          },
          onThinking: (chunk) => {
            setSearchStatus("");
            streamedThinking += chunk;
            setMessages((prev) => updateMsg(prev, botId, { thinking: streamedThinking }));
          },
          onDone: async (data) => {
            setSearchStatus("");
            const finalMsg = {
              id: botId,
              role: "assistant",
              content: data.answer || streamed || "Done.",
              mode: data.mode || (thinkMode ? "think" : "normal"),
              confidence: data.confidence ?? null,
              gaps_found: data.gaps_found ?? [],
              thinking: streamedThinking || undefined,
              model_name: getModelDisplayName(provider, selectedModel),
              web_search: data.web_search ?? false,
              reasoning: data.reasoning ?? false,
              image_results: data.image_results ?? [],
            };
            setMessages((prev) => updateMsg(prev, botId, finalMsg));
            
            // Cleanly await the conversation ID if it was being created in background
            try {
              const finalId = await createConvPromise;
              if (finalId) {
                await persistSafely(finalId, [userMsg, finalMsg], data);
              }
            } catch (err) {
              console.error("Final persistence failed:", err);
            }
          },
          onError: (errMsg) => {
            setSearchStatus("");
            setMessages((prev) =>
              updateMsg(prev, botId, {
                content: errMsg || "Something went wrong.",
                mode: "normal",
              })
            );
          },
        },
        provider,
        selectedModel,
        searchMode
      );
    } catch (err) {
      if (err instanceof AuthError) { onRequireLogin?.(); return; }
      setMessages((prev) => [
        ...prev,
        { id: createMessageId(), role: "assistant", content: err.message || "Something went wrong.", mode: "normal" },
      ]);
    } finally {
      setIsBusy(false);
      if (imageFile) clearImage();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ── Empty State ────────────────────────────── */
  const emptyState = useMemo(() => (
    <div className="empty-state animate-enter">
      <div className="empty-hero">
        <div>
          <p className="eyebrow">LACUNEX</p>
          <h2 className="heading-lg">Fill the missing pieces</h2>
        </div>
      </div>
      <p className="empty-text">
        Ask anything, analyze an image, or generate a concept with <code className="inline-code">/imagine</code>.
      </p>
      <div className="quick-prompts">
        {QUICK_PROMPTS.map((item) => (
          <button
            key={item}
            type="button"
            className="btn btn-ghost quick-prompt"
            onClick={() => setDraft(item)}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  ), []);

  const handleExport = async (format) => {
    setShowExportMenu(false);
    if (messages.length === 0) return;
    setIsExporting(true);
    setExportError("");
    try {
      const payload = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role,
          content: m.content || "",
          created_at: m.created_at || null,
        }));
      const modelDisplayName = getModelDisplayName(provider, selectedModel) || selectedModel;
      await exportConversation(currentTitle, payload, format, modelDisplayName);
    } catch (err) {
      setExportError(err.message || "Export failed. Please try again.");
      setTimeout(() => setExportError(""), 4000);
    } finally {
      setIsExporting(false);
    }
  };

  /* ── Render ─────────────────────────────────── */
  return (
    <div className="chat-container">
      <div className="chat-panel">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-left" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'nowrap', minWidth: 0, flex: 1, overflow: 'hidden' }}>
            <span className="eyebrow chat-header-eyebrow" style={{ margin: 0, whiteSpace: 'nowrap' }}>Workspace</span>
            <span className="text-muted chat-header-sep">•</span>
            <h2 className="heading-sm" style={{ margin: 0, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentTitle}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <div className="chat-stats">
              <span className="stat-pill">
                <span className="stat-pill-value">{messages.length}</span>
                <span>messages</span>
              </span>
              <span className="stat-pill">
                <span className="stat-pill-value">{thinkMode ? "Deep" : "Fast"}</span>
                <span>mode</span>
              </span>
            </div>
            {/* Export button — only show when there are messages */}
            {messages.length > 0 && (
              <div className="export-wrap" ref={exportMenuRef}>
                <button
                  type="button"
                  className={`export-trigger ${showExportMenu ? 'export-trigger-active' : ''}`}
                  onClick={() => setShowExportMenu((v) => !v)}
                  disabled={isExporting}
                  aria-label="Export conversation"
                  title="Export conversation"
                >
                  {isExporting ? <IconSpinner /> : <IconDownload />}
                  <span className="export-trigger-label">{isExporting ? 'Exporting…' : 'Export'}</span>
                  <IconChevronDown />
                </button>
                {showExportMenu && (
                  <div className="export-menu" role="menu">
                    <div className="export-menu-header">Download as</div>
                    <button type="button" className="export-menu-item" onClick={() => handleExport('pdf')} role="menuitem">
                      <span className="export-menu-icon export-icon-pdf">PDF</span>
                      <div>
                        <div className="export-menu-title">PDF Document</div>
                        <div className="export-menu-subtitle">Best for reading & sharing</div>
                      </div>
                    </button>
                    <button type="button" className="export-menu-item" onClick={() => handleExport('docx')} role="menuitem">
                      <span className="export-menu-icon export-icon-docx">DOC</span>
                      <div>
                        <div className="export-menu-title">Word Document (.docx)</div>
                        <div className="export-menu-subtitle">Editable in Microsoft Word</div>
                      </div>
                    </button>
                    <button type="button" className="export-menu-item" onClick={() => handleExport('xlsx')} role="menuitem">
                      <span className="export-menu-icon export-icon-xlsx">XLS</span>
                      <div>
                        <div className="export-menu-title">Excel Spreadsheet (.xlsx)</div>
                        <div className="export-menu-subtitle">Structured data with timestamps</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Notices */}
        {convError && <div className="banner banner-danger">{convError}</div>}
        {saveNotice && <div className="banner banner-info">{saveNotice}</div>}
        {exportError && <div className="banner banner-danger">{exportError}</div>}

        {/* Messages */}
        <div ref={scrollRef} className="chat-scroll">
          {isLoading ? (
            <div className="loading-center">
              <IconSpinner />
              <span>Loading workspace...</span>
            </div>
          ) : messages.length === 0 ? (
            emptyState
          ) : (
            <div className="message-list">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {isBusy && searchStatus && (
                <div className="search-status-indicator">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                    <path d="M2 12h20" />
                  </svg>
                  <span>{searchStatus}</span>
                </div>
              )}
              {isBusy && !searchStatus && <TypingIndicator />}
              <div ref={bottomRef} className="chat-bottom-anchor" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="composer-wrap">
          {imagePreview && (
            <div className="composer-preview">
              <ImageUpload preview={imagePreview} onClear={clearImage} onSelect={handleImageSelect} />
            </div>
          )}

          <div className="composer-toolbar">
            <ModelSelector
              provider={provider}
              model={selectedModel}
              onSelect={(p, m) => { setProvider(p); setSelectedModel(m); }}
              disabled={isBusy}
            />
            <ThinkToggle enabled={thinkMode} onChange={setThinkMode} />
            <SearchToggle enabled={searchMode} onChange={setSearchMode} />
            <span className="toolbar-hint">
              <IconSparkle />
              /imagine for image gen
            </span>
          </div>

          <div className="composer-box">
            {!imagePreview && (
              <ImageUpload onClear={clearImage} onSelect={handleImageSelect} />
            )}
            <textarea
              ref={textareaRef}
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={imageFile ? "Add a prompt for this image..." : "Message LACUNEX AI..."}
              className="composer-textarea"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={(!draft.trim() && !imageFile) || isBusy}
              className="send-btn"
              aria-label="Send"
            >
              {isBusy ? <IconSpinner /> : <IconArrowUp />}
            </button>
          </div>

          <div className="copyright-footer">
            <span>Made with</span>
            <span className="copyright-heart">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </span>
            <span>by</span>
            <a href="https://github.com/shasradha" target="_blank" rel="noopener noreferrer" className="copyright-link">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span>Shasradha Karmakar</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
