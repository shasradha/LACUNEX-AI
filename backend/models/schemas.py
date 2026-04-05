"""
LACUNEX AI — Pydantic Schemas
Request/Response validation models for all API endpoints.
"""

from pydantic import BaseModel
from typing import Optional, List


# ─── Auth ────────────────────────────────────────────────────────────────────

class SignUpRequest(BaseModel):
    email: str
    password: str
    name: str


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    id: str
    email: str
    name: str


# ─── Chat ────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    mode: str = "normal"
    conversation_id: Optional[str] = None
    history: Optional[List[dict]] = None
    provider: str = "groq"
    model: Optional[str] = None
    web_search: bool = False


class ChatResponse(BaseModel):
    answer: str
    gaps_found: Optional[List[str]] = None
    confidence: Optional[float] = None
    mode: str = "normal"


# ─── Image ───────────────────────────────────────────────────────────────────

class ImageGenerateRequest(BaseModel):
    prompt: str


class ImageAnalyzeResponse(BaseModel):
    analysis: str
    context: str
    insights: List[str]


# ─── History (E2EE — all content fields are encrypted) ──────────────────────

class EncryptedMessageSave(BaseModel):
    conversation_id: str
    role: str
    encrypted_content: str
    iv: str
    mode: str = "normal"
    confidence: Optional[float] = None
    gaps_found: Optional[List[str]] = None
    image_results: Optional[List[dict]] = None
    image_data: Optional[str] = None


class MessageHistoryItem(BaseModel):
    id: str
    role: str
    encrypted_content: str
    iv: str
    mode: str
    confidence: Optional[float]
    gaps_found: Optional[List[str]]
    image_results: Optional[List[dict]]
    image_data: Optional[str]
    created_at: str


class ConversationListItem(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int


class ConversationDetail(BaseModel):
    id: str
    title: str
    messages: List[MessageHistoryItem]
