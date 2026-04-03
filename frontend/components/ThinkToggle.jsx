"use client";

function IconBrain() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M12 18v-6"/>
    </svg>
  );
}

export default function ThinkToggle({ enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`think-toggle ${enabled ? "think-toggle-on" : "think-toggle-off"}`}
      title={enabled ? "Reasoning mode is ON" : "Enable reasoning mode"}
    >
      <IconBrain />
      {enabled ? "Reasoning On" : "Reasoning"}
    </button>
  );
}
