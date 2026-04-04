"""
LACUNEX AI — Gap Detection System (CORE IDEA)
Analyzes conversations to identify missing knowledge, ambiguity, and assumptions.
Uses Gemini for analytical reasoning.
"""

import json
from typing import Optional
from google import genai
from google.genai import types
import os


class GapDetector:
    def __init__(self):
        self.client = genai.Client(api_key=os.getenv("GOOGLE_AI_API_KEY"))

    async def detect_gaps(self, user_message: str, ai_response: str) -> dict:
        prompt = (
            "Analyze this conversation and identify knowledge gaps.\n\n"
            f'User: "{user_message}"\n'
            f'AI Response: "{ai_response[:2000]}"\n\n'
            "Return ONLY valid JSON with these fields:\n"
            "{\n"
            '  "gaps_found": ["list of specific knowledge gaps"],\n'
            '  "improved_explanation": "brief enhancement note",\n'
            '  "confidence": <0-100>\n'
            "}\n"
            "If no gaps, return empty gaps_found and high confidence."
        )

        try:
            response = await self.client.aio.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    max_output_tokens=1024,
                ),
            )
            text = response.text.strip()
            if "```" in text:
                text = text.replace("```json", "").replace("```", "").strip()
            result = json.loads(text)
            return {
                "gaps_found": result.get("gaps_found", []),
                "improved_explanation": result.get("improved_explanation", ""),
                "confidence": min(100, max(0, result.get("confidence", 80))),
            }
        except Exception as e:
            print(f"[GapDetector] Error: {e}")
            return {"gaps_found": [], "improved_explanation": "", "confidence": 75}


gap_detector = GapDetector()
