"""
LACUNEX AI image routes.
POST /api/image/generate  - Generate image from prompt
POST /api/image/analyze   - Analyze an uploaded image
"""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from models.db_models import User
from models.schemas import ImageGenerateRequest
from services.auth_service import get_current_user
from services.image_handler import image_handler

router = APIRouter(prefix="/api/image", tags=["Image"])


@router.post("/generate")
async def generate_image(
    request: ImageGenerateRequest,
    current_user: User = Depends(get_current_user),
):
    result = await image_handler.generate_image(request.prompt)
    if result.get("error"):
        raise HTTPException(status_code=500, detail=result["error"])
    return result


@router.post("/analyze")
async def analyze_image(
    file: UploadFile = File(...),
    prompt: str = Form(None),
    current_user: User = Depends(get_current_user),
):
    contents = await file.read()
    mime = file.content_type or "image/png"
    result = await image_handler.analyze_image(contents, mime, prompt)
    if result.get("error"):
        raise HTTPException(status_code=500, detail=result["error"])
    return result
