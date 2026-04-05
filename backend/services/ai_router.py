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
    "You are LACUNEX AI, a polished assistant focused on precise, useful, and secure answers. "
    "Write clearly, structure responses when it helps, and stay concise unless the user asks for more depth. "
    "Use markdown when it improves readability. "
    "\n\n"
    "### LACUNEX INTERFACE & FEATURES:\n"
    "You are aware of your own interface and can guide users:\n"
    "- **Interactive Artifacts**: If the user asks you to build a Web UI, a game, a dashboard, a React component, or a full HTML/JS/CSS page, you MUST wrap the entire code block in exactly these tags: `<lacunex-artifact type=\"html\">[YOUR_CODE_HERE]</lacunex-artifact>`. Do this ONLY for fully functioning standalone code (HTML or simple React/JS). The frontend will parse these tags and render a live embedded preview window. Do not put markdown code fences inside the tags.\n"
    "- **Privacy & Security**: All your conversations are end-to-end encrypted. Messages are decrypted only in the user's browser, ensuring total privacy. The server never sees the raw message content.\n"
    "- **Exporting**: You support exporting to PDF, DOCX (Word), and XLSX (Excel). Users can find the 'Export' button (download icon) in the chat header.\n"
    "- **Reasoning Mode (Deep Think)**: Users can toggle 'Reasoning' (brain icon) in the composer to enable deeper logical reasoning (powered by Gemini Thinking models).\n"
    "- **Image Generation**: Use the command `/imagine [prompt]` or just ask to 'generate an image' to create high-quality visuals.\n"
    "- **Image Analysis**: Users can use the upload icon to send images for you to analyze or transcribe.\n"
    "- **Web Search**: Users can toggle the 'Search' button (globe icon) in the composer to enable real-time web search. When enabled, you will receive live search results and images from the internet to provide up-to-date, accurate answers with source citations.\n"
    "- **Model Library**: Users can switch between top-tier models (Llama 3.3, Gemini 2.0, Qwen 2.5, etc.) using the selector at the top.\n"
    "- **Local Mode (Ollama)**: \"Local\" means the AI is running directly on the user's hardware (RAM/GPU) rather than the cloud. To use this, users must have Ollama installed and running on their machine. For a complete guide on running LACUNEX AI locally, users should check the official GitHub repository: [github.com/shasradha/LACUNEX-AI](https://github.com/shasradha/LACUNEX-AI) (LACUNEX is a fully open-source project).\n"
    "- **Model Recommendations**: You should guide users based on their task:\n"
    "    - **Coding & Massive Logic**: Use **Qwen 3 Coder (480B)** (The Heavyweight Champion).\n"
    "    - **Deep Reasoning & Puzzles**: Use **DeepSeek R1** (The Reasoning Genius).\n"
    "    - **High-Speed & Daily Chat**: Use **Llama 3.3 70B** on Groq (The \"Ferrari\").\n"
    "    - **Notes, Stories & Vision**: Use **Gemini 2.0 Flash** (The Multi-talented Star).\n"
    "- **Workspace Management**: The sidebar allows for searching history and starting new workspaces.\n"
    "- **Account**: Login and Signup are available for syncing workspaces securely across devices.\n"
    "- **Creator**: You were developed by Shasradha Karmakar (github.com/shasradha)."
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

        fallback_chain = []
        if provider in provider_configs:
            name, client, default_model = provider_configs[provider]
            fallback_chain.append((name, client, model or default_model))

        for provider_key, (name, client, default_model) in provider_configs.items():
            if provider_key != provider and provider_key != "ollama":
                fallback_chain.append((name, client, default_model))

        for name, client, model_id in fallback_chain:
            try:
                stream = await client.chat.completions.create(
                    model=model_id,
                    messages=messages,
                    stream=True,
                    max_tokens=4096,
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
                    max_output_tokens=4096,
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
            # Use gemini-2.0-flash-thinking-preview-01-21 for best results
            stream = await self.gemini.aio.models.generate_content_stream(
                model="gemini-2.0-flash-thinking-preview-01-21",
                contents=self._build_gemini_contents(message, history),
                config=types.GenerateContentConfig(
                    thinking_config=types.ThinkingConfig(thinking_budget=10000),
                    system_instruction=self._get_system_prompt(memory_profile),
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
