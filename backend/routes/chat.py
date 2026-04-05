"""
LACUNEX AI — Chat Route
POST /api/generate — Streaming chat with AI (SSE)

Pipeline:
  1. Detect intent (web search / reasoning) — instant, no API calls
  2. If web search needed → fetch live results in parallel
  3. Inject results into AI context
  4. Stream AI response token-by-token
  5. Run gap detection (thinking mode only)
  6. Emit structured `done` event with full metadata
"""

import json
import asyncio
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from models.schemas import ChatRequest
from models.db_models import User
from services.auth_service import get_current_user
from services.ai_router import ai_router
from services.gap_detector import gap_detector
from services.search_service import search_all, format_text_context
from services.intent_detector import detect_intent

router = APIRouter(prefix="/api", tags=["Chat"])


@router.post("/generate")
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Stream AI response via Server-Sent Events.
    Events: mode_detected | search_status | thinking | token | done | error
    """

    # ── Step 1: Run intent detection (instant, no API calls) ─────────────────
    intent = detect_intent(request.message)

    # Respect user's explicit choices, but fill in gaps with auto-detection
    auto_web_search = request.web_search or intent["web_search"]
    auto_reasoning = (request.mode == "think") or intent["reasoning"]
    auto_image_search = intent["image_search"]

    # Determine effective mode
    effective_mode = "think" if auto_reasoning else "normal"

    # ── Step 2: Fetch web results if needed ───────────────────────────────────
    search_data = {"web_results": [], "image_results": []}
    if auto_web_search:
        try:
            # Increased timeout to 15s to allow heavy image/web gathering to complete
            search_data = await asyncio.wait_for(
                search_all(request.message, image_search=auto_image_search),
                timeout=15.0,
            )
        except (asyncio.TimeoutError, Exception) as e:
            print(f"[Chat] Search failed or timed out: {e}")

    web_results = search_data.get("web_results", [])
    image_results = search_data.get("image_results", [])

    # ── SSE Generator ─────────────────────────────────────────────────────────
    async def event_stream():
        full_response = ""

        # Notify client of auto-detected modes immediately
        mode_event = {
            "type": "mode_detected",
            "web_search": auto_web_search,
            "reasoning": auto_reasoning,
            "image_search": auto_image_search,
        }
        yield f"data: {json.dumps(mode_event)}\n\n"

        # Show searching status
        if auto_web_search:
            yield f"data: {json.dumps({'type': 'search_status', 'content': 'Searching the web...'})}\n\n"

        # Build search-augmented message
        effective_message = request.message
        if web_results:
            text_context = format_text_context(web_results)
            effective_message = (
                f"{request.message}\n\n"
                f"---\n"
                f"**LIVE WEB SEARCH RESULTS** (Answer accurately using these. "
                f"Cite sources with markdown links. Do NOT display image URLs in your text — "
                f"images will be shown separately in the UI.):\n\n"
                f"{text_context}"
            )

        async for chunk in ai_router.stream_chat(
            message=effective_message,
            history=request.history,
            mode=effective_mode,
            provider=request.provider,
            model=request.model,
        ):
            if chunk["type"] == "thinking":
                yield f"data: {json.dumps(chunk)}\n\n"

            elif chunk["type"] == "token":
                full_response += chunk.get("content", "")
                yield f"data: {json.dumps(chunk)}\n\n"

            elif chunk["type"] == "done":
                # Gap detection (thinking mode only, with tight timeout)
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
                    "web_search": auto_web_search,
                    "reasoning": auto_reasoning,
                    "image_results": image_results,  # structured list for gallery
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
