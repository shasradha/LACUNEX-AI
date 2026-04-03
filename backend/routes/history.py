"""
Encrypted conversation history routes.
"""

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database.connection import get_db
from models.db_models import Conversation, Message, User
from models.schemas import (
    ConversationDetail,
    ConversationListItem,
    EncryptedMessageSave,
    MessageHistoryItem,
)
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/history", tags=["History"])


class CreateConversationRequest(BaseModel):
    title: str = "New workspace"


class UpdateTitleRequest(BaseModel):
    title: str


@router.get("/", response_model=List[ConversationListItem])
async def get_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation, func.count(Message.id).label("message_count"))
        .outerjoin(Message)
        .where(Conversation.user_id == current_user.id)
        .group_by(Conversation.id)
        .order_by(Conversation.updated_at.desc())
    )

    return [
        ConversationListItem(
            id=conversation.id,
            title=conversation.title,
            created_at=conversation.created_at.isoformat(),
            updated_at=conversation.updated_at.isoformat(),
            message_count=message_count,
        )
        for conversation, message_count in result.all()
    ]


@router.post("/session")
async def create_conversation(
    body: CreateConversationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conversation = Conversation(user_id=current_user.id, title=body.title.strip() or "New workspace")
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    return {"id": conversation.id, "title": conversation.title}


@router.post("/message")
async def save_message(
    message: EncryptedMessageSave,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == message.conversation_id,
            Conversation.user_id == current_user.id,
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    db.add(
        Message(
            conversation_id=message.conversation_id,
            role=message.role,
            encrypted_content=message.encrypted_content,
            iv=message.iv,
            mode=message.mode,
            confidence=message.confidence,
            gaps_found=message.gaps_found,
            image_data=message.image_data,
        )
    )
    conversation.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"status": "saved"}


@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = [
        MessageHistoryItem(
            id=message.id,
            role=message.role,
            encrypted_content=message.encrypted_content,
            iv=message.iv,
            mode=message.mode,
            confidence=message.confidence,
            gaps_found=message.gaps_found,
            image_data=message.image_data,
            created_at=message.created_at.isoformat(),
        )
        for message in conversation.messages
    ]

    return ConversationDetail(
        id=conversation.id,
        title=conversation.title,
        messages=messages,
    )


@router.put("/{conversation_id}/title")
async def update_title(
    conversation_id: str,
    body: UpdateTitleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conversation.title = body.title.strip() or "New workspace"
    await db.commit()
    return {"status": "updated"}


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    await db.delete(conversation)
    await db.commit()
    return {"status": "deleted"}
