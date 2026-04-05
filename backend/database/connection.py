"""
LACUNEX AI — Database Connection
Async SQLAlchemy with aiosqlite for zero-setup persistence.
"""

import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from dotenv import load_dotenv

load_dotenv()

# Get database URL from env, default to local SQLite
raw_db_url = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./lacunex.db")

# Render/Heroku often provide 'postgres://', which SQLAlchemy needs as 'postgresql+asyncpg://'
if raw_db_url.startswith("postgres://"):
    DATABASE_URL = raw_db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif raw_db_url.startswith("postgresql://"):
    DATABASE_URL = raw_db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
else:
    DATABASE_URL = raw_db_url

# Fix: PgBouncer (Supabase Pooler) does not support prepared statements with asyncpg.
# We must set statement_cache_size to 0.
engine = create_async_engine(
    DATABASE_URL, 
    echo=False,
    pool_pre_ping=True,
    pool_recycle=3600,
    connect_args={"statement_cache_size": 0}
)

async_session_factory = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


async def get_db():
    """FastAPI dependency — yields an async DB session."""
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()


async def sync_schema(conn):
    """
    Check for missing columns in existing tables and add them if needed.
    This is essential for production environments like Render where create_all
    does not automatically update existing schemas.
    """
    from sqlalchemy import text
    try:
        # Check if 'image_results' exists in 'messages' table
        # We use a broad 'ALTER TABLE ... ADD COLUMN ... IF NOT EXISTS' style
        # note: PostgreSQL supports this well.
        print("[Database] Checking for schema updates...")
        await conn.execute(text("ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_results JSON;"))
        print("[Database] Schema sync successful.")
    except Exception as e:
        # If SQLite (which doesn't support IF NOT EXISTS for ADD COLUMN), we try-catch
        error_str = str(e).lower()
        if "duplicate column" in error_str or "already exists" in error_str:
            pass # Column exists, all good!
        else:
            print(f"[Database] Schema sync warning: {e}")


async def init_db():
    """Create all tables and sync schema on startup."""
    from models.db_models import User, Conversation, Message  # noqa: F401
    async with engine.begin() as conn:
        # 1. Create base tables
        await conn.run_sync(Base.metadata.create_all)
        # 2. Run manual schema sync for new features
        await sync_schema(conn)
