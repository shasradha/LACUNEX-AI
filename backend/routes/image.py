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

import httpx
import os

@router.post("/search")
async def search_images_endpoint(query: str, count: int = 12):
    results = []

    # Try Unsplash first
    unsplash_key = os.getenv("UNSPLASH_ACCESS_KEY", "")
    if unsplash_key:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(
                    "https://api.unsplash.com/search/photos",
                    params={"query": query, "per_page": count, "orientation": "landscape"},
                    headers={"Authorization": f"Client-ID {unsplash_key}"}
                )
                data = r.json()
                results = [{
                    "url": p["urls"]["full"],
                    "thumb": p["urls"]["small"],
                    "alt": p["alt_description"] or query,
                    "photographer": p["user"]["name"],
                    "source": "Unsplash"
                } for p in data.get("results", [])]
        except: pass

    # Fallback: Pixabay
    if len(results) < 6:
        pixabay_key = os.getenv("PIXABAY_API_KEY", "")
        if pixabay_key:
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    r = await client.get(
                        "https://pixabay.com/api/",
                        params={"key": pixabay_key, "q": query,
                                "image_type": "photo", "per_page": count,
                                "safesearch": "true"}
                    )
                    data = r.json()
                    results += [{
                        "url": h["largeImageURL"],
                        "thumb": h["previewURL"],
                        "alt": query,
                        "photographer": h["user"],
                        "source": "Pixabay"
                    } for h in data.get("hits", [])]
            except: pass

    # Last fallback: Pexels
    if len(results) < 6:
        pexels_key = os.getenv("PEXELS_API_KEY", "")
        if pexels_key:
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    r = await client.get(
                        "https://api.pexels.com/v1/search",
                        params={"query": query, "per_page": count},
                        headers={"Authorization": pexels_key}
                    )
                    data = r.json()
                    results += [{
                        "url": p["src"]["original"],
                        "thumb": p["src"]["medium"],
                        "alt": p.get("alt", query),
                        "photographer": p["photographer"],
                        "source": "Pexels"
                    } for p in data.get("photos", [])]
            except: pass

    return {"images": results[:count], "query": query}
