"""
LACUNEX AI FastAPI application entry point.
"""

import os
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
    await init_db()
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
 
