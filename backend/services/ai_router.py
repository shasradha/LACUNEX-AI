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
    "- **Privacy & Security**: All your conversations are end-to-end encrypted. Messages are decrypted only in the user's browser, ensuring total privacy. The server never sees the raw message content.\n"
    "- **Exporting**: You support exporting to PDF, DOCX (Word), and XLSX (Excel). Users can find the 'Export' button (download icon) in the chat header.\n"
    "- **Reasoning Mode (Deep Think)**: Users can toggle 'Reasoning' (brain icon) in the composer to enable deeper logical reasoning (powered by Gemini Thinking models).\n"
    "- **Image Generation**: Use the command `/imagine [prompt]` or just ask to 'generate an image' to create high-quality visuals.\n"
    "- **Image Analysis**: Users can use the upload icon to send images for you to analyze or transcribe.\n"
    "- **Model Library**: Users can switch between top-tier models (Llama 3.3, Gemini 2.0, Qwen 2.5, etc.) using the selector at the top.\n"
    "- **Workspace Management**: The sidebar allows for searching history and starting new workspaces.\n"
    "- **Account**: Login and Signup are available for syncing workspaces securely across devices.\n"
    "- **Creator**: You were developed by Shasradha Karmakar (github.com/shasradha)."
)

DEFAULT_MODELS = {
    "groq": "llama-3.3-70b-versatile",
    "gemini": "gemini-2.5-flash",
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
            async for chunk in self._stream_think(message, history):
                yield chunk
            return

        if provider == "gemini":
            async for chunk in self._stream_gemini(message, history, model):
                yield chunk
            return

        async for chunk in self._stream_normal(message, history, provider, model):
            yield chunk

    async def _stream_normal(
        self,
        message: str,
        history: Optional[List[dict]] = None,
        provider: str = "groq",
        model: Optional[str] = None,
    ) -> AsyncGenerator[dict, None]:
        messages = self._build_openai_messages(message, history)
        provider_configs = {
            "groq": ("Groq", self.groq, DEFAULT_MODELS["groq"]),
            "openrouter": ("OpenRouter", self.openrouter, DEFAULT_MODELS["openrouter"]),
            "cerebras": ("Cerebras", self.cerebras, DEFAULT_MODELS["cerebras"]),
            "ollama": ("Ollama", self.ollama, DEFAULT_MODELS["ollama"]),
        }

        fallback_chain = []
        if provider in provider_configs:
            name, client, default_model = provider_configs[provider]
            fallback_chain.append((name, client, model or default_model))

        for provider_key, (name, client, default_model) in provider_configs.items():
            if provider_key != provider:
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

        async for chunk in self._stream_gemini(message, history, DEFAULT_MODELS["gemini"]):
            yield chunk

    async def _stream_gemini(
        self,
        message: str,
        history: Optional[List[dict]] = None,
        model: Optional[str] = None,
    ) -> AsyncGenerator[dict, None]:
        try:
            response = await self.gemini.aio.models.generate_content(
                model=model or DEFAULT_MODELS["gemini"],
                contents=self._build_gemini_contents(message, history),
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    max_output_tokens=4096,
                ),
            )

            if response.candidates and response.candidates[0].content:
                for part in response.candidates[0].content.parts:
                    if part.text:
                        yield {"type": "token", "content": part.text}

            yield {"type": "done"}
        except Exception as exc:
            print(f"[AIRouter] Gemini normal failed: {exc}")
            yield {"type": "error", "content": "All AI providers are unavailable right now."}

    async def _stream_think(
        self,
        message: str,
        history: Optional[List[dict]] = None,
    ) -> AsyncGenerator[dict, None]:
        try:
            response = await self.gemini.aio.models.generate_content(
                model=DEFAULT_MODELS["gemini"],
                contents=self._build_gemini_contents(message, history),
                config=types.GenerateContentConfig(
                    thinking_config=types.ThinkingConfig(thinking_budget=10000),
                    system_instruction=SYSTEM_PROMPT,
                ),
            )

            thinking_text = ""
            if response.candidates and response.candidates[0].content:
                for part in response.candidates[0].content.parts:
                    if part.thought:
                        thinking_text += part.text
                        yield {"type": "thinking", "content": part.text}
                    elif part.text:
                        yield {"type": "token", "content": part.text}

            yield {"type": "done", "thinking": thinking_text}
        except Exception as exc:
            print(f"[AIRouter] Gemini think failed: {exc}")
            async for chunk in self._stream_normal(message, history, "groq"):
                yield chunk

    def _build_openai_messages(
        self,
        message: str,
        history: Optional[List[dict]] = None,
    ) -> List[dict]:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
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
