"use client";

export default function TypingIndicator() {
  return (
    <div className="msg-row msg-row-bot">
      <div className="msg-avatar">
        <div className="brand-badge brand-badge-sm">L</div>
      </div>
      <div className="msg-body">
        <div className="msg-bubble msg-bubble-bot typing-indicator-bubble">
          <div className="typing-indicator-content">
            <div className="typing-pulse-ring" />
            <span className="typing-label">LACUNEX is thinking</span>
            <div className="typing-dots">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
