"""
LACUNEX AI — Gap Detection System
Analyzes conversations to identify missing knowledge and ambiguity.
Uses Groq (primary) with Gemini backup — no dependency on exhausted free tier.
"""

import json
import os
from groq import AsyncGroq
from google import genai
from google.genai import types


class GapDetector:
    def __init__(self):
        self.groq = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
        self.gemini = genai.Client(api_key=os.getenv("GOOGLE_AI_API_KEY"))

    async def detect_gaps(self, user_message: str, ai_response: str) -> dict:
        prompt = (
            "Analyze this conversation and identify knowledge gaps.\n\n"
            f'User: "{user_message}"\n'
            f'AI Response: "{ai_response[:1500]}"\n\n'
            "Return ONLY valid JSON with exactly these fields:\n"
            "{\n"
            '  "gaps_found": ["list of specific knowledge gaps or []"],\n'
            '  "improved_explanation": "brief enhancement note",\n'
            '  "confidence": <0-100>\n'
            "}\n"
            "If no gaps found, return empty gaps_found array and confidence 90+."
        )

        # Try Groq first (fast, free, no quota issues)
        try:
            response = await self.groq.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are a gap detection engine. Return ONLY valid JSON."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
                max_tokens=512,
                response_format={"type": "json_object"},
            )
            text = response.choices[0].message.content.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
            result = json.loads(text)
            return {
                "gaps_found": result.get("gaps_found", []),
                "improved_explanation": result.get("improved_explanation", ""),
                "confidence": min(100, max(0, result.get("confidence", 80))),
            }
        except Exception as e:
            print(f"[GapDetector] Groq failed: {e}")

        # Fallback: Gemini (may be rate-limited but worth trying)
        try:
            response = await self.gemini.aio.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    max_output_tokens=512,
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
            print(f"[GapDetector] Gemini fallback also failed: {e}")

        return {"gaps_found": [], "improved_explanation": "", "confidence": 75}


gap_detector = GapDetector()
