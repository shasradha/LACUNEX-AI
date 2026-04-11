from fastapi import APIRouter, Depends
from typing import Dict, Any

from database.connection import async_session_factory
from models.db_models import User
from auth.dependencies import get_current_user

router = APIRouter()

@router.get("/")
async def get_stats(current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Returns analytics and stats for the current user and platform.
    (Mocked/derived data for the v4.0 upgrade).
    """
    # Simple metrics derivation from memory_profile
    msgs = 0
    docs = 0
    if current_user.memory_profile:
        facts_len = len(current_user.memory_profile.get("facts", []))
        msgs = facts_len * 15 + 42  # Synthetic estimate based on facts count
        docs = facts_len * 2 + 5

    # Determine active provider. Since we have multiple rotators, 
    # we represent the primary as Groq / Cerebras.
    active_provider = "Cerebras ⚡" if current_user.tier == "premium" else "Groq 🔥"

    return {
        "status": "success",
        "data": {
            "total_messages": msgs,
            "documents_generated": docs,
            "active_provider": active_provider,
            "database_status": "Online (Sync)",
            "user_tier": current_user.tier,
            "memory_items": len(current_user.memory_profile.get("facts", [])) if current_user.memory_profile else 0,
        }
    }
