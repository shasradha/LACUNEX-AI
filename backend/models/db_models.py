"""
LACUNEX AI — Database Models
All message content is stored ENCRYPTED (AES-256-GCM).
The server never persists plaintext messages.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Float, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database.connection import Base


def _uuid():
    return str(uuid.uuid4())


def _now():
    # PostgreSQL's TIMESTAMP WITHOUT TIME ZONE needs a naive datetime.
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    memory_profile = Column(JSON, nullable=True, default=dict) # E.g. {"name": "Shasradha", "preferences": ["likes python", "wants short answers"]}
    created_at = Column(DateTime, default=_now)

    conversations = relationship(
        "Conversation", back_populates="user", cascade="all, delete-orphan"
    )


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, default="New Chat")
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    user = relationship("User", back_populates="conversations")
    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False)
    role = Column(String, nullable=False)          # "user" | "assistant"
    encrypted_content = Column(Text, nullable=False)  # AES-256-GCM ciphertext (base64)
    iv = Column(String, nullable=False)               # Initialization vector (base64)
    mode = Column(String, default="normal")            # "normal" | "think"
    confidence = Column(Float, nullable=True)
    gaps_found = Column(JSON, nullable=True)
    image_results = Column(JSON, nullable=True)        # Persistent Image Gallery (Carousel)
    web_results = Column(JSON, nullable=True)          # Persistent Web Sources Citation Block
    image_data = Column(Text, nullable=True)           # Encrypted base64 image data
    created_at = Column(DateTime, default=_now)

    conversation = relationship("Conversation", back_populates="messages")
