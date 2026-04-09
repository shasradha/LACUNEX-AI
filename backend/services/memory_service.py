"""
LACUNEX AI — Persistent Human Memory Service
Automatically extracts and organizes user preferences and facts from conversations.
Uses Groq (primary) — no dependency on exhausted Gemini free tier.
"""

import json
import os
from groq import AsyncGroq


MEMORY_SYSTEM_PROMPT = (
    "You are an intelligent memory extraction engine. "
    "Analyze the user message to detect if they are stating a PERSISTENT fact about themselves, "
    "their preferences, name, role, or giving a persistent instruction on how the AI should behave.\n\n"
    "If there is NO persistent fact or preference, return exactly: {\"extracted\": false}\n\n"
    "If there IS a persistent fact, return: "
    "{\"extracted\": true, \"fact\": \"The user is a software engineer who prefers Python.\"}\n\n"
    "Return ONLY valid JSON. No explanation. No markdown."
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

        client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

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
