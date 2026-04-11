"""
LACUNEX AI — Persistent Human Memory Service
Automatically extracts and organizes user preferences and facts from conversations.
Uses Groq (primary) — no dependency on exhausted Gemini free tier.
"""

import json
import os
from groq import AsyncGroq


MEMORY_SYSTEM_PROMPT = (
    "You are LACUNEX's memory extraction engine. "
    "Analyze the user message to detect any PERSISTENT facts about them. "
    "We want to extract specific structural fields if present, as well as general facts.\n\n"
    "Look for:\n"
    "- Name: ('My name is Shasradha', 'I am Rahul')\n"
    "- Institute/Work: ('I am from Techno Main Salt Lake', 'I work at Google')\n"
    "- Board/Exam: ('WBSCTVE', 'CBSE', 'JEE Mains', 'Semester 5')\n"
    "- Subject Focus: ('I study Mechanical', 'I love Physics')\n"
    "- Language/Tone Pref: ('Explain in Hindi', 'Use simple words')\n\n"
    "Return exactly ONE valid JSON object, like this:\n"
    "{\n"
    "  \"extracted\": true,\n"
    "  \"fact\": \"User's name is Shasradha. User studies Mechanical Engineering at Techno Main.\",\n"
    "  \"struct\": {\n    \"name\": \"Shasradha\", \"institute\": \"Techno Main\", \"board\": null, \"subject\": \"Mechanical\", \"pref\": null\n  }\n"
    "}\n"
    "If absolutely NO persistent facts are mentioned, return: {\"extracted\": false}\n"
    "Do NOT return any other text, ONLY the JSON."
)


async def extract_and_save_memory(user_id: str, message: str):
    """
    Analyzes a user's message asynchronously to detect personal facts/instructions.
    If found, updates the user's memory_profile in the database.
    Uses Groq — fast, free, and reliable.
    """
    from database.connection import async_session_factory
    from models.db_models import User
    from sqlalchemy.future import select
    from sqlalchemy.orm.attributes import flag_modified

    try:
        # Don't waste API calls on very short messages
        if len(message.split()) < 4:
            return

        groq_key = None
        raw = os.getenv("GROQ_API_KEYS", "")
        keys = [k.strip() for k in raw.split(",") if k.strip()]
        groq_key = keys[0] if keys else os.getenv("GROQ_API_KEY")

        if not groq_key:
            print("[MemoryService] No Groq API key available, skipping extraction.")
            return

        client = AsyncGroq(api_key=groq_key)

        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant",   # Fast 8B model — ideal for background tasks
            messages=[
                {"role": "system", "content": MEMORY_SYSTEM_PROMPT},
                {"role": "user", "content": message},
            ],
            temperature=0.1,
            max_tokens=256,
            response_format={"type": "json_object"},
        )

        text = response.choices[0].message.content.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        response_data = json.loads(text)

        if response_data.get("extracted") and response_data.get("fact"):
            new_fact = response_data["fact"]

            async with async_session_factory() as db:
                result = await db.execute(select(User).where(User.id == user_id))
                user = result.scalar_one_or_none()
                if not user:
                    return

                current_memory = dict(user.memory_profile or {})
                facts = list(current_memory.get("facts", []))

                if new_fact not in facts:
                    facts.append(new_fact)
                    # Keep memory concise (last 10 facts)
                    if len(facts) > 10:
                        facts = facts[-10:]
                    current_memory["facts"] = facts
                    user.memory_profile = current_memory
                    flag_modified(user, "memory_profile")
                    await db.commit()
                    print(f"[MemoryService] Saved user fact: {new_fact}")

    except Exception as e:
        print(f"[MemoryService] Background extraction failed: {e}")
