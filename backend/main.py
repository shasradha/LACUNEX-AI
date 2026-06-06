"""
LACUNEX AI FastAPI application entry point.
"""

import os
import asyncio
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from database.connection import init_db
from routes import auth, chat, executor, export, history, image, flow, model_catalog, files, stats


def get_allowed_origins() -> list[str]:
    defaults = {
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://lacunex.vercel.app",
        "https://lacunex-ai.vercel.app",
        "http://localhost",
        "https://localhost",
        "capacitor://localhost",
    }

    configured = os.getenv("CORS_ORIGINS") or os.getenv("FRONTEND_URL")
    if configured:
        if configured == "*":
            return ["*"]
        defaults.update(
            origin.strip()
            for origin in configured.split(",")
            if origin.strip()
        )

    return sorted(defaults)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Try initializing the database with retries
    max_retries = 3
    retry_delay = 3
    db_initialized = False
    
    for attempt in range(1, max_retries + 1):
        try:
            print(f"[Database] Connection attempt {attempt}/{max_retries}...")
            await init_db()
            db_initialized = True
            print("[Database] Successfully connected and initialized database.")
            break
        except Exception as e:
            print(f"[Database] Attempt {attempt} failed: {e}")
            if attempt < max_retries:
                await asyncio.sleep(retry_delay)

    if not db_initialized:
        print("==========================================")
        print("|  WARNING: Database initialization failed!|")
        print("|  The server will start, but database    |")
        print("|  queries will fail until DB is online.  |")
        print("==========================================")

    print("==========================================")
    print("|        LACUNEX AI -- Backend Online    |")
    print("|  Filling the gaps humans can't reach...|")
    print("==========================================")
    yield
    print("LACUNEX AI -- Backend shutting down")



app = FastAPI(
    title="LACUNEX AI",
    description="Next-generation AI platform for secure chat and image workflows.",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(export.router)
app.include_router(image.router)
app.include_router(flow.router)
app.include_router(history.router)
app.include_router(model_catalog.router)
app.include_router(files.router)
app.include_router(executor.router, prefix="/api")
app.include_router(stats.router, prefix="/api/stats")


@app.get("/")
async def root():
    return {
        "name": "LACUNEX AI",
        "tagline": "Filling the gaps humans can't reach",
        "version": "4.0.0",
        "status": "operational",
        "author": "Shasradha Karmakar",
        "allowed_origins": get_allowed_origins(),
    }
 
