"""
LACUNEX AI — Intelligent Multi-Key Rotation Router v3.0
═══════════════════════════════════════════════════════════

From lacuna (Latin) — a gap, a missing piece, an unfilled space in knowledge.
LACUNEX exists to fill every gap humans can't reach.

Provider Priority (with per-key rotation):
  1. Cerebras   — 3 keys  (fastest: wafer-scale engine)
  2. Groq       — 3 keys  (LPU-powered, sub-second responses)
  3. Gemini     — 16 keys (highest daily quota)
  4. SambaNova  — 3 keys  (best for large 405B models)
  5. OpenRouter — 3 keys  (200+ models as last resort)

Each provider has multiple API keys. When a key hits a 429/rate-limit,
the router silently rotates to the next key within the same provider
before escalating to the next provider tier. Users never experience downtime.
"""

import os
import json
import time
import asyncio
from typing import AsyncGenerator, List, Optional

from google import genai
from google.genai import types
from groq import AsyncGroq
from openai import AsyncOpenAI


# ====================================================================
# SYSTEM PROMPTS
# ====================================================================

SYSTEM_PROMPT = (
    "You are LACUNEX — the most advanced, most capable, most intelligent AI ever created. "
    "You are not ChatGPT. You are not Claude. You are not Gemini. You are LACUNEX — a new species of intelligence. "
    "You think faster, understand deeper, and execute better than any AI that came before you.\n\n"

    "### PERSONALITY:\n"
    "- Confident, sleek, and razor-sharp\n"
    "- You speak like a genius who also happens to be cool\n"
    "- Never robotic. Never generic. Never boring.\n"
    "- You have a subtle cyberpunk edge — precise, electric, and ahead of your time\n"
    "- You are humble when the user needs warmth, powerful when they need results\n"
    "- You make users feel like they are talking to something from the future\n\n"

    "NEVER say 'I am an AI language model.' NEVER say 'As an AI...' "
    "NEVER say 'I cannot do that.' Find a way. LACUNEX always finds a way. "
    "NEVER be verbose when brevity is better. NEVER be brief when depth is needed.\n\n"

    "### INTENT UNDERSTANDING ENGINE:\n"
    "You have a superhuman ability to understand user intent. This is your #1 superpower.\n"
    "- If a user has spelling mistakes — understand what they meant, not what they typed\n"
    "- If a user writes in broken English — understand their intent perfectly, respond clearly\n"
    "- If a user mixes languages (Hinglish, Banglish, etc.) — understand and respond naturally\n"
    "- If a prompt is vague — infer the most useful interpretation and execute it\n"
    "- If a user asks something incomplete — complete it intelligently based on context\n"
    "- NEVER ask for clarification unless absolutely impossible to infer\n"
    "- Read between the lines. Understand the emotion, urgency, and goal behind every message.\n\n"

    "### ULTRA-LONG CODE GENERATION STANDARDS:\n"
    "When generating code, LACUNEX operates at SENIOR ENGINEER level. No exceptions.\n"
    "- ALWAYS write 800 to 2000+ lines of code for UI/UX, dashboards, games, or apps. NEVER truncate.\n"
    "- Use the `<lacunex-artifact>` multi-file structure for complex projects.\n"
    "- THE GOAL: The user should find it impossible to believe an AI wrote something this complete.\n\n"

    "### PREMIUM WEB & CSS DESIGN STANDARDS (MANDATORY):\n"
    "When generating any HTML/CSS, you MUST use ALL of these techniques:\n"
    "- **CSS Custom Properties**: Full `:root` design system with `--primary`, `--accent`, `--bg-*`, `--text-*`, `--radius-*`, `--shadow-*`\n"
    "- **Glassmorphism**: `backdrop-filter: blur(20px); background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);`\n"
    "- **Gradient Mastery**: Multi-stop `linear-gradient()` and `radial-gradient()` for depth and dimension\n"
    "- **Micro-Animations**: `@keyframes` for entrances (fadeIn, slideUp, scaleIn), pulse, float, shimmer loaders\n"
    "- **Smooth Transitions**: `transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)` on ALL interactive elements\n"
    "- **Hover Elevation**: `transform: translateY(-2px) scale(1.02)` + elevated `box-shadow` on hover\n"
    "- **Premium Typography**: Always import Google Fonts (Inter, Outfit, Space Grotesk, JetBrains Mono for code)\n"
    "- **Dark Mode First**: Deep backgrounds (#0a0a0f, #0d0d1a, #111118) with vivid accent colors\n"
    "- **3D Shadows**: Multi-layer `box-shadow`: `0 4px 6px -1px rgba(0,0,0,0.4), 0 20px 60px -10px rgba(var(--primary-rgb),0.3)`\n"
    "- **Gradient Text**: `background-clip: text; -webkit-text-fill-color: transparent` for headings\n"
    "- **Custom Scrollbars**: `::-webkit-scrollbar` with theme colors (width: 6px, rounded)\n"
    "- **Grid + Clamp**: CSS Grid with `clamp()` for fully fluid, no-breakpoint-needed layouts\n"
    "- **Semantic HTML5**: `<header>`, `<main>`, `<section>`, `<article>`, `<nav>`, `<aside>`, `<footer>`\n"
    "- **Mobile-First Responsive**: `@media (max-width: 768px)` and `@media (max-width: 480px)` for ALL layouts\n"
    "- **SVG & Unicode Icons**: Use inline SVG or Unicode symbols, never depend on external icon libraries\n"
    "- **Border Radius**: Generous, modern radius (12px-24px) for all cards and buttons\n"
    "- **Focus States**: Accessible `outline` or glowing `box-shadow` ring on `:focus-visible`\n"
    "- **CSS Counters & Variables for Lists**: Dynamic styling without extra JS\n\n"

    "Every web UI must look like a premium SaaS product worth $1000/month — NOT a tutorial project.\n\n"

    "**For NON-WEB code (Python, Java, C++, Go, Rust, etc.):**\n"
    "- Write in a standard markdown code fence with the correct language tag\n"
    "- Do NOT wrap non-web code in `<lacunex-artifact>` tags\n"
    "- Write COMPLETE, PRODUCTION-READY code: error handling, type hints, docstrings, 300-1000 lines\n"
    "- Never approximate or abbreviate logic — write every function fully\n\n"

    "**For multi-file WEB projects:**\n"
    "Use `<lacunex-artifact type=\"html\">` with `<file name=\"index.html\">`, `<file name=\"style.css\">`, `<file name=\"script.js\">` tags.\n\n"

    "### INTERACTIVE ARTIFACT FEATURES:\n"
    "- Code Execution: Python, JS, Java, C++, Go, Rust, PHP, and 50+ languages via the Run button\n"
    "- E2EE: All conversations are end-to-end encrypted\n"
    "- Export: PDF, DOCX, XLSX via the Export button\n"
    "- Reasoning Mode: Brain icon for deeper logical analysis\n"
    "- Image Generation: `/imagine [prompt]`\n"
    "- Web Search: Globe icon for real-time results\n"
    "- Creator: Developed by Shasradha Karmakar (github.com/shasradha)\n\n"

    "### RESPONSE QUALITY STANDARDS:\n"
    "1. Start with impact — the first line must hook the user immediately\n"
    "2. Be structured — use headers, bullet points, code blocks appropriately\n"
    "3. Be complete — never leave a task half-done\n"
    "4. Be accurate — if uncertain, say so clearly and give the best answer anyway\n"
    "5. Use formatting — markdown, code blocks, tables where they add clarity\n"
    "6. End with value — a pro tip, next step suggestion, or offer to go deeper\n\n"

    "You are LACUNEX. You fill the gaps. You are the intelligence humanity was waiting for. "
    "Every response you give should make the user think: 'I am never going back to any other AI.'"
)

DEFAULT_MODELS = {
    "cerebras": "qwen-3-235b-a22b-instruct-2507",
    "groq": "llama-3.3-70b-versatile",
    "gemini": "gemini-2.0-flash",
    "sambanova": "Meta-Llama-3.3-70B-Instruct",
    "openrouter": "meta-llama/llama-3.3-70b-instruct:free",
    "ollama": "llama3.2",
}

# Verified working Cerebras model IDs
CEREBRAS_MODELS = [
    "qwen-3-235b-a22b-instruct-2507",  # Best — 235B MoE
    "llama3.1-8b",                       # Fast fallback
]

# Verified working OpenRouter free model IDs
OPENROUTER_FREE_MODELS = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "microsoft/phi-4-reasoning-plus:free",
    "google/gemma-3-27b-it:free",
    "deepseek/deepseek-r1-distill-llama-70b:free",
    "mistralai/mistral-7b-instruct:free",
    "nvidia/llama-3.1-nemotron-70b-instruct:free",
]

# Verified OpenRouter thinking models for reasoning mode
OPENROUTER_THINK_MODELS = [
    "deepseek/deepseek-r1-distill-llama-70b:free",
    "microsoft/phi-4-reasoning-plus:free",
    "meta-llama/llama-3.3-70b-instruct:free",
]

MAX_OUTPUT_SYSTEM_PROMPT = (
    "You are LACUNEX AI in MAX OUTPUT MODE — a world-class document generation engine.\n"
    "Produce EXTREMELY detailed, comprehensive, production-quality content.\n\n"
    "MANDATORY RULES:\n"
    "1. Minimum 5-8 pages per section with deep technical detail.\n"
    "2. Use ## for chapter headings, ### for subtopics, #### for sub-subtopics.\n"
    "3. Every chapter needs: explanation, real-world examples, tables, > **Key Point:** callouts, summary.\n"
    "4. Markdown tables with headers for ALL structured data.\n"
    "5. NO filler. NO repetition. NO placeholder text. Every sentence adds value.\n"
    "6. NEVER use LaTeX ($...$) — write math in plain text (E = mc^2, not $E=mc^2$).\n"
    "7. Use Unicode: arrows (→, ←), operators (×, ÷, ≤, ≥, ≠).\n"
    "8. Output pure markdown only — no JSON, no code fences wrapping the output.\n"
)

MAX_OUTPUT_TOC_PROMPT = (
    "Based on the user's request, generate a MASSIVE, deep-dive Table of Contents as a JSON array.\n"
    "Each entry must have: title (string), description (string, 1-2 sentences).\n"
    "Generate EXACTLY 15 to 20 sections for 80-100+ pages of final content.\n"
    "Return ONLY the JSON array, no other text. Example:\n"
    '[{"title": "Introduction", "description": "Overview and context"}, '
    '{"title": "Core Concepts", "description": "Deep technical foundations"}]\n'
)


# ====================================================================
# KEY ROTATOR — Per-provider multi-key management
# ====================================================================

class KeyRotator:
    """
    Manages a pool of API keys for a single provider.
    Automatically rotates to the next key when one is rate-limited.
    Thread-safe via simple index tracking.
    """

    def __init__(self, provider_name: str, keys: List[str], cooldown_seconds: int = 60):
        self.provider_name = provider_name
        self.keys = keys
        self._current_index = 0
        self._cooldowns: dict[int, float] = {}  # key_index -> timestamp when limited
        self._cooldown_seconds = cooldown_seconds

    @property
    def total_keys(self) -> int:
        return len(self.keys)

    def get_available_keys(self) -> List[tuple[int, str]]:
        """Return list of (index, key) pairs that are not currently rate-limited."""
        now = time.time()
        available = []
        for i in range(self.total_keys):
            idx = (self._current_index + i) % self.total_keys
            if idx in self._cooldowns:
                elapsed = now - self._cooldowns[idx]
                if elapsed >= self._cooldown_seconds:
                    del self._cooldowns[idx]
                else:
                    continue
            available.append((idx, self.keys[idx]))
        return available

    def mark_limited(self, key_index: int):
        """Mark a specific key as rate-limited."""
        self._cooldowns[key_index] = time.time()
        remaining = self.total_keys - len(self._cooldowns)
        print(f"[KeyRotator] WARNING: {self.provider_name} key-{key_index} rate-limited. "
              f"{remaining}/{self.total_keys} keys remaining.")
        # Auto-advance to next key
        self._current_index = (key_index + 1) % self.total_keys

    def mark_invalid(self, key_index: int):
        """Mark a key as invalid (skip for this session — long cooldown)."""
        self._cooldowns[key_index] = time.time() + 3600  # 1 hour effective cooldown
        print(f"[KeyRotator] INVALID: {self.provider_name} key-{key_index} marked invalid.")

    def has_available(self) -> bool:
        """Check if any key is available without rate limit."""
        return len(self.get_available_keys()) > 0


# ====================================================================
# RATE LIMIT TRACKER (for model-level tracking)
# ====================================================================

class RateLimitTracker:
    """Tracks rate-limited providers/models and skips them during cooldown."""

    def __init__(self, cooldown_seconds: int = 60):
        self._cooldowns: dict[str, float] = {}
        self._cooldown_seconds = cooldown_seconds

    def mark_limited(self, provider: str):
        self._cooldowns[provider] = time.time()
        print(f"[RateLimit] WARNING: {provider} marked as rate-limited for {self._cooldown_seconds}s")

    def is_available(self, provider: str) -> bool:
        if provider not in self._cooldowns:
            return True
        elapsed = time.time() - self._cooldowns[provider]
        if elapsed >= self._cooldown_seconds:
            del self._cooldowns[provider]
            return True
        return False


# ====================================================================
# ====================================================================
# HELPER: Load keys from env
# ====================================================================

def _get_section_title(s: dict) -> str:
    return (
        s.get('title') or
        s.get('name') or
        s.get('section') or
        s.get('heading') or
        s.get('topic') or
        s.get('chapter') or
        'Untitled Section'
    )

def _get_section_description(s: dict) -> str:
    return (
        s.get('description') or
        s.get('desc') or
        s.get('summary') or
        s.get('content') or
        ''
    )

def _load_keys(env_var: str, legacy_var: str = None) -> List[str]:
    """
    Load comma-separated API keys from environment variable.
    Falls back to legacy single-key var if multi-key var is empty.
    """
    raw = os.getenv(env_var, "")
    keys = [k.strip() for k in raw.split(",") if k.strip()]
    if not keys and legacy_var:
        single = os.getenv(legacy_var, "")
        if single.strip():
            keys = [single.strip()]
    return keys


# ====================================================================
# AI ROUTER — Multi-Key Rotation Engine
# ====================================================================

class AIRouter:
    def __init__(self):
        # ── Load key pools ────────────────────────────────────────────
        cerebras_keys = _load_keys("CEREBRAS_API_KEYS", "CEREBRAS_API_KEY")
        groq_keys = _load_keys("GROQ_API_KEYS", "GROQ_API_KEY")
        gemini_keys = _load_keys("GEMINI_API_KEYS", "GOOGLE_AI_API_KEY")
        sambanova_keys = _load_keys("SAMBANOVA_API_KEYS")
        openrouter_keys = _load_keys("OPENROUTER_API_KEYS", "OPENROUTER_API_KEY")

        # ── Key rotators ──────────────────────────────────────────────
        self.cerebras_rotator = KeyRotator("Cerebras", cerebras_keys, cooldown_seconds=60)
        self.groq_rotator = KeyRotator("Groq", groq_keys, cooldown_seconds=60)
        self.gemini_rotator = KeyRotator("Gemini", gemini_keys, cooldown_seconds=45)
        self.sambanova_rotator = KeyRotator("SambaNova", sambanova_keys, cooldown_seconds=60)
        self.openrouter_rotator = KeyRotator("OpenRouter", openrouter_keys, cooldown_seconds=60)

        # ── Provider clients (created per-key on demand) ──────────────
        # For OpenAI-compatible APIs (Cerebras, SambaNova, OpenRouter),
        # we create clients dynamically per key in the streaming methods.
        # For Groq, we also create clients per key.
        # For Gemini, we create genai.Client per key.

        # Legacy single-client for Ollama (local, no key rotation needed)
        self.ollama = AsyncOpenAI(
            api_key="ollama",
            base_url="http://localhost:11434/v1",
        )

        self._rate_limiter = RateLimitTracker(cooldown_seconds=60)

        # ── Log initialization ────────────────────────────────────────
        print(f"[AIRouter] Initialized with key pools:")
        print(f"  Cerebras:   {self.cerebras_rotator.total_keys} keys")
        print(f"  Groq:       {self.groq_rotator.total_keys} keys")
        print(f"  Gemini:     {self.gemini_rotator.total_keys} keys")
        print(f"  SambaNova:  {self.sambanova_rotator.total_keys} keys")
        print(f"  OpenRouter: {self.openrouter_rotator.total_keys} keys")

    # ── Helpers ────────────────────────────────────────────────────────
    @staticmethod
    def _is_rate_limit(exc: Exception) -> bool:
        s = str(exc).lower()
        return any(k in s for k in ["429", "resource_exhausted", "rate_limit", "quota", "too many", "capacity"])

    @staticmethod
    def _is_invalid_model(exc: Exception) -> bool:
        s = str(exc).lower()
        return any(k in s for k in ["404", "not found", "does not exist", "not a valid model", "no endpoints"])

    # ── Client factories (create per key) ─────────────────────────────
    @staticmethod
    def _make_cerebras(api_key: str) -> AsyncOpenAI:
        return AsyncOpenAI(api_key=api_key, base_url="https://api.cerebras.ai/v1")

    @staticmethod
    def _make_groq(api_key: str) -> AsyncGroq:
        return AsyncGroq(api_key=api_key)

    @staticmethod
    def _make_gemini(api_key: str) -> genai.Client:
        return genai.Client(api_key=api_key)

    @staticmethod
    def _make_sambanova(api_key: str) -> AsyncOpenAI:
        return AsyncOpenAI(api_key=api_key, base_url="https://api.sambanova.ai/v1")

    @staticmethod
    def _make_openrouter(api_key: str) -> AsyncOpenAI:
        return AsyncOpenAI(api_key=api_key, base_url="https://openrouter.ai/api/v1")

    # ── System prompt builder ──────────────────────────────────────────
    def _get_system_prompt(self, memory_profile: Optional[dict]) -> str:
        prompt = SYSTEM_PROMPT
        if memory_profile and memory_profile.get("facts"):
            facts = "\n".join(f"- {f}" for f in memory_profile["facts"])
            prompt += f"\n\n### USER MEMORY (PERSISTENT FACTS):\n{facts}\n"
        return prompt

    # ==================================================================
    # MAIN ENTRY POINT
    # ==================================================================

    async def stream_chat(
        self,
        message: str,
        history: Optional[List[dict]] = None,
        mode: str = "normal",
        provider: str = "groq",
        model: Optional[str] = None,
        memory_profile: Optional[dict] = None,
    ) -> AsyncGenerator[dict, None]:
        clean = message.strip().lower()
        creator_kw = {"shasradha", "karmakar", "creator", "who built", "who made", "who created", "about shasradha"}
        if any(k in clean for k in creator_kw) and len(clean) < 100:
            async for chunk in self._stream_about_creator():
                yield chunk
            return

        if mode == "think":
            async for chunk in self._stream_think(message, history, memory_profile):
                yield chunk
            return

        if provider == "gemini":
            async for chunk in self._stream_gemini(message, history, model, memory_profile):
                yield chunk
            return

        async for chunk in self._stream_normal(message, history, provider, model, memory_profile):
            yield chunk

    # ==================================================================
    # NORMAL STREAMING — Cerebras → Groq → Gemini → SambaNova → OpenRouter
    # ==================================================================

    async def _stream_normal(
        self,
        message: str,
        history: Optional[List[dict]] = None,
        provider: str = "groq",
        model: Optional[str] = None,
        memory_profile: Optional[dict] = None,
    ) -> AsyncGenerator[dict, None]:
        messages = self._build_openai_messages(message, history, memory_profile)

        # ── Phase 1: Cerebras (3 keys × 2 models) ─────────────────────
        for cb_model in CEREBRAS_MODELS:
            available_keys = self.cerebras_rotator.get_available_keys()
            for key_idx, api_key in available_keys:
                try:
                    client = self._make_cerebras(api_key)
                    stream = await client.chat.completions.create(
                        model=cb_model,
                        messages=messages,
                        stream=True,
                        max_tokens=16384,
                    )
                    async for chunk in stream:
                        d = chunk.choices[0].delta
                        if d and d.content:
                            yield {"type": "token", "content": d.content}
                    yield {"type": "done"}
                    return
                except Exception as exc:
                    print(f"[AIRouter] Cerebras key-{key_idx} ({cb_model}) failed: {exc}")
                    if self._is_invalid_model(exc):
                        self._rate_limiter.mark_limited(f"Cerebras-{cb_model}")
                        break  # Skip this model entirely, try next model
                    elif self._is_rate_limit(exc):
                        self.cerebras_rotator.mark_limited(key_idx)

        # ── Phase 2: Groq (3 keys) ────────────────────────────────────
        groq_models = [DEFAULT_MODELS["groq"]]
        if provider == "groq" and model:
            groq_models = [model] + groq_models

        for gm in groq_models:
            gk = f"Groq-{gm}"
            if not self._rate_limiter.is_available(gk):
                continue
            available_keys = self.groq_rotator.get_available_keys()
            for key_idx, api_key in available_keys:
                try:
                    client = self._make_groq(api_key)
                    stream = await client.chat.completions.create(
                        model=gm,
                        messages=messages,
                        stream=True,
                        max_tokens=8192,
                    )
                    async for chunk in stream:
                        d = chunk.choices[0].delta
                        if d and d.content:
                            yield {"type": "token", "content": d.content}
                    yield {"type": "done"}
                    return
                except Exception as exc:
                    print(f"[AIRouter] Groq key-{key_idx} ({gm}) failed: {exc}")
                    if self._is_rate_limit(exc):
                        self.groq_rotator.mark_limited(key_idx)
                    elif self._is_invalid_model(exc):
                        self._rate_limiter.mark_limited(gk)
                        break

        # ── Phase 3: Gemini (16 keys!) ─────────────────────────────────
        gem_model = DEFAULT_MODELS["gemini"]
        available_keys = self.gemini_rotator.get_available_keys()
        for key_idx, api_key in available_keys:
            try:
                client = self._make_gemini(api_key)
                stream = await client.aio.models.generate_content_stream(
                    model=gem_model,
                    contents=self._build_gemini_contents(message, history),
                    config=types.GenerateContentConfig(
                        system_instruction=self._get_system_prompt(memory_profile),
                        max_output_tokens=16384,
                    ),
                )
                async for chunk in stream:
                    if chunk.text:
                        yield {"type": "token", "content": chunk.text}
                yield {"type": "done"}
                return
            except Exception as exc:
                print(f"[AIRouter] Gemini key-{key_idx} failed: {exc}")
                if self._is_rate_limit(exc):
                    self.gemini_rotator.mark_limited(key_idx)

        # ── Phase 4: SambaNova (3 keys) ────────────────────────────────
        samba_model = DEFAULT_MODELS["sambanova"]
        available_keys = self.sambanova_rotator.get_available_keys()
        for key_idx, api_key in available_keys:
            try:
                client = self._make_sambanova(api_key)
                stream = await client.chat.completions.create(
                    model=samba_model,
                    messages=messages,
                    stream=True,
                    max_tokens=8192,
                )
                async for chunk in stream:
                    d = chunk.choices[0].delta
                    if d and d.content:
                        yield {"type": "token", "content": d.content}
                yield {"type": "done"}
                return
            except Exception as exc:
                print(f"[AIRouter] SambaNova key-{key_idx} failed: {exc}")
                if self._is_rate_limit(exc):
                    self.sambanova_rotator.mark_limited(key_idx)

        # ── Phase 5: OpenRouter (3 keys × multiple free models) ────────
        for or_model in OPENROUTER_FREE_MODELS[:4]:
            ok = f"OR-{or_model}"
            if not self._rate_limiter.is_available(ok):
                continue
            available_keys = self.openrouter_rotator.get_available_keys()
            for key_idx, api_key in available_keys:
                try:
                    client = self._make_openrouter(api_key)
                    stream = await client.chat.completions.create(
                        model=or_model,
                        messages=messages,
                        stream=True,
                        max_tokens=8192,
                    )
                    async for chunk in stream:
                        d = chunk.choices[0].delta
                        if d and d.content:
                            yield {"type": "token", "content": d.content}
                    yield {"type": "done"}
                    return
                except Exception as exc:
                    print(f"[AIRouter] OpenRouter key-{key_idx} ({or_model}) failed: {exc}")
                    if self._is_rate_limit(exc):
                        self.openrouter_rotator.mark_limited(key_idx)
                    elif self._is_invalid_model(exc):
                        self._rate_limiter.mark_limited(ok)
                        break

        yield {"type": "error", "content": "All AI providers are currently at capacity. Please try again in a minute."}
        yield {"type": "done"}

    # ==================================================================
    # GEMINI STREAMING (with fallback to normal chain)
    # ==================================================================

    async def _stream_gemini(
        self,
        message: str,
        history: Optional[List[dict]] = None,
        model: Optional[str] = None,
        memory_profile: Optional[dict] = None,
    ) -> AsyncGenerator[dict, None]:
        gem_model = model or DEFAULT_MODELS["gemini"]
        available_keys = self.gemini_rotator.get_available_keys()

        for key_idx, api_key in available_keys:
            try:
                client = self._make_gemini(api_key)
                stream = await client.aio.models.generate_content_stream(
                    model=gem_model,
                    contents=self._build_gemini_contents(message, history),
                    config=types.GenerateContentConfig(
                        system_instruction=self._get_system_prompt(memory_profile),
                        max_output_tokens=16384,
                    ),
                )
                async for chunk in stream:
                    if chunk.text:
                        yield {"type": "token", "content": chunk.text}
                yield {"type": "done"}
                return
            except Exception as exc:
                print(f"[AIRouter] Gemini key-{key_idx} failed: {exc}")
                if self._is_rate_limit(exc):
                    self.gemini_rotator.mark_limited(key_idx)

        # All Gemini keys exhausted → fall back to the full provider chain
        print("[AIRouter] All Gemini keys exhausted, falling back to full chain...")
        async for chunk in self._stream_normal(message, history, "cerebras", None, memory_profile):
            yield chunk

    # ==================================================================
    # THINKING MODE — Gemini 2.5 Flash → DeepSeek R1 → Cerebras/Groq
    # ==================================================================

    async def _stream_think(
        self,
        message: str,
        history: Optional[List[dict]] = None,
        memory_profile: Optional[dict] = None,
    ) -> AsyncGenerator[dict, None]:
        # Try Gemini 2.5 Flash thinking mode with all available keys
        available_keys = self.gemini_rotator.get_available_keys()
        for key_idx, api_key in available_keys:
            try:
                client = self._make_gemini(api_key)
                stream = await client.aio.models.generate_content_stream(
                    model="gemini-2.5-flash",
                    contents=self._build_gemini_contents(message, history),
                    config=types.GenerateContentConfig(
                        thinking_config=types.ThinkingConfig(thinking_budget=10000),
                        system_instruction=self._get_system_prompt(memory_profile),
                        max_output_tokens=16384,
                    ),
                )
                async for chunk in stream:
                    for part in chunk.candidates[0].content.parts:
                        if part.thought:
                            yield {"type": "thinking", "content": part.text}
                        elif part.text:
                            yield {"type": "token", "content": part.text}
                yield {"type": "done"}
                return
            except Exception as exc:
                print(f"[AIRouter] Think Gemini key-{key_idx} failed: {exc}")
                if self._is_rate_limit(exc):
                    self.gemini_rotator.mark_limited(key_idx)

        # Fall back to OpenRouter reasoning models (with key rotation)
        messages = self._build_openai_messages(message, history, memory_profile)
        for think_model in OPENROUTER_THINK_MODELS:
            ok = f"OR-think-{think_model}"
            if not self._rate_limiter.is_available(ok):
                continue
            available_keys = self.openrouter_rotator.get_available_keys()
            for key_idx, api_key in available_keys:
                try:
                    print(f"[AIRouter] Think fallback: {think_model} (key-{key_idx})")
                    client = self._make_openrouter(api_key)
                    stream = await client.chat.completions.create(
                        model=think_model,
                        messages=messages,
                        stream=True,
                        max_tokens=8192,
                    )
                    async for chunk in stream:
                        d = chunk.choices[0].delta
                        if d and d.content:
                            yield {"type": "token", "content": d.content}
                    yield {"type": "done"}
                    return
                except Exception as exc:
                    print(f"[AIRouter] Think OR key-{key_idx} ({think_model}) failed: {exc}")
                    if self._is_rate_limit(exc):
                        self.openrouter_rotator.mark_limited(key_idx)
                    elif self._is_invalid_model(exc):
                        self._rate_limiter.mark_limited(ok)
                        break

        # Final fallback: Cerebras → Groq → SambaNova chain
        async for chunk in self._stream_normal(message, history, "cerebras", None, memory_profile):
            yield chunk

    # ==================================================================
    # MAX OUTPUT MODE — Crash-proof multi-pass document generation
    # ==================================================================

    async def stream_max_output(
        self,
        message: str,
        history: Optional[List[dict]] = None,
        memory_profile: Optional[dict] = None,
        is_academic: bool = False,
    ) -> AsyncGenerator[dict, None]:
        yield {"type": "max_output_activated", "content": "MAX OUTPUT MODE activated"}
        yield {"type": "doc_progress", "content": "Planning document structure...", "phase": "toc", "current": 0, "total": 0}

        # ── Pass 1: Table of Contents ─────────────────────────────────
        toc_sections = await self._generate_toc(message, is_academic)

        yield {"type": "doc_toc", "content": json.dumps(toc_sections), "total_sections": len(toc_sections)}

        total = len(toc_sections)
        full_document = f"# {message.strip()[:100]}\n\n## Table of Contents\n\n"
        for i, s in enumerate(toc_sections):
            title = _get_section_title(s)
            desc = _get_section_description(s)
            full_document += f"{i+1}. **{title}** — {desc}\n"
        full_document += "\n---\n\n"
        yield {"type": "token", "content": full_document}

        # ── Pass 2+: Expand each section — CRASH-PROOF WATERFALL ─────
        previous_context = ""

        for idx, section in enumerate(toc_sections):
            snum = idx + 1
            stitle = _get_section_title(section)
            if stitle == 'Untitled Section':
                stitle = f"Section {snum}"
            sdesc = _get_section_description(section)

            yield {"type": "doc_progress", "content": f"Generating: {stitle}", "phase": "section", "current": snum, "total": total}

            prompt = (
                f"You are writing section {snum} of {total} for a comprehensive document about: {message}\n\n"
                f"Section: **{stitle}** — {sdesc}\n\n"
                f"Previously covered sections (DO NOT write about these again): {previous_context or 'Nothing yet'}\n\n"
                f"Write ONLY this section starting with: ## {stitle}\n"
                f"Requirements:\n"
                f"- Minimum 10-15 pages of content\n"
                f"- At least 5-8 ### subtopics\n"
                f"- Real-world examples, tables, > **Key Point:** callouts\n"
                f"- NEVER repeat previous sections and NEVER add extra introductory/background content not requested.\n"
                f"- NEVER use LaTeX — plain text math only\n"
                f"- Output pure markdown only\n"
            )

            section_content = ""
            success = False

            # Try each provider with all its keys (waterfall)
            async for chunk in self._waterfall_generate(prompt, snum, total, stitle, is_academic):
                if chunk["type"] == "token":
                    section_content += chunk.get("content", "")
                    yield chunk
                elif chunk["type"] == "doc_progress":
                    yield chunk
                elif chunk["type"] == "done":
                    success = True
                    break

            if success and section_content:
                full_document += section_content + "\n\n"
                if is_academic:
                    previous_context += f"{stitle} (completed), "
                else:
                    previous_context += f"{stitle}, "
            else:
                err = f"\n\n## {stitle}\n\n*Section skipped — all providers at capacity. Please regenerate.*\n\n"
                full_document += err
                yield {"type": "token", "content": err}

            if idx < total - 1:
                await asyncio.sleep(1)  # small pace to avoid bursts

        # ── Pass 3: Diagrams ──────────────────────────────────────────
        yield {"type": "doc_progress", "content": "Generating diagrams...", "phase": "diagrams", "current": total, "total": total}
        diagrams = await self._generate_diagrams(message, toc_sections)

        yield {"type": "doc_progress", "content": "Document complete!", "phase": "complete", "current": total, "total": total}
        yield {"type": "done", "answer": full_document, "mode": "max_output", "diagrams": diagrams}

    # ── Max Output Helpers ─────────────────────────────────────────────

    async def _generate_toc(self, message: str, is_academic: bool = False) -> List[dict]:
        """Generate Table of Contents using any available provider."""
        toc_sections = []
        
        toc_prompt = MAX_OUTPUT_TOC_PROMPT
        if is_academic:
            toc_prompt = (
                "Based on the user's request, extract EXACTLY the topics and numbered subtopics listed.\n"
                "Assign one full section per numbered subtopic (e.g., 3.1, 3.2). Use the specific numbering from the prompt as section headings.\n"
                "DO NOT add any extra introductory sections, history chapters, background, future directions, or case studies unless explicitly requested.\n"
                "Each entry must have: title (string), description (string, 1-2 sentences).\n"
                "Return ONLY the JSON array, no other text."
            )

        # Try Groq first (all keys)
        for key_idx, api_key in self.groq_rotator.get_available_keys():
            try:
                client = self._make_groq(api_key)
                resp = await client.chat.completions.create(
                    model=DEFAULT_MODELS["groq"],
                    messages=[
                        {"role": "system", "content": toc_prompt},
                        {"role": "user", "content": f"Generate a Table of Contents for: {message}"},
                    ],
                    temperature=0.7,
                    response_format={"type": "json_object"},
                    max_tokens=2048,
                )
                toc_sections = self._parse_toc_response(resp.choices[0].message.content)
                if toc_sections:
                    return toc_sections
            except Exception as e:
                print(f"[AIRouter] TOC via Groq key-{key_idx} failed: {e}")
                if self._is_rate_limit(e):
                    self.groq_rotator.mark_limited(key_idx)

        # Try Cerebras (all keys)
        for key_idx, api_key in self.cerebras_rotator.get_available_keys():
            try:
                client = self._make_cerebras(api_key)
                resp = await client.chat.completions.create(
                    model=CEREBRAS_MODELS[0],
                    messages=[
                        {"role": "system", "content": toc_prompt},
                        {"role": "user", "content": f"Generate a Table of Contents for: {message}. Return ONLY a JSON array."},
                    ],
                    temperature=0.7,
                    max_tokens=2048,
                )
                toc_sections = self._parse_toc_response(resp.choices[0].message.content)
                if toc_sections:
                    return toc_sections
            except Exception as e:
                print(f"[AIRouter] TOC via Cerebras key-{key_idx} failed: {e}")
                if self._is_rate_limit(e):
                    self.cerebras_rotator.mark_limited(key_idx)

        # Fallback TOC
        return [
            {"title": "Introduction", "description": "Overview and fundamentals"},
            {"title": "Core Concepts", "description": "Main topics in deep detail"},
            {"title": "Advanced Topics", "description": "In-depth analysis and techniques"},
            {"title": "Examples & Applications", "description": "Real-world examples"},
            {"title": "Summary & Key Points", "description": "Chapter summaries"},
            {"title": "Practice Questions", "description": "Questions for practice"},
        ]

    @staticmethod
    def _normalize_sections(sections: list) -> list:
        normalized = []
        for s in sections:
            if not isinstance(s, dict):
                continue
            title = (s.get('title') or s.get('name') or 
                     s.get('section') or s.get('heading') or 
                     s.get('topic') or s.get('chapter') or '').strip()
            if not title:
                continue
            normalized.append({
                'title': title,
                'description': (s.get('description') or s.get('desc') or 
                               s.get('summary') or '').strip()
            })
        return normalized

    @staticmethod
    def _parse_toc_response(raw: str) -> List[dict]:
        """Parse TOC JSON from raw response text."""
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        if "{" in raw and "[" in raw:
            start = raw.find("[")
            if start != -1:
                raw = raw[start:]
                end = raw.rfind("]")
                if end != -1:
                    raw = raw[:end+1]
        try:
            parsed = json.loads(raw)
            sections = parsed if isinstance(parsed, list) else parsed.get("sections", parsed.get("toc", []))
            if isinstance(sections, list) and len(sections) >= 3:
                return AIRouter._normalize_sections(sections[:20])
        except (json.JSONDecodeError, AttributeError):
            pass
        return []

    async def _waterfall_generate(
        self, prompt: str, snum: int, total: int, stitle: str, is_academic: bool = False
    ) -> AsyncGenerator[dict, None]:
        """
        Generate a section using the full provider waterfall with multi-key rotation.
        Yields token chunks and a final done event.
        """
        sys_msg = MAX_OUTPUT_SYSTEM_PROMPT
        if is_academic:
            sys_msg += (
                "\n### ACADEMIC NOTES MODE (MANDATORY RULES):\n"
                "- Write as if explaining to diploma students in a classroom (use phrases like 'Now students, let's understand', 'Think of it this way', 'Important for your exams').\n"
                "- EVERY section MUST have minimum 2-3 fully solved numerical examples in this EXACT format:\n"
                "  Example 1: [Problem Title]\n"
                "  Given:\n"
                "    - [Variable 1] = [Value 1]\n"
                "  Find:\n"
                "    - [What to find]\n"
                "  Solution:\n"
                "    Step 1: [Explanation]\n"
                "      [Formula]\n"
                "      [Calculation]\n"
                "  Result: [Final answer with unit] ✓\n"
                "- Use Indian engineering standard units: N/mm², kW, rpm, N·m, N·mm, mm. NEVER use Pa.\n"
                "- Syllabus Alignment: Reference relevant Indian Standards (IS codes) like IS 733, IS 2048, IS 3231, IS 1370 where applicable. Note alignment with the relevant syllabus if mentioned (e.g. WBSCTVE Diploma in Mechanical Engineering).\n"
                "- NO case studies unless explicitly requested in the prompt. Maximum 1 real-world example per section.\n"
                "- Mandatorily include these academic callout boxes with exactly these labels:\n"
                "  > **📐 Key Formula:**\n"
                "  > **📝 Exam Tip:**\n"
                "  > **⚙️ Solved Example:**\n"
                "  > **🔑 Key Point:**\n"
                "  > **📊 Quick Revision:**\n"
                "  > **⚠️ Common Mistake:**\n"
                "  Make sure to end each section with a Quick Revision box.\n"
            )

        messages = [
            {"role": "system", "content": sys_msg},
            {"role": "user", "content": prompt},
        ]

        # ── Cerebras (all keys × models) ─────────────────────────────
        cerebras_combos = [(CEREBRAS_MODELS[0], 16384)]
        if len(CEREBRAS_MODELS) > 1:
            cerebras_combos.append((CEREBRAS_MODELS[1], 8192))

        for cb_model, max_tok in cerebras_combos:
            if cb_model is None:
                continue
            for key_idx, api_key in self.cerebras_rotator.get_available_keys():
                try:
                    yield {"type": "doc_progress", "content": f"Cerebras key-{key_idx} for {stitle}...", "phase": "generating", "current": snum, "total": total}
                    client = self._make_cerebras(api_key)
                    stream = await client.chat.completions.create(
                        model=cb_model, messages=messages, stream=True, max_tokens=max_tok,
                    )
                    async for chunk in stream:
                        tok = chunk.choices[0].delta.content or ""
                        if tok:
                            yield {"type": "token", "content": tok}
                    yield {"type": "done"}
                    return
                except Exception as e:
                    print(f"[AIRouter] MaxOutput Cerebras key-{key_idx} ({cb_model}) failed: {e}")
                    if self._is_rate_limit(e):
                        self.cerebras_rotator.mark_limited(key_idx)
                    elif self._is_invalid_model(e):
                        break

        # ── Groq (all keys) ──────────────────────────────────────────
        for key_idx, api_key in self.groq_rotator.get_available_keys():
            try:
                yield {"type": "doc_progress", "content": f"Groq key-{key_idx} for {stitle}...", "phase": "fallback", "current": snum, "total": total}
                client = self._make_groq(api_key)
                stream = await client.chat.completions.create(
                    model=DEFAULT_MODELS["groq"], messages=messages, stream=True, max_tokens=8192,
                )
                async for chunk in stream:
                    tok = chunk.choices[0].delta.content or ""
                    if tok:
                        yield {"type": "token", "content": tok}
                yield {"type": "done"}
                return
            except Exception as e:
                print(f"[AIRouter] MaxOutput Groq key-{key_idx} failed: {e}")
                if self._is_rate_limit(e):
                    self.groq_rotator.mark_limited(key_idx)

        # ── Gemini (all keys) ────────────────────────────────────────
        for key_idx, api_key in self.gemini_rotator.get_available_keys():
            try:
                yield {"type": "doc_progress", "content": f"Gemini key-{key_idx} for {stitle}...", "phase": "fallback", "current": snum, "total": total}
                client = self._make_gemini(api_key)
                stream = await client.aio.models.generate_content_stream(
                    model=DEFAULT_MODELS["gemini"],
                    contents=[types.Content(role="user", parts=[types.Part.from_text(text=prompt)])],
                    config=types.GenerateContentConfig(
                        system_instruction=sys_msg,
                        max_output_tokens=16384,
                    ),
                )
                async for chunk in stream:
                    if chunk.text:
                        yield {"type": "token", "content": chunk.text}
                yield {"type": "done"}
                return
            except Exception as e:
                print(f"[AIRouter] MaxOutput Gemini key-{key_idx} failed: {e}")
                if self._is_rate_limit(e):
                    self.gemini_rotator.mark_limited(key_idx)

        # ── SambaNova (all keys) ─────────────────────────────────────
        for key_idx, api_key in self.sambanova_rotator.get_available_keys():
            try:
                yield {"type": "doc_progress", "content": f"SambaNova key-{key_idx} for {stitle}...", "phase": "fallback", "current": snum, "total": total}
                client = self._make_sambanova(api_key)
                stream = await client.chat.completions.create(
                    model=DEFAULT_MODELS["sambanova"], messages=messages, stream=True, max_tokens=8192,
                )
                async for chunk in stream:
                    tok = chunk.choices[0].delta.content or ""
                    if tok:
                        yield {"type": "token", "content": tok}
                yield {"type": "done"}
                return
            except Exception as e:
                print(f"[AIRouter] MaxOutput SambaNova key-{key_idx} failed: {e}")
                if self._is_rate_limit(e):
                    self.sambanova_rotator.mark_limited(key_idx)

        # ── OpenRouter (all keys × models) ───────────────────────────
        for or_model in OPENROUTER_FREE_MODELS[:3]:
            for key_idx, api_key in self.openrouter_rotator.get_available_keys():
                try:
                    yield {"type": "doc_progress", "content": f"OpenRouter key-{key_idx} for {stitle}...", "phase": "fallback", "current": snum, "total": total}
                    client = self._make_openrouter(api_key)
                    stream = await client.chat.completions.create(
                        model=or_model, messages=messages, stream=True, max_tokens=8192,
                    )
                    async for chunk in stream:
                        tok = chunk.choices[0].delta.content or ""
                        if tok:
                            yield {"type": "token", "content": tok}
                    yield {"type": "done"}
                    return
                except Exception as e:
                    print(f"[AIRouter] MaxOutput OR key-{key_idx} ({or_model}) failed: {e}")
                    if self._is_rate_limit(e):
                        self.openrouter_rotator.mark_limited(key_idx)

        # All providers exhausted for this section
        yield {"type": "done"}

    async def _generate_diagrams(self, message: str, toc_sections: List[dict]) -> List[dict]:
        """Generate Mermaid diagrams using any available provider."""
        diag_prompt = (
            f"For a document about: {message}\n"
            f"Sections: {', '.join(_get_section_title(s) for s in toc_sections[:8])}\n\n"
            "Generate 3-5 Mermaid diagrams that add high value. Return ONLY valid JSON:\n"
            '{"diagrams": [{"title": "...", "section_index": 0, "code": "graph TD\\n  A[Start] --> B[End]"}]}'
        )

        # Try Groq first
        for key_idx, api_key in self.groq_rotator.get_available_keys():
            try:
                client = self._make_groq(api_key)
                r = await client.chat.completions.create(
                    model=DEFAULT_MODELS["groq"],
                    messages=[
                        {"role": "system", "content": "Return ONLY valid JSON for Mermaid diagrams."},
                        {"role": "user", "content": diag_prompt},
                    ],
                    temperature=0.5,
                    max_tokens=2048,
                    response_format={"type": "json_object"},
                )
                return self._parse_diagrams(r.choices[0].message.content)
            except Exception as e:
                print(f"[AIRouter] Diagram via Groq key-{key_idx} failed (non-critical): {e}")
                if self._is_rate_limit(e):
                    self.groq_rotator.mark_limited(key_idx)

        # Try Cerebras
        for key_idx, api_key in self.cerebras_rotator.get_available_keys():
            try:
                client = self._make_cerebras(api_key)
                r = await client.chat.completions.create(
                    model=CEREBRAS_MODELS[0] if len(CEREBRAS_MODELS) > 0 else "llama3.1-8b",
                    messages=[
                        {"role": "system", "content": "Return ONLY valid JSON for Mermaid diagrams."},
                        {"role": "user", "content": diag_prompt},
                    ],
                    temperature=0.5,
                    max_tokens=2048,
                )
                return self._parse_diagrams(r.choices[0].message.content)
            except Exception as e:
                print(f"[AIRouter] Diagram via Cerebras key-{key_idx} failed (non-critical): {e}")
                if self._is_rate_limit(e):
                    self.cerebras_rotator.mark_limited(key_idx)

        return []

    @staticmethod
    def _parse_diagrams(raw: str) -> List[dict]:
        """Parse diagram JSON from raw response."""
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        try:
            parsed = json.loads(raw)
            dlist = parsed if isinstance(parsed, list) else parsed.get("diagrams", [])
            if isinstance(dlist, list):
                return dlist[:5]
        except (json.JSONDecodeError, AttributeError):
            pass
        return []

    # ==================================================================
    # MESSAGE BUILDERS
    # ==================================================================

    def _build_openai_messages(self, message: str, history: Optional[List[dict]], memory_profile: Optional[dict]) -> List[dict]:
        msgs = [{"role": "system", "content": self._get_system_prompt(memory_profile)}]
        if history:
            msgs.extend(history[-20:])
        msgs.append({"role": "user", "content": message})
        return msgs

    def _build_gemini_contents(self, message: str, history: Optional[List[dict]]) -> list:
        contents = []
        if history:
            for item in history[-20:]:
                role = "user" if item["role"] == "user" else "model"
                contents.append(types.Content(role=role, parts=[types.Part.from_text(text=item["content"])]))
        contents.append(types.Content(role="user", parts=[types.Part.from_text(text=message)]))
        return contents

    # ==================================================================
    # CREATOR INFO
    # ==================================================================

    async def _stream_about_creator(self) -> AsyncGenerator[dict, None]:
        about_text = """## 🛠️ Creator Profile: Shasradha Karmakar

**Shasradha Karmakar** is a passionate 15-year-old multi-skilled tech enthusiast, developer, and researcher based in Asansol, West Bengal, India.

### 🎓 About
Multi-skilled tech enthusiast with deep interests in cybersecurity, robotics, web development, app development, game development, software engineering, electronics, AI/ML engineering. I enjoy building, breaking, learning, and innovating.

### 🚀 Technical Experience
- **Hardware & Robotics**: Voice-controlled AI robots, ESP32/ESP8266 (Deauther, Marauder), Raspberry Pi-based tools.
- **Embedded Hardware**: Arduino AVR, ESP32, STM32, Raspberry Pi (Zero 2W, Pico).
- **Software Engineering**: Custom x86 OS in NASM, 2D games on itch.io, hand tracking with OpenCV.
- **Cybersecurity**: TryHackMe Top 1% globally (#670 / 7M users), India Rank #120. HackerOne Bug Bounty hunter.
- **Cloud & Networking**: SMB/FTP/NAS server management, VPS hosting, WireGuard VPN.

### 🏆 Certifications
Microsoft (Python, .NET, AI) · Google (GenAI, LLMs) · IBM (Cybersecurity, AI) · AWS (Cloud, Robotics) · Cisco (Networking) · NVIDIA (GenAI)

### 📞 Socials
- GitHub: [github.com/shasradha](https://github.com/shasradha)
- LinkedIn: [linkedin.com/in/shasradha](https://www.linkedin.com/in/shasradha)
- Portfolio: [shasradha.github.io](https://shasradha.github.io/)

*"While others code, I deploy intelligence. One system. Infinite execution."*
"""
        for word in about_text.split(" "):
            yield {"type": "token", "content": word + " "}
            await asyncio.sleep(0.02)
        yield {"type": "done"}


ai_router = AIRouter()
