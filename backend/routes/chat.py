"""
LACUNEX AI — Chat Route
POST /api/generate — Streaming chat with AI (SSE)

Pipeline:
  1. Detect intent (web search / reasoning / max output) — instant, no API calls
  2. If web search needed → fetch live results in parallel
  3. If max_output → route to multi-pass document generation
  4. Inject results into AI context
  5. Stream AI response token-by-token
  6. Run gap detection (thinking mode only)
  7. Emit structured `done` event with full metadata
"""

import os
import json
import asyncio
from pydantic import BaseModel
from fastapi import APIRouter, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse
from models.schemas import ChatRequest
from models.db_models import User
from services.auth_service import get_current_user
from services.ai_router import ai_router
from services.gap_detector import gap_detector
from services.search_service import search_all, format_text_context
from services.intent_detector import detect_intent, intent_to_dict, get_system_prompt_injection
from services.memory_service import extract_and_save_memory

router = APIRouter(prefix="/api", tags=["Chat"])


@router.post("/generate")
async def chat(
    request: ChatRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    """
    Stream AI response via Server-Sent Events.
    Events: mode_detected | search_status | thinking | token | doc_progress | doc_toc | max_output_activated | done | error
    """

    # ── Step 1: Run intent detection v3 (instant, no API calls) ──────────────
    intent_obj = detect_intent(request.message)
    intent = intent_to_dict(intent_obj)
    intent_injection = get_system_prompt_injection(intent_obj)

    # Log intent detection for analytics
    print(f"[Intent v4] primary={intent_obj.primary} | domain={intent_obj.domain} | "
          f"casual={intent_obj.is_casual} | academic={intent_obj.is_academic} | "
          f"search={intent_obj.needs_search} | document={intent_obj.is_document} | "
          f"tone={intent_obj.tone} | lang={intent_obj.language_hint} | "
          f"confidence={intent_obj.confidence:.2f}")

    # ── Smart Greeting System (v4.0: name-first greetings) ────────────────────
    memory_facts = []
    user_name = None
    try:
        mem_profile = current_user.memory_profile or {}
        memory_facts = list(mem_profile.get("facts", []))
        # Extract name from memory facts
        for fact in memory_facts:
            fl = fact.lower()
            if "name is" in fl or "my name" in fl or "i am " in fl:
                # Extract name after "is" or "am"
                for pattern in ["name is ", "i am ", "i'm "]:
                    if pattern in fl:
                        user_name = fact.split(pattern)[-1].strip().rstrip(".")
                        user_name = user_name.split()[0].capitalize()
                        break
                if user_name:
                    break
    except Exception:
        pass

    # Build memory context injection for AI
    memory_injection = ""
    if memory_facts:
        facts_text = " | ".join(memory_facts[:8])
        memory_injection = (
            f"\n[USER MEMORY CONTEXT]: You know these facts about this user: {facts_text}. "
            f"Use this to personalize your responses when relevant."
        )
    if user_name and intent_obj.is_casual and intent_obj.sub_intent == 'greeting':
        memory_injection += (
            f"\nCRITICAL: The user's name is '{user_name}'. They just greeted you. "
            f"You MUST start your response with their name: 'Hey {user_name}! ⚡' "
            f"NEVER use a generic greeting like 'Hello there!' when you know the name."
        )

    # Combine all injections
    full_injection = "\n".join(filter(None, [intent_injection, memory_injection]))

    # Trigger background personal memory extraction
    background_tasks.add_task(extract_and_save_memory, current_user.id, request.message)

    # Respect user's explicit choices, but fill in gaps with auto-detection
    from services.intent_detector import should_auto_search, is_image_request
    auto_web_search, optimized_search_query = should_auto_search(request.message, intent_obj)
    auto_web_search = request.web_search or auto_web_search
    
    auto_reasoning = (request.mode == "think") or intent["reasoning"]
    image_search_requested, image_query = is_image_request(request.message)
    auto_image_search = intent.get("image_search", False) or image_search_requested
    auto_max_output = request.max_output or intent.get("max_output", False)

    # Determine effective mode
    effective_mode = "max_output" if auto_max_output else ("think" if auto_reasoning else "normal")

    # ── MAX OUTPUT MODE — Document Generation Pipeline ────────────────────────
    if auto_max_output:
        async def max_output_stream():
            full_response = ""

            # Notify client of MAX OUTPUT activation
            mode_event = {
                "type": "mode_detected",
                "web_search": False,
                "reasoning": True,
                "image_search": False,
                "max_output": True,
                "intent_primary": intent_obj.primary,
                "intent_domain": intent_obj.domain,
                "intent_confidence": intent_obj.confidence,
            }
            yield f"data: {json.dumps(mode_event)}\n\n"

            async for chunk in ai_router.stream_max_output(
                message=request.message,
                history=request.history,
                memory_profile=current_user.memory_profile,
                is_academic=intent.get("is_academic", False),
            ):
                chunk_type = chunk.get("type")

                if chunk_type == "max_output_activated":
                    yield f"data: {json.dumps(chunk)}\n\n"

                elif chunk_type == "doc_progress":
                    yield f"data: {json.dumps(chunk)}\n\n"

                elif chunk_type == "doc_toc":
                    yield f"data: {json.dumps(chunk)}\n\n"

                elif chunk_type == "thinking":
                    yield f"data: {json.dumps(chunk)}\n\n"

                elif chunk_type == "token":
                    full_response += chunk.get("content", "")
                    yield f"data: {json.dumps(chunk)}\n\n"

                elif chunk_type == "done":
                    # Parse the full document into structured JSON
                    doc_json = None
                    try:
                        from services.document_parser import parse_markdown_to_document
                        doc_json = parse_markdown_to_document(
                            full_response,
                            title=request.message.strip()[:100],
                        )

                        # Inject AI-generated diagrams into sections
                        ai_diagrams = chunk.get("diagrams", [])
                        if doc_json and ai_diagrams:
                            doc_sections = doc_json.get("sections", [])
                            for diag in ai_diagrams:
                                si = diag.get("section_index", 0)
                                if 0 <= si < len(doc_sections):
                                    doc_sections[si].setdefault("diagrams", []).append({
                                        "title": diag.get("title", "Diagram"),
                                        "code": diag.get("code", ""),
                                    })

                    except Exception as e:
                        print(f"[Chat] Document parsing failed: {e}")

                    done_event = {
                        "type": "done",
                        "answer": chunk.get("answer", full_response),
                        "mode": "max_output",
                        "max_output": True,
                        "web_search": False,
                        "reasoning": True,
                        "image_results": [],
                        "web_results": [],
                        "gaps_found": [],
                        "confidence": 95,
                        "document_json": doc_json,
                    }
                    yield f"data: {json.dumps(done_event)}\n\n"

                elif chunk_type == "error":
                    yield f"data: {json.dumps(chunk)}\n\n"

        return StreamingResponse(
            max_output_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    # ── Step 2: Fetch Web Intelligence (Parallel Search + Scrape) ───────────
    search_data = {"web_results": [], "image_results": []}
    scraped_content = None
    
    # Run tasks in parallel for zero-wait performance
    tasks = []
    
    # Task A: Search (Web + Images)
    if auto_web_search:
        tasks.append(asyncio.create_task(asyncio.wait_for(
            search_all(optimized_search_query, image_search=auto_image_search),
            timeout=15.0
        )))
    else:
        tasks.append(asyncio.sleep(0)) # Noop placeholder

    # Task B: Specific URL Scraper (Elite Intelligence)
    if intent.get("url_fetch") and intent.get("detected_url"):
        from services.scraper_service import fetch_url_content
        tasks.append(asyncio.create_task(fetch_url_content(intent["detected_url"])))
    else:
        tasks.append(asyncio.sleep(0)) # Noop placeholder

    try:
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        if isinstance(results[0], dict):
            search_data = results[0]
        
        if len(results) > 1 and isinstance(results[1], str):
            scraped_content = results[1]
    except Exception as e:
        print(f"[Chat] Elite intelligence gathering failed: {e}")

    web_results = search_data.get("web_results", [])
    image_results = search_data.get("image_results", [])
    
    print(f"[Chat] 📊 Pipeline results | web={len(web_results)} | images={len(image_results)} | image_search={auto_image_search}")

    # ── SSE Generator ─────────────────────────────────────────────────────────
    async def event_stream():
        nonlocal image_results
        full_response = ""

        mode_event = {
            "type": "mode_detected",
            "web_search": auto_web_search,
            "reasoning": auto_reasoning,
            "image_search": auto_image_search,
            "max_output": False,
            "intent_primary": intent_obj.primary,
            "intent_domain": intent_obj.domain,
            "intent_confidence": intent_obj.confidence,
        }
        yield f"data: {json.dumps(mode_event)}\n\n"

        if auto_web_search:
            yield f"data: {json.dumps({'type': 'search_status', 'content': '🔍 Searching the web...'})}\n\n"

        if image_search_requested:
            yield f"data: {json.dumps({'type': 'image_search', 'query': image_query})}\n\n"
            from routes.image import search_images_endpoint
            images_data = await search_images_endpoint(image_query, count=12)
            yield f"data: {json.dumps({'type': 'images', 'data': images_data, 'query': image_query})}\n\n"
            
            # Save to history immediately
            image_results = images_data.get("images", [])

        # ── Build Elite Intelligence Message ─────────────────────────────
        effective_message = request.message
        
        if scraped_content:
            effective_message = (
                f"{request.message}\n\n"
                f"### [ELITE WEBSITE READER CONTENT]\n"
                f"LACUNEX has fetched the following content directly from the URL you provided. "
                f"Analyze this content to provide an accurate summary and answer questions. "
                f"Treat this as real-world, high-priority context:\n\n"
                f"{scraped_content}\n"
                f"[/END SITE CONTENT]\n\n"
                f"**INSTRUCTIONS**: Since a URL was provided, please start your response with a structured 'Website Summary':\n"
                f"- **Summary**: 2-3 lines of high-level overview.\n"
                f"- **Key Points**: 3-5 bullet points of main information.\n"
                f"- **Detailed Insights**: Your full analysis as requested.\n"
            )

        if web_results:
            yield f"data: {json.dumps({'type': 'search_status', 'content': f'📡 Found {len(web_results)} sources...'})}\n\n"
            yield f"data: {json.dumps({'type': 'search_status', 'content': '⚡ Synthesizing...'})}\n\n"
            
            text_context = format_text_context(web_results)
            import datetime
            today = datetime.date.today()
            today_str = today.strftime("%d %B %Y")
            current_year = today.year
            
            search_block = (
                f"\n--- [LIVE WEB SEARCH RESULTS] ---\n"
                f"TODAY'S DATE: {today_str}\n"
                f"You are synthesizing search results as of {today_str}.\n"
                f"ONLY use information that is current as of {today_str}.\n"
                f"If search results contain data from 2024 or 2025,\n"
                f"clearly label it as 'older data' and prioritize\n"
                f"2026 results. Never present old data as current.\n"
                f"If the search results show specific scores, dates, or facts — USE THOSE EXACT numbers.\n"
                f"NEVER fabricate match scores, player stats, or results that are not in the sources below.\n"
                f"**CRITICAL:** Cite your sources inline using [1], [2] format.\n"
            )
            
            # Detect sports context for formatting
            sports_keywords = ['ipl', 'cricket', 'match', 'score', 'football', 'fifa', 'nba', 'tennis', 'won', 'lost', 'result']
            if any(kw in request.message.lower() for kw in sports_keywords):
                search_block += (
                    f"\n**SPORTS RESPONSE RULES (MANDATORY):**\n"
                    f"1. The current IPL season is IPL {current_year}. Do NOT reference IPL {current_year - 1} unless the user specifically asks.\n"
                    f"2. Use ONLY scores and results from the search data below. NEVER make up scores.\n"
                    f"3. Format the result as an ASCII sports card:\n"
                    f"🏏 IPL {current_year} — [Match Title]\n"
                    f"━━━━━━━━━━━━━━━━━━━━━━\n"
                    f"Team A    🆚    Team B\n"
                    f"  Score1          Score2\n"
                    f"    ★ [Winner] Won by [margin] ★\n"
                    f"━━━━━━━━━━━━━━━━━━━━━━\n"
                    f"📅 [Date from search results]\n"
                    f"🏟️ [Venue from search results]\n\n"
                    f"4. If search results don't contain exact scores, say so honestly.\n"
                )
                
            search_block += f"\n{text_context}\n"
            effective_message += search_block

        async for chunk in ai_router.stream_chat(
            message=effective_message,
            history=request.history,
            mode=effective_mode,
            provider=request.provider,
            model=request.model,
            memory_profile=current_user.memory_profile,
            extra_injection=full_injection,
        ):
            if chunk["type"] == "thinking":
                yield f"data: {json.dumps(chunk)}\n\n"

            elif chunk["type"] == "token":
                full_response += chunk.get("content", "")
                yield f"data: {json.dumps(chunk)}\n\n"

            elif chunk["type"] == "done":
                gap_result = {"gaps_found": [], "confidence": 80}
                if full_response and effective_mode == "think":
                    try:
                        gap_result = await asyncio.wait_for(
                            gap_detector.detect_gaps(request.message, full_response),
                            timeout=2.5,
                        )
                    except (asyncio.TimeoutError, Exception):
                        pass

                done_event = {
                    "type": "done",
                    "answer": full_response,
                    "gaps_found": gap_result.get("gaps_found", []),
                    "confidence": gap_result.get("confidence", 80),
                    "mode": effective_mode,
                    "max_output": False,
                    "web_search": auto_web_search,
                    "reasoning": auto_reasoning,
                    "image_results": image_results,
                    "web_results": web_results,
                }
                yield f"data: {json.dumps(done_event)}\n\n"

            elif chunk["type"] == "error":
                yield f"data: {json.dumps(chunk)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

class SuggestionRequest(BaseModel):
    message: str

@router.post("/suggestions")
async def get_suggestions(request: SuggestionRequest):
    """
    Non-blocking background route to fetch contextual follow-up suggestions
    based on the AI's last message. Uses Groq for blazing speed.
    """
    from groq import AsyncGroq
    try:
        groq_key = os.getenv("GROQ_API_KEYS", "").split(",")[0].strip() or os.getenv("GROQ_API_KEY")
        if not groq_key: return {"suggestions": []}
        
        client = AsyncGroq(api_key=groq_key)
        
        # Determine likely topic context from the message
        prompt = (
            "You are an AI suggestion engine. Based on the following AI response, "
            "generate 3 short, highly relevant follow-up questions the user might ask next. "
            "Return ONLY a JSON array of strings, for example: "
            "[\"Can you explain that more simply?\", \"Give me an example.\", \"How does this apply to me?\"]\n\n"
            f"AI Response:\n{request.message[:1000]}"
        )
        
        res = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=64,
            response_format={"type": "json_array"}
        )
        
        import json
        suggestions = json.loads(res.choices[0].message.content)
        return {"suggestions": suggestions[:3]}
    except Exception as e:
        print(f"[Suggestions Error]: {e}")
        return {"suggestions": []}

class TitleGenRequest(BaseModel):
    message: str

@router.post("/title")
async def generate_title(request: TitleGenRequest):
    """
    Analyzes the first message of a chat and generates a 3-4 word title.
    """
    from groq import AsyncGroq
    try:
        groq_key = os.getenv("GROQ_API_KEYS", "").split(",")[0].strip() or os.getenv("GROQ_API_KEY")
        if not groq_key: return {"title": "New Workspace"}
        
        client = AsyncGroq(api_key=groq_key)
        
        prompt = (
            "You are an AI that generates a very short (3-5 words), natural sounding title "
            "for a chat conversation based on the user's first message. "
            "Do NOT include punctuation, quotes, or markdown. "
            "Just output the plain text title. "
            f"User message: {request.message[:500]}"
        )
        
        res = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=15,
        )
        
        title = res.choices[0].message.content.strip().replace('"', '').replace("'", "")
        return {"title": title}
    except Exception as e:
        print(f"[Title Gen Error]: {e}")
        return {"title": "New Workspace"}
