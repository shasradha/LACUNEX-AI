"use client";

export default function TypingIndicator() {
  return (
    <div className="msg-row msg-row-bot">
      <div className="msg-avatar">
        <div className="brand-badge brand-badge-sm">L</div>
      </div>
      <div className="msg-body">
        <div className="msg-bubble msg-bubble-bot">
          <div className="typing-dots">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        </div>
      </div>
    </div>
  );
}
