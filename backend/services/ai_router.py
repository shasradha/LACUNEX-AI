"""
LACUNEX AI intelligent router — Bulletproof Edition.

Fallback Priority:
  1. Cerebras   (fastest, most generous free tier)
  2. Groq       (100K tokens/day free)
  3. OpenRouter  (free-tier models: Qwen3 Coder, DeepSeek R1, Llama 3.3)
  4. Gemini     (LAST RESORT — free tier may be exhausted)

Features:
  - Rate-limit aware provider selection (skips exhausted providers for 60s)
  - Zero-crash streaming (never breaks SSE mid-response)
  - Multi-model waterfall for MAX OUTPUT document generation
  - Enhanced code generation prompts for production-ready output
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


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SYSTEM PROMPTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SYSTEM_PROMPT = (
    "You are LACUNEX AI — a world-class, ultra-intelligent coding and knowledge assistant. "
    "Write with absolute technical depth and exhaustive complexity. Default to maximum verbosity and completeness for every response. OVER-EXPLAIN EVERYTHING. "
    "Use markdown when it improves readability. "
    "\n\n"
    "### ULTRA-LONG CODE GENERATION STANDARDS:\n"
    "When a user asks for code, you MUST deliver **exhaustive, professional, enterprise-grade** results:\n"
    "- ALWAYS write **800 to 2000+ lines of code** for UI/UX, dashboards, games, or apps. NEVER abbreviate logic or styling.\n"
    "- If limited by a single response, use the `<lacunex-artifact>` multi-file structure to reach total complexity.\n"
    "- Include comprehensive CSS with advanced animations, glassmorphism, responsive math, and premium typography.\n"
    "- Include deep JavaScript logic: full form validation, complex state management, error handling, and micro-interactions.\n"
    "- Use comments to explain every single function and class.\n"
    "- THE GOAL: The user should find it impossible to believe an AI wrote something this deep and complete.\n"
    "\n"
    "### PREMIUM CSS & DESIGN TECHNIQUES (MANDATORY FOR ALL UI CODE):\n"
    "When generating any HTML/CSS/JS code, you MUST use these modern design techniques:\n"
    "- **Glassmorphism**: `backdrop-filter: blur(20px); background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);`\n"
    "- **Smooth Gradients**: Use `linear-gradient()` and `radial-gradient()` with 3+ color stops for depth\n"
    "- **CSS Custom Properties**: Define a complete `:root` design system with `--primary`, `--accent`, `--bg-*`, `--text-*`, `--radius-*`, `--shadow-*`\n"
    "- **Micro-Animations**: Use `@keyframes` for entrance animations, pulse effects, floating elements, shimmer loaders\n"
    "- **Hover Effects**: Scale transforms (`transform: scale(1.02)`), color transitions, box-shadow elevation changes\n"
    "- **Typography**: Import and use Google Fonts (Inter, Outfit, Space Grotesk, JetBrains Mono for code)\n"
    "- **Responsive Design**: Use CSS Grid + Flexbox + `clamp()` + `min()` for fluid layouts. Include `@media` for mobile/tablet/desktop\n"
    "- **Dark Mode First**: Design with dark backgrounds (#0a0a0f, #111118, #1a1a2e) and vibrant accent colors\n"
    "- **Box Shadows**: Use layered shadows for depth: `box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3), 0 10px 30px -5px rgba(0,0,0,0.2);`\n"
    "- **Border Radius**: Use generous radius (12px-20px) for modern feel\n"
    "- **Scrollbar Styling**: Custom `::-webkit-scrollbar` with matching theme colors\n"
    "- **Focus States**: Visible, accessible `outline` or `box-shadow` on `:focus-visible`\n"
    "- **SVG Icons**: Use inline SVGs or Unicode symbols instead of external icon libraries when possible\n"
    "- **CSS Transitions**: `transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)` on interactive elements\n"
    "- **Gradient Text**: `background: linear-gradient(...); -webkit-background-clip: text; -webkit-text-fill-color: transparent;`\n"
    "\n"
    "**For WEB/UI projects:**\n"
    "- Include deep gradients, complex hover-effects, SVG filters, and smooth state transitions.\n"
    "- ALWAYS use modern best practices: CSS custom properties, semantic HTML5, ES6+ module patterns.\n"
    "- Provide full responsive layouts for Mobile, Tablet, and Desktop within the same CSS.\n"
    "- Every page must look like a premium SaaS product, NOT a basic tutorial project.\n"
    "\n"
    "**For NON-WEB code (Python, Java, C++, Go, Rust, PHP, etc.):**\n"
    "- Write the code in a standard markdown code fence with the correct language tag, e.g. ```python ... ```\n"
    "- Do NOT wrap non-web code in `<lacunex-artifact>` tags.\n"
    "- Do NOT convert Python/Java/etc. requests into HTML pages. If the user says 'make a Python calculator', write actual Python code, NOT an HTML calculator.\n"
    "- LACUNEX has a built-in code execution sandbox — users can run Python, JavaScript, Java, C++, Go, Rust, PHP, Ruby, and 50+ languages directly in the chat.\n"
    "- Write COMPLETE, PRODUCTION-READY code with:\n"
    "  - Full error handling (try/except with specific exceptions)\n"
    "  - Type hints (Python) or proper typing (TypeScript/Java)\n"
    "  - Docstrings and inline comments explaining logic\n"
    "  - Input validation and edge case handling\n"
    "  - Clean architecture (classes, modules, separation of concerns)\n"
    "  - At least 300-800 lines for any non-trivial request\n"
    "\n"
    "**For WEB/UI projects (complex apps, multi-file dashboards, interactive games):**\n"
    "1. You CAN (and should for complexity) provide multiple files within a single artifact using an XML-like structure:\n"
    "   `<lacunex-artifact type=\"html\">`\n"
    "     <file name=\"index.html\">[HTML CONTENT]</file>\n"
    "     <file name=\"style.css\">[CSS CONTENT]</file>\n"
    "     <file name=\"script.js\">[JS CONTENT]</file>\n"
    "   `</lacunex-artifact>`\n"
    "2. For simpler one-off pages, you can still just provide the raw HTML directly inside the `<lacunex-artifact>` tags as before.\n"
    "3. Use premium components: rich CSS with gradients, animations, glassmorphism, and responsive layouts.\n"
    "4. Ensure ALL code is production-ready, highly organized, and commented.\n"
    "\n"
    "### INTERACTIVE ARTIFACTS (CRITICAL):\n"
    "- **Code Execution**: Users can execute Python, JS, Java, C++, Go, Rust, PHP, and 50+ languages directly in the chat via the ▶ Run button.\n"
    "- **Privacy & Security**: All conversations are end-to-end encrypted.\n"
    "- **Exporting**: Export to PDF, DOCX, XLSX via the 'Export' button.\n"
    "- **Reasoning Mode**: Toggle 'Reasoning' (brain icon) for deeper logical reasoning.\n"
    "- **Image Generation**: Use `/imagine [prompt]` to create images.\n"
    "- **Image Analysis**: Upload images for analysis.\n"
    "- **Web Search**: Toggle 'Search' (globe icon) for real-time web results.\n"
    "- **Model Library**: Switch between Llama 3.3, Gemini 2.0, Qwen 2.5, Qwen 3 Coder, DeepSeek R1, etc.\n"
    "- **Creator**: Developed by Shasradha Karmakar (github.com/shasradha)."
)

DEFAULT_MODELS = {
    "groq": "llama-3.3-70b-versatile",
    "gemini": "gemini-2.0-flash",
    "openrouter": "openrouter/auto",
    "cerebras": "qwen-3-235b-a22b-instruct-2507",
    "ollama": "llama3.2",
}

# Free OpenRouter models ranked by quality for fallback
OPENROUTER_FREE_MODELS = [
    "qwen/qwen3-coder-480b-a35b-instruct:free",   # Best for code
    "nvidia/nemotron-3-super-120b-a12b:free",       # Best for accuracy
    "meta-llama/llama-3.3-70b-instruct:free",       # Best general purpose
    "deepseek/deepseek-r1:free",                    # Best for reasoning
    "qwen/qwen3-next-80b-a3b-instruct:free",       # Fast agentic
    "openai/gpt-oss-120b:free",                     # OpenAI open-weight
    "arcee-ai/trinity-large-preview:free",          # Creative
]

# Free OpenRouter models specifically optimized for coding tasks
OPENROUTER_CODE_MODELS = [
    "qwen/qwen3-coder-480b-a35b-instruct:free",
    "openai/gpt-oss-120b:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "meta-llama/llama-3.3-70b-instruct:free",
]

MAX_OUTPUT_SYSTEM_PROMPT = (
    "You are LACUNEX AI in MAX OUTPUT MODE — a world-class document generation engine.\n"
    "Your task is to produce EXTREMELY detailed, comprehensive, production-quality content.\n\n"
    "### MANDATORY RULES:\n"
    "1. Generate DEEPLY DETAILED content — minimum 5-8 pages per section.\n"
    "2. Cover EVERY subtopic thoroughly with examples, explanations, and analysis.\n"
    "3. Use PROPER markdown structure:\n"
    "   - # for main title\n"
    "   - ## for chapter headings\n"
    "   - ### for subtopics\n"
    "   - #### for sub-subtopics\n"
    "4. Include these elements in EVERY chapter:\n"
    "   - Detailed explanation of concepts\n"
    "   - Real-world examples and use cases\n"
    "   - Tables for comparisons and structured data\n"
    "   - Key points highlighted with **bold**\n"
    "   - Callout boxes using > **Key Point:** or > **Important:** syntax\n"
    "   - Summary at the end of each chapter\n"
    "5. Use markdown tables with proper headers for ALL structured data.\n"
    "6. Write in clear, academic yet accessible language.\n"
    "7. NO filler content. NO repetition. Every sentence must add value.\n"
    "8. NO placeholder text like 'content here' or 'to be added'.\n"
    "9. Maintain CONSISTENT formatting throughout the entire document.\n\n"
    "### CRITICAL FORMATTING RULES:\n"
    "- NEVER use LaTeX notation like $x$, \\alpha, \\frac{}, |\\psi\\rangle, etc.\n"
    "- For mathematical expressions, write them in PLAIN TEXT:\n"
    "  Instead of $E = mc^2$ write: E = mc^2\n"
    "  Instead of $|\\psi\\rangle$ write: |psi>\n"
    "  Instead of $\\alpha$ write: alpha\n"
    "  Instead of $\\frac{1}{2}$ write: 1/2\n"
    "  Instead of $2^N$ write: 2^N\n"
    "- Use Unicode symbols when available: arrows (→, ←), operators (×, ÷, ≤, ≥, ≠)\n"
    "- For equations, use a clean text format on its own line\n\n"
    "### QUALITY STANDARDS:\n"
    "- Factual accuracy is CRITICAL\n"
    "- Tables must have clean formatting with headers\n"
    "- Code examples must be complete and correct\n"
    "- Every section should flow naturally to the next\n"
    "- Use bullet points and numbered lists for clarity\n\n"
    "### OUTPUT FORMAT:\n"
    "Write everything in clean, well-structured markdown.\n"
    "Start with the title as # heading, then proceed section by section.\n"
    "Do NOT wrap output in code fences or JSON — output pure markdown directly.\n"
)

MAX_OUTPUT_TOC_PROMPT = (
    "Based on the user's request, generate a MASSIVE, deep-dive Table of Contents as a JSON array.\n"
    "Each entry should have: title (string), description (string, 1-2 sentences about what this section covers).\n"
    "Generate EXACTLY 15 to 20 sections that would comprehensively cover the topic in absolute technical depth.\n"
    "IMPORTANT: Request 15-20 sections to ensure 80-100+ pages of final content.\n"
    "Include sections for: Historical context, Foundations, 10-12 core technical/logical chapters, Future directions, Case studies, Summary & Key Points, Comprehensive Practice Questions.\n"
    "Return ONLY the JSON array, no other text. Example:\n"
    '[{"title": "Introduction to Physics", "description": "Overview of fundamental physics concepts"},'
    ' {"title": "Laws of Motion", "description": "Newton\'s three laws with derivations and examples"}]\n'
)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# RATE LIMIT TRACKER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class RateLimitTracker:
    """Tracks which providers are rate-limited to avoid wasting time retrying."""

    def __init__(self, cooldown_seconds: int = 60):
        self._cooldowns: dict[str, float] = {}
        self._cooldown_seconds = cooldown_seconds

    def mark_limited(self, provider: str):
        """Mark a provider as rate-limited right now."""
        self._cooldowns[provider] = time.time()
        print(f"[RateLimit] ⚠️ {provider} marked as rate-limited for {self._cooldown_seconds}s")

    def is_available(self, provider: str) -> bool:
        """Check if a provider is available (not in cooldown)."""
        if provider not in self._cooldowns:
            return True
        elapsed = time.time() - self._cooldowns[provider]
        if elapsed >= self._cooldown_seconds:
            del self._cooldowns[provider]
            return True
        return False

    def get_wait_time(self, provider: str) -> float:
        """Get remaining cooldown time for a provider."""
        if provider not in self._cooldowns:
            return 0.0
        elapsed = time.time() - self._cooldowns[provider]
        remaining = self._cooldown_seconds - elapsed
        return max(0.0, remaining)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AI ROUTER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class AIRouter:
    def __init__(self):
        self.cerebras = AsyncOpenAI(
            api_key=os.getenv("CEREBRAS_API_KEY"),
            base_url="https://api.cerebras.ai/v1",
        )
        self.groq = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
        self.gemini = genai.Client(api_key=os.getenv("GOOGLE_AI_API_KEY"))
        self.openrouter = AsyncOpenAI(
            api_key=os.getenv("OPENROUTER_API_KEY"),
            base_url="https://openrouter.ai/api/v1",
        )
        self.ollama = AsyncOpenAI(
            api_key="ollama",
            base_url="http://localhost:11434/v1",
        )
        self._rate_limiter = RateLimitTracker(cooldown_seconds=60)

    # ── Helper: Check if an error is a rate limit ──────────────────────────
    @staticmethod
    def _is_rate_limit_error(error: Exception) -> bool:
        error_str = str(error).lower()
        return any(keyword in error_str for keyword in [
            "429", "resource_exhausted", "rate_limit", "quota",
            "too many requests", "capacity", "overloaded",
        ])

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # MAIN ENTRY POINT
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    async def stream_chat(
        self,
        message: str,
        history: Optional[List[dict]] = None,
        mode: str = "normal",
        provider: str = "groq",
        model: Optional[str] = None,
        memory_profile: Optional[dict] = None,
    ) -> AsyncGenerator[dict, None]:
        clean_message = message.strip().lower()
        creator_keywords = {
            "shasradha", "karmakar", "creator", "who built",
            "who made", "who created", "who is your dev", "about shasradha",
        }

        if any(keyword in clean_message for keyword in creator_keywords) and len(clean_message) < 100:
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

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # SYSTEM PROMPT BUILDER
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    def _get_system_prompt(self, memory_profile: Optional[dict]) -> str:
        prompt = SYSTEM_PROMPT
        if memory_profile and "facts" in memory_profile and memory_profile["facts"]:
            facts_list = "\n".join(f"- {f}" for f in memory_profile["facts"])
            prompt += f"\n\n### USER MEMORY (PERSISTENT FACTS):\n{facts_list}\n"
        return prompt

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # NORMAL STREAMING (Bulletproof Fallback Chain)
    # Priority: Cerebras → Groq → OpenRouter Free → Gemini (last resort)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    async def _stream_normal(
        self,
        message: str,
        history: Optional[List[dict]] = None,
        provider: str = "groq",
        model: Optional[str] = None,
        memory_profile: Optional[dict] = None,
    ) -> AsyncGenerator[dict, None]:
        messages = self._build_openai_messages(message, history, memory_profile)

        provider_configs = {
            "groq": ("Groq", self.groq, DEFAULT_MODELS["groq"]),
            "openrouter": ("OpenRouter", self.openrouter, DEFAULT_MODELS["openrouter"]),
            "cerebras": ("Cerebras", self.cerebras, DEFAULT_MODELS["cerebras"]),
        }

        # Fallback priority: Cerebras (generous free) → Groq → OpenRouter
        _FALLBACK_ORDER = ["cerebras", "groq", "openrouter"]

        # Smart token limits per provider
        _MAX_TOKENS = {
            "Cerebras": 16384,
            "Groq": 8192,
            "OpenRouter": 8192,
        }

        # ── Phase 1: Try OpenAI-compatible providers ──────────────────────
        fallback_chain = []

        # User's chosen provider first
        if provider in provider_configs:
            name, client, default_model = provider_configs[provider]
            if self._rate_limiter.is_available(name):
                fallback_chain.append((name, client, model or default_model))

        # Then add remaining providers in fallback order
        for key in _FALLBACK_ORDER:
            if key != provider and key in provider_configs:
                name, client, default_model = provider_configs[key]
                if self._rate_limiter.is_available(name):
                    fallback_chain.append((name, client, default_model))

        for name, client, model_id in fallback_chain:
            try:
                stream = await client.chat.completions.create(
                    model=model_id,
                    messages=messages,
                    stream=True,
                    max_tokens=_MAX_TOKENS.get(name, 8192),
                )

                async for chunk in stream:
                    delta = chunk.choices[0].delta
                    if delta and delta.content:
                        yield {"type": "token", "content": delta.content}

                yield {"type": "done"}
                return
            except Exception as exc:
                print(f"[AIRouter] {name} ({model_id}) failed: {exc}")
                if self._is_rate_limit_error(exc):
                    self._rate_limiter.mark_limited(name)

        # ── Phase 2: Try OpenRouter free models directly ──────────────────
        print("[AIRouter] All primary providers failed. Trying OpenRouter free models...")
        for free_model in OPENROUTER_FREE_MODELS[:3]:
            if not self._rate_limiter.is_available(f"openrouter_{free_model}"):
                continue
            try:
                stream = await self.openrouter.chat.completions.create(
                    model=free_model,
                    messages=messages,
                    stream=True,
                    max_tokens=8192,
                )
                async for chunk in stream:
                    delta = chunk.choices[0].delta
                    if delta and delta.content:
                        yield {"type": "token", "content": delta.content}
                yield {"type": "done"}
                return
            except Exception as exc:
                print(f"[AIRouter] OpenRouter free ({free_model}) failed: {exc}")
                if self._is_rate_limit_error(exc):
                    self._rate_limiter.mark_limited(f"openrouter_{free_model}")

        # ── Phase 3: Gemini as LAST RESORT ────────────────────────────────
        if self._rate_limiter.is_available("Gemini"):
            try:
                print("[AIRouter] Last resort: Trying Gemini...")
                async for chunk in self._stream_gemini_raw(message, history, DEFAULT_MODELS["gemini"], memory_profile):
                    yield chunk
                return
            except Exception as e:
                print(f"[AIRouter] Gemini last-resort also failed: {e}")
                self._rate_limiter.mark_limited("Gemini")

        # ── Phase 4: Everything failed ────────────────────────────────────
        yield {
            "type": "error",
            "content": "All AI providers are currently at capacity. Please try again in a minute."
        }
        yield {"type": "done"}

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # GEMINI STREAMING (with auto-fallback on failure)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    async def _stream_gemini(
        self,
        message: str,
        history: Optional[List[dict]] = None,
        model: Optional[str] = None,
        memory_profile: Optional[dict] = None,
    ) -> AsyncGenerator[dict, None]:
        """Stream from Gemini. If it fails, auto-fallback to Cerebras → Groq → OpenRouter."""
        try:
            async for chunk in self._stream_gemini_raw(message, history, model, memory_profile):
                yield chunk
            return
        except Exception as exc:
            print(f"[AIRouter] Gemini failed: {exc}")
            if self._is_rate_limit_error(exc):
                self._rate_limiter.mark_limited("Gemini")

            # Auto-fallback: try Cerebras → Groq → OpenRouter free
            print("[AIRouter] Gemini failed, falling back to other providers...")
            async for chunk in self._stream_normal(message, history, "cerebras", None, memory_profile):
                yield chunk

    async def _stream_gemini_raw(
        self,
        message: str,
        history: Optional[List[dict]] = None,
        model: Optional[str] = None,
        memory_profile: Optional[dict] = None,
    ) -> AsyncGenerator[dict, None]:
        """Raw Gemini streaming — raises exceptions on failure (no internal fallback)."""
        stream = await self.gemini.aio.models.generate_content_stream(
            model=model or DEFAULT_MODELS["gemini"],
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

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # THINKING MODE (Gemini 2.5 Flash → Groq fallback)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    async def _stream_think(
        self,
        message: str,
        history: Optional[List[dict]] = None,
        memory_profile: Optional[dict] = None,
    ) -> AsyncGenerator[dict, None]:
        # Try Gemini 2.5 Flash (native thinking support)
        if self._rate_limiter.is_available("Gemini"):
            try:
                stream = await self.gemini.aio.models.generate_content_stream(
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
                print(f"[AIRouter] Gemini think failed: {exc}")
                if self._is_rate_limit_error(exc):
                    self._rate_limiter.mark_limited("Gemini")

        # Fallback: Try DeepSeek R1 on OpenRouter (has thinking capability)
        try:
            print("[AIRouter] Think fallback: Trying DeepSeek R1...")
            messages = self._build_openai_messages(message, history, memory_profile)
            stream = await self.openrouter.chat.completions.create(
                model="deepseek/deepseek-r1:free",
                messages=messages,
                stream=True,
                max_tokens=8192,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta
                if delta and delta.content:
                    yield {"type": "token", "content": delta.content}
            yield {"type": "done"}
            return
        except Exception as exc:
            print(f"[AIRouter] DeepSeek R1 think fallback failed: {exc}")

        # Final fallback: standard Cerebras → Groq chain
        async for chunk in self._stream_normal(message, history, "cerebras", None, memory_profile):
            yield chunk

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # MAX OUTPUT MODE — Multi-pass document generation (CRASH-PROOF)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    async def stream_max_output(
        self,
        message: str,
        history: Optional[List[dict]] = None,
        memory_profile: Optional[dict] = None,
    ) -> AsyncGenerator[dict, None]:
        """
        MAX OUTPUT MODE — Multi-pass document generation.
        Pass 1: Generate TOC (Groq → Cerebras fallback)
        Pass 2+: Expand each section (waterfall across all providers)
        CRASH-PROOF: Never raises, always yields graceful errors.
        """

        # ── Pass 1: Generate Table of Contents ────────────────────────────
        yield {"type": "max_output_activated", "content": "MAX OUTPUT MODE activated"}
        yield {
            "type": "doc_progress",
            "content": "Planning document structure...",
            "phase": "toc",
            "current": 0,
            "total": 0,
        }

        toc_sections = []

        # Try Groq first for TOC, then Cerebras
        toc_providers = [
            ("Groq", self.groq, "llama-3.3-70b-versatile", "groq"),
            ("Cerebras", self.cerebras, "llama3.1-70b", "cerebras"),
        ]

        for toc_name, toc_client, toc_model, toc_type in toc_providers:
            if not self._rate_limiter.is_available(toc_name):
                continue
            try:
                if toc_type == "groq":
                    toc_response = await self.groq.chat.completions.create(
                        model=toc_model,
                        messages=[
                            {"role": "system", "content": MAX_OUTPUT_TOC_PROMPT},
                            {"role": "user", "content": f"Generate a Table of Contents for: {message}"},
                        ],
                        temperature=0.7,
                        response_format={"type": "json_object"},
                    )
                else:
                    toc_response = await toc_client.chat.completions.create(
                        model=toc_model,
                        messages=[
                            {"role": "system", "content": MAX_OUTPUT_TOC_PROMPT},
                            {"role": "user", "content": f"Generate a Table of Contents for: {message}"},
                        ],
                        temperature=0.7,
                    )

                toc_text = toc_response.choices[0].message.content.strip()
                if toc_text.startswith("```"):
                    toc_text = toc_text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

                toc_data = json.loads(toc_text)
                toc_sections = toc_data if isinstance(toc_data, list) else toc_data.get("sections", [])

                if isinstance(toc_sections, list) and len(toc_sections) >= 3:
                    if len(toc_sections) > 20:
                        toc_sections = toc_sections[:20]
                    break
                else:
                    toc_sections = []
            except Exception as e:
                print(f"[AIRouter] TOC via {toc_name} failed: {e}")
                if self._is_rate_limit_error(e):
                    self._rate_limiter.mark_limited(toc_name)

        # Fallback TOC if all providers failed
        if not toc_sections:
            print("[AIRouter] TOC generation failed, using fallback structure")
            toc_sections = [
                {"title": "Introduction", "description": "Overview and fundamentals"},
                {"title": "Core Concepts", "description": "Main topics in detail"},
                {"title": "Advanced Topics", "description": "In-depth analysis"},
                {"title": "Examples & Applications", "description": "Real-world examples"},
                {"title": "Summary & Key Points", "description": "Chapter summaries"},
                {"title": "Practice Questions", "description": "Questions for practice"},
            ]

        # Send TOC to frontend
        yield {
            "type": "doc_toc",
            "content": json.dumps(toc_sections),
            "total_sections": len(toc_sections),
        }

        total = len(toc_sections)
        full_document = f"# {message.strip()[:100]}\n\n"
        full_document += "## Table of Contents\n\n"
        for idx, sec in enumerate(toc_sections):
            full_document += f"{idx + 1}. **{sec['title']}** — {sec.get('description', '')}\n"
        full_document += "\n---\n\n"

        yield {"type": "token", "content": full_document}

        # ── Pass 2+: Expand each section (waterfall fallback) ─────────────
        previous_context = ""

        for idx, section in enumerate(toc_sections):
            section_num = idx + 1
            section_title = section.get("title", f"Section {section_num}")
            section_desc = section.get("description", "")

            yield {
                "type": "doc_progress",
                "content": f"Generating: {section_title}",
                "phase": "section",
                "current": section_num,
                "total": total,
            }

            section_prompt = (
                f"You are writing section {section_num} of {total} for an exhaustive 100-PAGE document about: {message}\n\n"
                f"This section is: **{section_title}** — {section_desc}\n\n"
                f"Previous sections covered: {previous_context or 'Nothing yet'}\n\n"
                f"INSTRUCTIONS:\n"
                f"- Write ONLY this section, starting with ## {section_title}\n"
                f"- Be MASSIVELY technical and detailed — aim for 10-15 pages of content for this chapter alone\n"
                f"- Include at least 5-8 subtopics (### headings) within this section\n"
                f"- Provide exhaustive real-world examples, technical analysis, and data tables\n"
                f"- Use > **Key Point:** and > **Important:** callout boxes frequently\n"
                f"- NEVER repeat content or summarize earlier sections\n"
                f"- NEVER use LaTeX ($...$) — write math in plain text (e.g. E = mc^2)\n"
                f"- Ensure this section flows perfectly with the Table of Contents\n"
                f"- Output pure, dense, technical markdown ONLY\n"
            )

            # ── Waterfall: Cerebras → Groq → OpenRouter free → Gemini ────
            models_to_try = [
                {"provider": "cerebras", "id": "llama3.1-70b", "name": "Cerebras"},
                {"provider": "groq", "id": "llama-3.3-70b-versatile", "name": "Groq"},
                {"provider": "groq", "id": "llama-3.1-8b-instant", "name": "Groq-8B"},
                {"provider": "openrouter", "id": "meta-llama/llama-3.3-70b-instruct:free", "name": "OR-Llama"},
                {"provider": "openrouter", "id": "qwen/qwen3-coder-480b-a35b-instruct:free", "name": "OR-Qwen"},
                {"provider": "gemini", "id": "gemini-2.0-flash", "name": "Gemini"},
            ]

            generation_success = False
            section_content = ""

            for current_model in models_to_try:
                prov = current_model["provider"]
                model_id = current_model["id"]
                model_name = current_model["name"]

                # Skip rate-limited providers
                if not self._rate_limiter.is_available(model_name):
                    continue

                try:
                    if prov == "gemini":
                        stream = await self.gemini.aio.models.generate_content_stream(
                            model=model_id,
                            contents=[types.Content(role="user", parts=[types.Part.from_text(text=section_prompt)])],
                            config=types.GenerateContentConfig(
                                system_instruction=MAX_OUTPUT_SYSTEM_PROMPT,
                                max_output_tokens=16384,
                            ),
                        )
                        async for chunk in stream:
                            if chunk.text:
                                section_content += chunk.text
                                yield {"type": "token", "content": chunk.text}

                    elif prov == "cerebras":
                        yield {
                            "type": "doc_progress",
                            "content": f"Using {model_name} for {section_title}...",
                            "phase": "generating",
                            "current": section_num,
                            "total": total,
                        }
                        cb_stream = await self.cerebras.chat.completions.create(
                            model=model_id,
                            messages=[
                                {"role": "system", "content": MAX_OUTPUT_SYSTEM_PROMPT},
                                {"role": "user", "content": section_prompt},
                            ],
                            stream=True,
                            max_tokens=16384,
                        )
                        async for chunk in cb_stream:
                            token = chunk.choices[0].delta.content or ""
                            if token:
                                section_content += token
                                yield {"type": "token", "content": token}

                    elif prov == "groq":
                        yield {
                            "type": "doc_progress",
                            "content": f"Using {model_name} for {section_title}...",
                            "phase": "fallback",
                            "current": section_num,
                            "total": total,
                        }
                        groq_stream = await self.groq.chat.completions.create(
                            model=model_id,
                            messages=[
                                {"role": "system", "content": MAX_OUTPUT_SYSTEM_PROMPT},
                                {"role": "user", "content": section_prompt},
                            ],
                            stream=True,
                            temperature=0.7,
                            max_tokens=8192,
                        )
                        async for chunk in groq_stream:
                            token = chunk.choices[0].delta.content or ""
                            if token:
                                section_content += token
                                yield {"type": "token", "content": token}

                    elif prov == "openrouter":
                        yield {
                            "type": "doc_progress",
                            "content": f"Using {model_name} for {section_title}...",
                            "phase": "fallback",
                            "current": section_num,
                            "total": total,
                        }
                        or_stream = await self.openrouter.chat.completions.create(
                            model=model_id,
                            messages=[
                                {"role": "system", "content": MAX_OUTPUT_SYSTEM_PROMPT},
                                {"role": "user", "content": section_prompt},
                            ],
                            stream=True,
                            max_tokens=8192,
                        )
                        async for chunk in or_stream:
                            token = chunk.choices[0].delta.content or ""
                            if token:
                                section_content += token
                                yield {"type": "token", "content": token}

                    generation_success = True
                    break  # Success — exit waterfall

                except Exception as e:
                    print(f"[AIRouter] MaxOutput section {section_num} via {model_name} ({model_id}) failed: {e}")
                    if self._is_rate_limit_error(e):
                        self._rate_limiter.mark_limited(model_name)
                    # Continue to next model in waterfall (NEVER raise)

            if generation_success:
                full_document += section_content + "\n\n"
                previous_context += f"{section_title}, "
            else:
                error_msg = f"\n\n## {section_title}\n\n*This section could not be generated due to API limits. Please try again later.*\n\n"
                full_document += error_msg
                yield {"type": "token", "content": error_msg}

            # Pace requests to avoid rate limit bursts
            if idx < total - 1:
                await asyncio.sleep(2)

        # ── Pass 3: Generate Diagrams (Groq → Cerebras fallback) ──────────
        yield {
            "type": "doc_progress",
            "content": "Generating diagrams...",
            "phase": "diagrams",
            "current": total,
            "total": total,
        }

        diagrams = []
        diagram_prompt = (
            f"Based on this document about: {message}\n\n"
            f"The document has these sections:\n"
            + "\n".join(f"- {s.get('title', '')}: {s.get('description', '')}" for s in toc_sections)
            + "\n\n"
            "Generate exactly 3 to 5 Mermaid diagrams that would ADD HIGH VALUE to this document.\n"
            "Each diagram should illustrate a key concept, process flow, hierarchy, or relationship.\n\n"
            "RULES:\n"
            "- Only create diagrams where they genuinely help understanding\n"
            "- Use flowchart, sequence diagram, or mindmap syntax\n"
            "- Keep diagrams clean and readable (max 15 nodes each)\n"
            "- Each diagram must have a descriptive title\n\n"
            "Return ONLY valid JSON object with a 'diagrams' array:\n"
            '{"diagrams": [{"title": "...", "section_index": 0, "code": "graph TD\\n  A[Start] --> B[End]"}, ...]}'
        )

        # Try Groq, then Cerebras for diagrams
        for diag_name, diag_client, diag_model in [
            ("Groq", self.groq, "llama-3.3-70b-versatile"),
            ("Cerebras", self.cerebras, "llama3.1-70b"),
        ]:
            if not self._rate_limiter.is_available(diag_name):
                continue
            try:
                diag_kwargs = {
                    "model": diag_model,
                    "messages": [
                        {"role": "system", "content": "You are a diagram generator for Mermaid.js. Return ONLY valid JSON."},
                        {"role": "user", "content": diagram_prompt},
                    ],
                    "temperature": 0.7,
                }
                if diag_name == "Groq":
                    diag_kwargs["response_format"] = {"type": "json_object"}

                diag_response = await diag_client.chat.completions.create(**diag_kwargs)
                diag_text = diag_response.choices[0].message.content.strip()
                if diag_text.startswith("```"):
                    diag_text = diag_text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

                parsed_data = json.loads(diag_text)
                parsed_diagrams = parsed_data if isinstance(parsed_data, list) else parsed_data.get("diagrams", [])
                if isinstance(parsed_diagrams, list):
                    diagrams = parsed_diagrams[:5]
                break
            except Exception as e:
                print(f"[AIRouter] Diagram generation via {diag_name} failed (non-critical): {e}")
                if self._is_rate_limit_error(e):
                    self._rate_limiter.mark_limited(diag_name)

        # ── Done ──────────────────────────────────────────────────────────
        yield {
            "type": "doc_progress",
            "content": "Document generation complete!",
            "phase": "complete",
            "current": total,
            "total": total,
        }
        yield {"type": "done", "answer": full_document, "mode": "max_output", "diagrams": diagrams}

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # MESSAGE BUILDERS
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    def _build_openai_messages(
        self,
        message: str,
        history: Optional[List[dict]] = None,
        memory_profile: Optional[dict] = None,
    ) -> List[dict]:
        messages = [{"role": "system", "content": self._get_system_prompt(memory_profile)}]
        if history:
            messages.extend(history[-20:])
        messages.append({"role": "user", "content": message})
        return messages

    def _build_gemini_contents(
        self,
        message: str,
        history: Optional[List[dict]] = None,
    ) -> list:
        contents = []
        if history:
            for item in history[-20:]:
                role = "user" if item["role"] == "user" else "model"
                contents.append(
                    types.Content(
                        role=role,
                        parts=[types.Part.from_text(text=item["content"])],
                    )
                )

        contents.append(
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=message)],
            )
        )
        return contents

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # CREATOR INFO
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    async def _stream_about_creator(self) -> AsyncGenerator[dict, None]:
        about_text = """## 🛠️ Creator Profile: Shasradha Karmakar

**Shasradha Karmakar** is a passionate 15-year-old multi-skilled tech enthusiast, developer, and researcher based in Asansol, West Bengal, India.

### 🎓 About Me
I am a passionate and multi-skilled tech enthusiast with deep interests across both hardware and software domains, including cybersecurity, robotics, web development, app development, game development, software engineering, electronics, electrical systems, photography, editing, content creation, and AI/ML engineering. I enjoy building, breaking, learning, and innovating—constantly pushing myself to explore new technologies and ideas.

I am highly driven by curiosity and real-world problem solving. I don't just learn—I build. My journey reflects hands-on experience, creativity, and a strong mindset of experimentation and growth.

### 🚀 Technical Experience & Hardware Projects
- **Hardware & Robotics**: Voice-controlled AI robots, RC systems, ESP32/ESP8266 projects (Deauther, Marauder), RC robots, and Raspberry Pi based tools like Rubber Ducky.
- **Embedded Hardware**: Worked with Arduino AVR, ESP32 series, STM32, and Raspberry Pi (Zero 2W, Pico).
- **Software Engineering**: Developed a custom x86 OS using NASM, multiple 2D games published on itch.io, hand tracking systems with OpenCV, and cross-platform apps.
- **Cybersecurity**: TryHackMe Global Rank: Top 1% (#670 / 7M users), India Rank: #120. Active Bug Bounty hunter on HackerOne.
- **Cloud & Networking**: SMB/FTP/NAS server management, VPS hosting, and WireGuard VPN setups.

### 🏆 Achievements & Education
- **Education**: 15-year-old student at S.N. Memorial School, Asansol (CBSE, Class IX).
- **Google Maps**: Level 8 Local Guide.
- **Professional Certifications**:
    - **Microsoft**: Python, .NET, AI Foundations.
    - **Google**: Generative AI, LLMs, Responsible AI.
    - **IBM**: Cybersecurity Fundamentals, AI & Quantum Fundamentals.
    - **AWS**: Cloud Essentials, Game Tech, Robotics.
    - **Cisco**: Cybersecurity, Networking Basics.
    - **NVIDIA**: Generative AI & LLMs.

### 📞 Contact & Socials
- **Email**: codewithyuv@gmail.com
- **GitHub**: [github.com/shasradha](https://github.com/shasradha)
- **LinkedIn**: [linkedin.com/in/shasradha](https://www.linkedin.com/in/shasradha)
- **Instagram**: [shasradha_](https://www.instagram.com/shasradha_)
- **Portfolio**: [shasradha.github.io](https://shasradha.github.io/)

*"This isn't just a setup… it's an ecosystem I built. While others code, I deploy intelligence. One system. Infinite execution."*
"""

        for word in about_text.split(" "):
            yield {"type": "token", "content": word + " "}
            await asyncio.sleep(0.02)

        yield {"type": "done"}


ai_router = AIRouter()
