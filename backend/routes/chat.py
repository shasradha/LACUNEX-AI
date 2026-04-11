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

import json
import asyncio
from fastapi import APIRouter, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse
from models.schemas import ChatRequest
from models.db_models import User
from services.auth_service import get_current_user
from services.ai_router import ai_router
from services.gap_detector import gap_detector
from services.search_service import search_all, format_text_context
from services.intent_detector import detect_intent
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

    # ── Step 1: Run intent detection (instant, no API calls) ─────────────────
    intent = detect_intent(request.message)

    # Trigger background personal memory extraction
    background_tasks.add_task(extract_and_save_memory, current_user.id, request.message)

    # Respect user's explicit choices, but fill in gaps with auto-detection
    auto_web_search = request.web_search or intent["web_search"]
    auto_reasoning = (request.mode == "think") or intent["reasoning"]
    auto_image_search = intent["image_search"]
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
            search_all(request.message, image_search=auto_image_search),
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
        full_response = ""

        mode_event = {
            "type": "mode_detected",
            "web_search": auto_web_search,
            "reasoning": auto_reasoning,
            "image_search": auto_image_search,
            "max_output": False,
        }
        yield f"data: {json.dumps(mode_event)}\n\n"

        if auto_web_search:
            yield f"data: {json.dumps({'type': 'search_status', 'content': 'Searching the web...'})}\n\n"

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
            text_context = format_text_context(web_results)
            search_block = (
                f"\n--- [ADDITIONAL WEB RESEARCH] ---\n"
                f"Use these results to comprehensively answer the user's query.\n"
                f"**CRITICAL:** You MUST cite your sources inline using precise markdown bracket format like [1], [2], pointing to the matching source numbers provided below.\n"
                f"Do NOT display raw image URLs or links. Always cite them like [1].\n\n"
                f"{text_context}\n"
            )
            effective_message += search_block

        async for chunk in ai_router.stream_chat(
            message=effective_message,
            history=request.history,
            mode=effective_mode,
            provider=request.provider,
            model=request.model,
            memory_profile=current_user.memory_profile,
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
