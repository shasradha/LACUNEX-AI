"""
Ephemeral export route — LACUNEX AI.
Receives decrypted messages from the frontend and returns a file download.

Routes:
  POST /api/export        — Export chat messages (existing)
  POST /api/export/document — Export structured document (new)
  POST /api/export/all    — Export all formats as ZIP (new)

Nothing is stored or logged server-side.
"""

import io
import re
import zipfile
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from pydantic import BaseModel

from services.auth_service import get_current_user
from models.db_models import User
from services.export_service import generate_pdf, generate_docx, generate_xlsx
from services.document_renderer import render_document_html, get_theme_css, THEMES

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


class DocumentExportRequest(BaseModel):
    document_json: dict
    theme: str = "professional"
    format: Literal["pdf", "docx", "xlsx"] = "pdf"


class DocumentExportAllRequest(BaseModel):
    document_json: dict
    theme: str = "professional"


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


@router.post("/document")
async def export_document(
    body: DocumentExportRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Export a structured document (from document_json) in the specified format.
    Uses the document rendering engine for themed output.
    """
    from services._export_v2 import (
        generate_document_pdf,
        generate_document_docx,
        generate_document_xlsx,
    )

    doc = body.document_json
    title = doc.get("title", "Lacunex Document")
    filename = _safe_filename(title)

    from fastapi import HTTPException
    import traceback

    try:
        if body.format == "pdf":
            content = generate_document_pdf(doc, body.theme)
            media_type = "application/pdf"
            ext = "pdf"
        elif body.format == "docx":
            content = generate_document_docx(doc, body.theme)
            media_type = (
                "application/vnd.openxmlformats-officedocument"
                ".wordprocessingml.document"
            )
            ext = "docx"
        else:
            content = generate_document_xlsx(doc, body.theme)
            media_type = (
                "application/vnd.openxmlformats-officedocument"
                ".spreadsheetml.sheet"
            )
            ext = "xlsx"
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate {body.format.upper()}: {str(e)}")

    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}.{ext}"',
            "Cache-Control": "no-store",
        },
    )


@router.post("/all")
async def export_all(
    body: DocumentExportAllRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Export a structured document in ALL formats (PDF + DOCX + XLSX) as a ZIP bundle.
    """
    from services._export_v2 import (
        generate_document_pdf,
        generate_document_docx,
        generate_document_xlsx,
    )

    doc = body.document_json
    title = doc.get("title", "Lacunex Document")
    filename = _safe_filename(title)

    from fastapi import HTTPException
    import traceback

    try:
        pdf_bytes = generate_document_pdf(doc, body.theme)
        docx_bytes = generate_document_docx(doc, body.theme)
        xlsx_bytes = generate_document_xlsx(doc, body.theme)

        # Bundle into ZIP
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr(f"{filename}.pdf", pdf_bytes)
            zf.writestr(f"{filename}.docx", docx_bytes)
            zf.writestr(f"{filename}.xlsx", xlsx_bytes)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to bundle all exports: {str(e)}")

    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}_all.zip"',
            "Cache-Control": "no-store",
        },
    )


@router.get("/themes")
async def get_themes():
    """Return available document themes."""
    return [
        {"id": key, "name": val["name"]}
        for key, val in THEMES.items()
    ]
