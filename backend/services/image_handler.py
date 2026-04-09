"""
Image generation and image analysis helpers.
"""

import os
import urllib.parse

from google import genai
from google.genai import types


class ImageHandler:
    def __init__(self):
        raw = os.getenv("GEMINI_API_KEYS", "")
        keys = [k.strip() for k in raw.split(",") if k.strip()]
        api_key = keys[0] if keys else os.getenv("GOOGLE_AI_API_KEY")
        self.client = genai.Client(api_key=api_key) if api_key else None

    async def generate_image(self, prompt: str) -> dict:
        cleaned_prompt = (prompt or "").strip()
        if not cleaned_prompt:
            return {
                "error": "Please provide an image prompt.",
                "text": "",
                "image": None,
            }

        encoded_prompt = urllib.parse.quote(cleaned_prompt)
        image_url = (
            "https://image.pollinations.ai/prompt/"
            f"{encoded_prompt}?width=1024&height=1024&model=flux&nologo=true&private=true"
        )

        return {
            "text": f"Generated image for: **{cleaned_prompt}**",
            "image": {
                "url": image_url,
                "mime_type": "image/png",
            },
        }

    async def analyze_image(
        self,
        image_bytes: bytes,
        mime_type: str = "image/png",
        prompt: str | None = None,
    ) -> dict:
        try:
            analysis_prompt = prompt or (
                "Analyze this image clearly and practically. Explain what is visible, "
                "what context you can infer, and any important details or issues."
            )

            image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
            response = await self.client.aio.models.generate_content(
                model="gemini-2.5-flash",
                contents=[image_part, analysis_prompt],
            )

            return {
                "analysis": response.text or "No analysis was returned.",
                "context": "",
                "insights": [],
            }
        except Exception as exc:
            return {
                "error": str(exc),
                "analysis": "",
                "context": "",
                "insights": [],
            }


image_handler = ImageHandler()
