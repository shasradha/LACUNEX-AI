"""
LACUNEX AI — Persistent Human Memory Service
Automatically extracts and organizes user preferences and facts from their conversations.
"""

import json
from google import genai
from google.genai import types
import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.db_models import User

# Define the extraction prompt
MEMORY_SYSTEM_PROMPT = """
You are an intelligent memory extraction engine. 
Analyze the provided user message to see if they are stating a fact about themselves, their preferences, their name, their role, or providing a persistent instruction for how you should behave in the future.

If there is NO persistent fact or preference, return exactly {"extracted": false}

If there IS a persistent fact, extract it as a short, clear string, and return JSON like this:
{"extracted": true, "fact": "The user is a software engineer who prefers Python and concise answers."}
"""

async def extract_and_save_memory(user_id: str, message: str):
    """
    Analyzes a user's message asynchronously to detect personal facts/instructions.
    If found, it updates the user's `memory_profile` in the database.
    """
    from database.connection import async_session_factory
    
    try:
        # Don't waste API calls on super short, generic messages
        if len(message.split()) < 3:
            return

        client = genai.Client(api_key=os.getenv("GOOGLE_AI_API_KEY"))
        
        # We use a fast, cheap model for background processing
        result = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=message,
            config=types.GenerateContentConfig(
                system_instruction=MEMORY_SYSTEM_PROMPT,
                response_mime_type="application/json",
            ),
        )
        
        response_data = json.loads(result.text)
        if response_data.get("extracted") and response_data.get("fact"):
            new_fact = response_data["fact"]
            
            async with async_session_factory() as db:
                # Fetch user from DB
                query_result = await db.execute(select(User).where(User.id == user_id))
                user = query_result.scalar_one_or_none()
                if not user:
                    return
                    
                # Update their memory
                current_memory = user.memory_profile or {}
                facts = current_memory.get("facts", [])
                if new_fact not in facts:
                    facts.append(new_fact)
                    # Keep memory concise (last 10 facts) to avoid huge system prompts
                    if len(facts) > 10:
                        facts = facts[-10:]
                    current_memory["facts"] = facts
                    user.memory_profile = current_memory
                    
                    await db.commit()
                    print(f"[MemoryService] Successfully saved new user fact: {new_fact}")

    except Exception as e:
        print(f"[MemoryService] Background extraction failed: {e}")
