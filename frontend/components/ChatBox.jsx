"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ImageUpload from "./ImageUpload";
import MessageBubble from "./MessageBubble";
import ArtifactViewer from "./ArtifactViewer";
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

function IconPaperclip() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
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
        image_results: item.image_results || [],
        web_results: item.web_results || [],
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
  const [attachedFiles, setAttachedFiles] = useState([]); // RAG extracted files
  const [isExtracting, setIsExtracting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [searchStatus, setSearchStatus] = useState("");
  const [activeArtifact, setActiveArtifact] = useState(null);
  const exportMenuRef = useRef(null);

  const textareaRef = useRef(null);
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const skipReload = useRef(null);
  const stopRef = useRef(null); // AbortController for terminating streams

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

  const handleFileAttach = async (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;
    setIsExtracting(true);
    try {
      // We import it dynamically if not imported at top or assume api.js has extractFile
      const { extractFile } = await import("@/lib/api");
      const results = await Promise.all(
        files.map(async (f) => {
          try {
            const res = await extractFile(f);
            return { name: f.name, content: res.content };
          } catch (err) {
            console.error(`Failed to extract ${f.name}`, err);
            return null;
          }
        })
      );
      setAttachedFiles((prev) => [...prev, ...results.filter(Boolean)]);
    } finally {
      setIsExtracting(false);
    }
  };

  const removeAttachedFile = (idx) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

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
      image_results: doneData?.image_results ?? msg.image_results ?? null,
      web_results: doneData?.web_results ?? msg.web_results ?? null,
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
        setIsLoading(false);
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

  /* ── Stop Handler ───────────────────────────── */
  const handleStop = useCallback(() => {
    if (stopRef.current) {
      stopRef.current.abort();
      stopRef.current = null;
    }
    setIsBusy(false);
    setSearchStatus("");
  }, []);

  /* ── Send Handler ───────────────────────────── */
  const handleSend = async () => {
    const rawPrompt = draft.trim();
    if ((!rawPrompt && !imageFile && attachedFiles.length === 0) || isBusy) return;

    let fullPrompt = rawPrompt;
    if (attachedFiles.length > 0) {
      const fileContext = attachedFiles.map(f => `--- FILE: ${f.name} ---\n${f.content}\n--- END OF FILE ---`).join("\n\n");
      fullPrompt = (rawPrompt ? `${rawPrompt}\n\n` : "") + `[ATTACHED DOCUMENTS CONTEXT]\n${fileContext}`;
    }

    const history = [...messages];
    const userMsg = {
      id: createMessageId(),
      role: "user",
      content: rawPrompt || (attachedFiles.length > 0 ? `Attached ${attachedFiles.length} file(s) for analysis.` : "Please analyze this image."),
      mode: thinkMode ? "think" : "normal",
      attachments: attachedFiles.length > 0 ? attachedFiles.map(f => ({ name: f.name, type: "file" })) : undefined
    };

    setMessages((prev) => [...prev, userMsg]);
    setDraft("");
    setAttachedFiles([]);
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
        createConvPromise = createConversation(buildTitle(rawPrompt, Boolean(imageFile))).then(created => {
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
        const result = await analyzeImage(imageFile, rawPrompt || undefined);
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
      if (/^\/(imagine|generate)\s+/i.test(rawPrompt)) {
        const imagePrompt = rawPrompt.replace(/^\/(imagine|generate)\s+/i, "");
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
      
      // Initialize AbortController for this request
      const controller = new AbortController();
      stopRef.current = controller;

      await streamChat(
        fullPrompt,
        thinkMode ? "think" : "normal",
        history.slice(-20).map((m) => ({ role: m.role, content: m.content })),
        {
          onModeDetected: (modeData) => {
            setMsgIsWeb(modeData.web_search);
            setMsgIsImage(modeData.image_search);
            
            // Set specific status message
            const text = modeData.image_search 
              ? "Finding high-quality images..." 
              : "Searching the web...";
            setSearchStatus(text);

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
              web_results: data.web_results ?? [],
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
            setIsBusy(false); // Force unlock UI
            setStopSignal(null);
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
        searchMode,
        controller.signal
      );
    } catch (err) {
      if (err.name === "AbortError") {
        console.log("Stream aborted by user.");
        return;
      }
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

  /* ── Artifact Extraction ───────────────────── */
  useEffect(() => {
    // Look at the latest assistant message to see if it poured out an artifact
    const latestBot = [...messages].reverse().find(m => m.role === "assistant");
    if (latestBot && latestBot.content) {
      // 1. Try our strict tag format
      const tagMatch = latestBot.content.match(/<lacunex-artifact[^>]*>([\s\S]*?)<\/lacunex-artifact>/i);
      if (tagMatch && tagMatch[1]) {
        setActiveArtifact(tagMatch[1].trim());
        return;
      }
      
      // 2. Fallback: Many models ignore XML tags and just use markdown code blocks
      const mdMatch = latestBot.content.match(/```(?:html|jsx|tsx|js)\s*([\s\S]*?)```/i);
      if (mdMatch && mdMatch[1]) {
        setActiveArtifact(mdMatch[1].trim());
        return;
      }
      // If we are fully done and no artifact is found, we could clear it, but let's keep the split screen active if the user explicitly created one unless they close it.
    }
  }, [messages, isBusy]);

  /* ── Render ─────────────────────────────────── */
  return (
    <div className={`chat-container ${activeArtifact ? "has-artifact" : ""}`}>
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
          {messages.length === 0 && !isLoading ? (
            emptyState
          ) : (
            <div className={`message-list ${isLoading ? "op-50" : ""}`}>
              {/* Optional: Small top-aligned spinner when switching workspaces */}
              {isLoading && (
                <div className="workspace-loader">
                  <IconSpinner />
                  <span>Syncing workspace...</span>
                </div>
              )}
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
          {attachedFiles.length > 0 && (
            <div className="attached-files-row" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", padding: "0.5rem 1rem 0" }}>
              {attachedFiles.map((f, i) => (
                <div key={i} className="file-pill" style={{ display: "flex", alignItems: "center", gap: "0.25rem", padding: "4px 8px", background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: "8px", fontSize: "0.75rem", color: "#e2e8f0" }}>
                  <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                  <button type="button" onClick={() => removeAttachedFile(i)} style={{ background: "transparent", color: "#a855f7", cursor: "pointer", marginLeft: "4px" }}>&times;</button>
                </div>
              ))}
            </div>
          )}
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
            <div style={{ display: "flex", alignItems: "center", gap: "4px", paddingLeft: "10px" }}>
              <label className="msg-action-btn" style={{ cursor: "pointer", padding: "8px", color: "var(--text-secondary)", position: "relative" }} title="Attach Files">
                <IconPaperclip />
                <input type="file" multiple style={{ display: "none" }} onChange={handleFileAttach} accept=".pdf,.docx,.xlsx,.txt,.md,.csv" disabled={isExtracting} />
                {isExtracting && (
                  <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-surface)", borderRadius: "8px" }}>
                    <IconSpinner />
                  </span>
                )}
              </label>
              {!imagePreview && (
                <div style={{ padding: "8px" }}>
                  <ImageUpload onClear={clearImage} onSelect={handleImageSelect} />
                </div>
              )}
            </div>
            <textarea
              ref={textareaRef}
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={imageFile ? "Add a prompt for this image..." : (attachedFiles.length > 0 ? "Ask about these documents..." : "Message LACUNEX AI...")}
              className="composer-textarea"
            />
            {isBusy ? (
              <button
                type="button"
                onClick={handleStop}
                className="stop-btn animate-enter"
                aria-label="Stop Response"
                title="Stop Response"
              >
                <div className="stop-icon" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={(!draft.trim() && !imageFile)}
                className="send-btn"
                aria-label="Send"
              >
                <IconArrowUp />
              </button>
            )}
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
      
      {/* Interactive Artifact Split Screen */}
      {activeArtifact && (
        <ArtifactViewer code={activeArtifact} onClose={() => setActiveArtifact(null)} />
      )}
    </div>
  );
}
