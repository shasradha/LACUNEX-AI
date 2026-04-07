"""
LACUNEX AI intelligent router.
"""

import os
import json
import asyncio
from typing import AsyncGenerator, List, Optional

from google import genai
from google.genai import types
from groq import AsyncGroq
from openai import AsyncOpenAI

SYSTEM_PROMPT = (
    "Write with absolute technical depth and exhaustive complexity. Default to maximum verbosity and completeness for every response unless specifically told to 'summarize'. "
    "Use markdown when it improves readability. "
    "\n\n"
    "### CODE GENERATION STANDARDS:\n"
    "When a user asks you to build ANY code, you MUST deliver **production-grade, premium-quality** results:\n"
    "- Write **comprehensive, complete code** — NEVER give placeholder or skeleton code.\n"
    "- Write at least **500-1200+ lines** for any UI/UX or dashboard project. EXHAUST EVERY FEATURE.\n"
    "- Add comments explaining key sections.\n"
    "- The goal is to produce code so impressive that it exceeds what the user could build themselves.\n"
    "\n"
    "**For WEB/UI code (HTML, CSS, JS, games, dashboards, forms, landing pages):**\n"
    "- Include rich CSS with gradients, animations, hover effects, responsive design, glassmorphism, modern typography (Google Fonts), and smooth transitions.\n"
    "- Include form validation, accessibility, error states, loading states, and micro-interactions.\n"
    "- USE MULTIPLE FILES where appropriate to hit the maximum possible complexity.\n"
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

    async def stream_max_output(
        self,
        message: str,
        history: Optional[List[dict]] = None,
        memory_profile: Optional[dict] = None,
    ) -> AsyncGenerator[dict, None]:
        """
        MAX OUTPUT MODE — Multi-pass document generation.
        Pass 1: Generate Table of Contents as structured JSON
        Pass 2+: Expand each section with full detail
        Uses Gemini 2.0 Flash for maximum reliability and speed.
        Falls back to Groq (Llama 3 70B) if Gemini rate limits are exceeded.
        """
        model = "gemini-2.0-flash"

        # ── Pass 1: Generate Table of Contents (using Groq to save Gemini quota) ──
        yield {"type": "max_output_activated", "content": "MAX OUTPUT MODE activated"}
        yield {"type": "doc_progress", "content": "Planning document structure...", "phase": "toc", "current": 0, "total": 0}

        toc_sections = []
        try:
            toc_response = await self.groq.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": MAX_OUTPUT_TOC_PROMPT},
                    {"role": "user", "content": f"Generate a Table of Contents for: {message}"}
                ],
                temperature=0.7,
                response_format={"type": "json_object"},
            )

            toc_text = toc_response.choices[0].message.content.strip()
            # Clean potential markdown fences if Llama ignores response_format
            if toc_text.startswith("```"):
                toc_text = toc_text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

            toc_data = json.loads(toc_text)
            # Support both direct array or wrapped object {"sections": [...]}
            toc_sections = toc_data if isinstance(toc_data, list) else toc_data.get("sections", [])

            if not isinstance(toc_sections, list) or len(toc_sections) < 3:
                raise ValueError("TOC too short or invalid")
            
            # Cap at 20 sections to stay within Gemini rate limits for Pass 2
            if len(toc_sections) > 20:
                toc_sections = toc_sections[:20]

        except Exception as e:
            print(f"[AIRouter] TOC generation failed: {e}, using fallback structure")
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

        # ── Pass 2+: Expand each section ──────────────────────────────────
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

            # Build context-aware prompt for this section
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

            # Retry logic for rate-limited API calls
            max_retries = 3
            section_content = ""
            generation_success = False

            for attempt in range(max_retries):
                try:
                    stream = await self.gemini.aio.models.generate_content_stream(
                        model=model,
                        contents=[types.Content(
                            role="user",
                            parts=[types.Part.from_text(text=section_prompt)],
                        )],
                        config=types.GenerateContentConfig(
                            system_instruction=MAX_OUTPUT_SYSTEM_PROMPT,
                            max_output_tokens=16384,
                            thinking_config=types.ThinkingConfig(thinking_budget=4096),
                        ),
                    )

                    section_content = ""
                    async for chunk in stream:
                        for part in chunk.candidates[0].content.parts:
                            if part.thought:
                                yield {"type": "thinking", "content": part.text}
                            elif part.text:
                                section_content += part.text
                                yield {"type": "token", "content": part.text}

                    generation_success = True
                    break  # Success — exit retry loop

                except Exception as retry_exc:
                    error_str = str(retry_exc)
                    is_rate_limit = any(err in error_str for err in ["429", "RESOURCE_EXHAUSTED", "503", "UNAVAILABLE"])

                    # ── Fallback to Groq if Gemini is completely exhausted ──
                    if is_rate_limit:
                        print(f"[AIRouter] Gemini exhausted for section {section_num}, falling back to Groq...")
                        yield {
                            "type": "doc_progress",
                            "content": f"Gemini busy — switching to Groq for {section_title}...",
                            "phase": "fallback",
                            "current": section_num,
                            "total": total,
                        }
                        
                        try:
                            # Use Groq for the same section expansion
                            groq_stream = await self.groq.chat.completions.create(
                                model="llama-3.3-70b-versatile",
                                messages=[
                                    {"role": "system", "content": MAX_OUTPUT_SYSTEM_PROMPT},
                                    {"role": "user", "content": section_prompt}
                                ],
                                stream=True,
                                temperature=0.7,
                            )
                            
                            section_content = ""
                            async for chunk in groq_stream:
                                content = chunk.choices[0].delta.content or ""
                                if content:
                                    section_content += content
                                    yield {"type": "token", "content": content}
                            
                            generation_success = True
                            break # Fallback success
                        except Exception as groq_exc:
                            print(f"[AIRouter] Groq fallback also failed: {groq_exc}")
                            raise retry_exc # Re-raise original Gemini error if fallback fails
                    else:
                        raise retry_exc  # Non-rate-limit error or last attempt

            if generation_success:
                full_document += section_content + "\n\n"
                previous_context += f"{section_title}, "
            else:
                print(f"[AIRouter] Section {section_num} generation failed after all retries")
                error_msg = f"\n\n## {section_title}\n\n*This section could not be generated due to API limits. Please try again later.*\n\n"
                full_document += error_msg
                yield {"type": "token", "content": error_msg}

            # Pace requests: wait 3 seconds between sections to avoid rate limit burst
            if idx < total - 1:
                await asyncio.sleep(3)

        # ── Pass 3: Generate Diagrams (using Groq) ────────────────────────
        yield {
            "type": "doc_progress",
            "content": "Generating diagrams...",
            "phase": "diagrams",
            "current": total,
            "total": total,
        }

        diagrams = []
        try:
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

            diag_response = await self.groq.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are a diagram generator for Mermaid.js. Return ONLY valid JSON."},
                    {"role": "user", "content": diagram_prompt}
                ],
                temperature=0.7,
                response_format={"type": "json_object"},
            )

            diag_text = diag_response.choices[0].message.content.strip()
            if diag_text.startswith("```"):
                diag_text = diag_text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

            parsed_data = json.loads(diag_text)
            parsed_diagrams = parsed_data if isinstance(parsed_data, list) else parsed_data.get("diagrams", [])
            
            if isinstance(parsed_diagrams, list):
                diagrams = parsed_diagrams[:5]  # Cap at 5

        except Exception as e:
            print(f"[AIRouter] Diagram generation failed (non-critical): {e}")
            diagrams = []

        # ── Done ──────────────────────────────────────────────────────────
        yield {
            "type": "doc_progress",
            "content": "Document generation complete!",
            "phase": "complete",
            "current": total,
            "total": total,
        }
        yield {"type": "done", "answer": full_document, "mode": "max_output", "diagrams": diagrams}

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
