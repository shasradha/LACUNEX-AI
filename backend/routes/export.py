"""
Ephemeral export route — LACUNEX AI.
Receives decrypted messages from the frontend and returns a file download.
Nothing is stored or logged server-side.
"""

import re
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from pydantic import BaseModel

from services.auth_service import get_current_user
from models.db_models import User
from services.export_service import generate_pdf, generate_docx, generate_xlsx

router = APIRouter(prefix="/api/export", tags=["Export"])


class MessageIn(BaseModel):
    role: str = "user"
    content: str = ""
    created_at: str | None = None


class ExportRequest(BaseModel):
    title: str = "Lacunex AI Conversation"
    format: Literal["pdf", "docx", "xlsx"] = "pdf"
    messages: list[MessageIn]
    model_name: str | None = None


def _safe_filename(title: str) -> str:
    clean = re.sub(r"[^\w\s\-]", "", title).strip()
    clean = re.sub(r"\s+", "-", clean)
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M")
    return f"{clean[:60]}_{ts}" if clean else f"lacunex-export_{ts}"


@router.post("")
async def export_conversation(
    body: ExportRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Generate a document from the supplied messages.
    Ephemeral: data is only held in-memory for the duration of this function call.
    """
    messages = [m.model_dump() for m in body.messages if m.content.strip()]
    filename = _safe_filename(body.title)

    if body.format == "pdf":
        content = generate_pdf(body.title, messages, body.model_name)
        media_type = "application/pdf"
        ext = "pdf"
    elif body.format == "docx":
        content = generate_docx(body.title, messages, body.model_name)
        media_type = (
            "application/vnd.openxmlformats-officedocument"
            ".wordprocessingml.document"
        )
        ext = "docx"
    else:  # xlsx
        content = generate_xlsx(body.title, messages, body.model_name)
        media_type = (
            "application/vnd.openxmlformats-officedocument"
            ".spreadsheetml.sheet"
        )
        ext = "xlsx"

    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}.{ext}"',
            "Cache-Control": "no-store",
        },
    )
