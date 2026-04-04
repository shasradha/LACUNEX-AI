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

router = APIRouter(prefix="/api", tags=["Chat"])


@router.post("/generate")
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Stream AI response via Server-Sent Events.
    Events: thinking | token | done | error
    """

    async def event_stream():
        full_response = ""

        async for chunk in ai_router.stream_chat(
            message=request.message,
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
