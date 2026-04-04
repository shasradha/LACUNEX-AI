"""
LACUNEX AI — Chat Route
POST /api/chat — Streaming chat with AI (SSE)

The plaintext is processed in-memory ONLY for AI inference.
The client is responsible for encrypting and saving to /api/history/message.
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
from services.search_service import search_all, format_search_context

router = APIRouter(prefix="/api", tags=["Chat"])


@router.post("/generate")
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Stream AI response via Server-Sent Events.
    Events: search_status | thinking | token | done | error
    """

    # If web search is enabled, run it before streaming
    search_context = ""
    if request.web_search:
        try:
            search_data = await asyncio.wait_for(
                search_all(request.message),
                timeout=6.0,
            )
            search_context = format_search_context(search_data)
        except (asyncio.TimeoutError, Exception) as e:
            print(f"[Chat] Search failed or timed out: {e}")
            search_context = ""

    async def event_stream():
        full_response = ""

        # Notify client that search is happening
        if request.web_search:
            yield f"data: {json.dumps({'type': 'search_status', 'content': 'Searching the web...'})}\n\n"

        # Build a search-augmented message if we have results
        effective_message = request.message
        if search_context:
            effective_message = (
                f"{request.message}\n\n"
                f"---\n"
                f"**LIVE WEB SEARCH RESULTS** (Use these to answer accurately. "
                f"Cite sources with markdown links. If images were found, display them using markdown image syntax `![title](url)`):\n\n"
                f"{search_context}"
            )

        async for chunk in ai_router.stream_chat(
            message=effective_message,
            history=request.history,
            mode=request.mode,
            provider=request.provider,
            model=request.model,
        ):
            if chunk["type"] == "thinking":
                yield f"data: {json.dumps(chunk)}\n\n"

            elif chunk["type"] == "token":
                full_response += chunk.get("content", "")
                yield f"data: {json.dumps(chunk)}\n\n"

            elif chunk["type"] == "done":
                # Run gap detection async with timeout — don't block response
                gap_result = {"gaps_found": [], "confidence": 80}
                if full_response and request.mode == "think":
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
                    "mode": request.mode,
                    "web_search": request.web_search,
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
