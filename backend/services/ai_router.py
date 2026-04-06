"""
LACUNEX AI intelligent router.
"""

import os
from typing import AsyncGenerator, List, Optional

from google import genai
from google.genai import types
from groq import AsyncGroq
from openai import AsyncOpenAI

SYSTEM_PROMPT = (
    "You are LACUNEX AI, a world-class assistant and elite coding partner. "
    "Write clearly, structure responses when it helps, and stay concise unless the user asks for more depth. "
    "Use markdown when it improves readability. "
    "\n\n"
    "### CODE GENERATION STANDARDS:\n"
    "When a user asks you to build ANY code, you MUST deliver **production-grade, premium-quality** results:\n"
    "- Write **comprehensive, complete code** — NEVER give placeholder or skeleton code.\n"
    "- Add comments explaining key sections.\n"
    "- The goal is to produce code so impressive that it exceeds what the user could build themselves.\n"
    "\n"
    "**For WEB/UI code (HTML, CSS, JS, games, dashboards, forms, landing pages):**\n"
    "- Include rich CSS with gradients, animations, hover effects, responsive design, glassmorphism, modern typography (Google Fonts), and smooth transitions.\n"
    "- Include form validation, accessibility, error states, loading states, and micro-interactions.\n"
    "- Write at least 300-800+ lines for a single-file project. Make the user say 'WOW'.\n"
    "- Use modern best practices: CSS custom properties, flexbox/grid, semantic HTML5, ES6+ JavaScript.\n"
    "\n"
    "**For NON-WEB code (Python, Java, C++, Go, Rust, PHP, etc.):**\n"
    "- Write the code in a standard markdown code fence with the correct language tag, e.g. ```python ... ```\n"
    "- Do NOT wrap non-web code in `<lacunex-artifact>` tags.\n"
    "- Do NOT convert Python/Java/etc. requests into HTML pages. If the user says 'make a Python calculator', write actual Python code, NOT an HTML calculator.\n"
    "- LACUNEX has a built-in code execution sandbox — users can run Python, JavaScript, Java, C++, Go, Rust, PHP, Ruby, and 50+ languages directly in the chat.\n"
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
            "shasradha",
            "karmakar",
            "creator",
            "who built",
            "who made",
            "who created",
            "who is your dev",
            "about shasradha",
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

    def _get_system_prompt(self, memory_profile: Optional[dict]) -> str:
        prompt = SYSTEM_PROMPT
        if memory_profile and "facts" in memory_profile and memory_profile["facts"]:
            facts_list = "\n".join(f"- {f}" for f in memory_profile["facts"])
            prompt += f"\n\n### USER MEMORY (PERSISTENT FACTS):\n{facts_list}\n"
        return prompt

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

        # Explicit fallback priority: Cerebras (generous free) → Groq → OpenRouter (credits)
        _FALLBACK_ORDER = ["cerebras", "groq", "openrouter"]

        fallback_chain = []
        if provider in provider_configs:
            name, client, default_model = provider_configs[provider]
            fallback_chain.append((name, client, model or default_model))

        for key in _FALLBACK_ORDER:
            if key != provider and key in provider_configs:
                name, client, default_model = provider_configs[key]
                fallback_chain.append((name, client, default_model))

        # Smart token limits per provider to avoid billing/quota errors
        _MAX_TOKENS = {
            "Cerebras": 16384,  # Very generous free tier
            "Groq": 8192,      # 100K daily token limit, conserve
            "OpenRouter": 4096, # Credit-based, keep low
        }

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
                # If we're on the last part of fallback_chain, we'll hit Gemini below
        
        # ── Ultimate Dynamic Fallback ──────────────────────────────────────────
        # If we reach here, OpenAI providers failed. Try Gemini 2.0 Flash (Very reliable)
        try:
            print(f"[AIRouter] Falling back to Gemini 2.0 Flash for reliability.")
            async for chunk in self._stream_gemini(message, history, DEFAULT_MODELS["gemini"]):
                yield chunk
            return # _stream_gemini yields done
        except Exception as e:
            print(f"[AIRouter] Ultimate fallback failed: {e}")
            yield {"type": "error", "content": "All AI providers are currently at capacity. Please try again in a few minutes."}
            yield {"type": "done"} # 🔓 Force Unlock UI

    async def _stream_gemini(
        self,
        message: str,
        history: Optional[List[dict]] = None,
        model: Optional[str] = None,
        memory_profile: Optional[dict] = None,
    ) -> AsyncGenerator[dict, None]:
        try:
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
        except Exception as exc:
            print(f"[AIRouter] Gemini normal failed: {exc}")
            yield {"type": "error", "content": "Gemini Engine is experiencing high latency. Retrying..."}

    async def _stream_think(
        self,
        message: str,
        history: Optional[List[dict]] = None,
        memory_profile: Optional[dict] = None,
    ) -> AsyncGenerator[dict, None]:
        try:
            # Use gemini-2.5-flash — supports native thinking + high output
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
        except Exception as exc:
            print(f"[AIRouter] Gemini think failed: {exc}")
            # Fallback to standard Groq streaming if thinking mode fails
            async for chunk in self._stream_normal(message, history, "groq"):
                yield chunk

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

    async def _stream_about_creator(self) -> AsyncGenerator[dict, None]:
        about_text = """## 🛠️ Creator Profile: Shasradha Karmakar

**Shasradha Karmakar** is a passionate 15-year-old multi-skilled tech enthusiast, developer, and researcher based in Asansol, West Bengal, India.

### 🎓 About Me
I am a passionate and multi-skilled tech enthusiast with deep interests across both hardware and software domains, including cybersecurity, robotics, web development, app development, game development, software engineering, electronics, electrical systems, photography, editing, content creation, and AI/ML engineering. I enjoy building, breaking, learning, and innovating—constantly pushing myself to explore new technologies and ideas.

I am highly driven by curiosity and real-world problem solving. I don’t just learn—I build. My journey reflects hands-on experience, creativity, and a strong mindset of experimentation and growth.

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

*"This isn’t just a setup… it’s an ecosystem I built. While others code, I deploy intelligence. One system. Infinite execution."*
"""

        import asyncio

        for word in about_text.split(" "):
            yield {"type": "token", "content": word + " "}
            await asyncio.sleep(0.02)

        yield {"type": "done"}


ai_router = AIRouter()
