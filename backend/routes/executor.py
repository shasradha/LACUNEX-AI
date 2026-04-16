"""
Piston execution proxy for LACUNEX Code Studio.
Uses emkc.org/api/v2/piston for free, high-performance code execution.
"""

import os
import time
import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from collections import defaultdict

router = APIRouter()

# ── Rate limiting ────────────────────────────────
RATE_LIMIT = 20  # Piston is more generous
RATE_WINDOW = 60
_rate_store: dict = defaultdict(list)

def check_rate_limit(ip: str) -> bool:
    now = time.time()
    window_start = now - RATE_WINDOW
    _rate_store[ip] = [t for t in _rate_store[ip] if t > window_start]
    if len(_rate_store[ip]) >= RATE_LIMIT:
        return False
    _rate_store[ip].append(now)
    return True

# ── Piston config ────────────────────────────────
PISTON_URL = os.getenv("PISTON_URL", "https://emkc.org/api/v2/piston")

# Language to Piston runtime mapping
PISTON_RUNTIMES = {
    "python": {"language": "python", "version": "3.10.0"},
    "python3": {"language": "python", "version": "3.10.0"},
    "javascript": {"language": "javascript", "version": "18.15.0"},
    "js": {"language": "javascript", "version": "18.15.0"},
    "typescript": {"language": "typescript", "version": "5.0.3"},
    "ts": {"language": "typescript", "version": "5.0.3"},
    "c": {"language": "c", "version": "10.2.0"},
    "cpp": {"language": "cpp", "version": "10.2.0"},
    "c++": {"language": "cpp", "version": "10.2.0"},
    "java": {"language": "java", "version": "15.0.2"},
    "rust": {"language": "rust", "version": "1.68.2"},
    "rs": {"language": "rust", "version": "1.68.2"},
    "go": {"language": "go", "version": "1.16.2"},
    "golang": {"language": "go", "version": "1.16.2"},
    "php": {"language": "php", "version": "8.2.3"},
    "ruby": {"language": "ruby", "version": "3.0.1"},
    "rb": {"language": "ruby", "version": "3.0.1"},
}

class ExecuteRequest(BaseModel):
    code: str = ""
    language: str = "python"
    stdin: Optional[str] = ""
    args: Optional[List[str]] = []

@router.post("/execute")
async def execute_code(req: ExecuteRequest, request: Request):
    # Rate limiting
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(client_ip):
        raise HTTPException(429, "Rate limit exceeded. Max 20 runs/minute.")

    actual_code = req.code or ""
    if not actual_code:
        raise HTTPException(400, "Source code is required.")

    # Resolve runtime
    runtime = PISTON_RUNTIMES.get(req.language.lower().strip())
    if not runtime:
        raise HTTPException(400, f"Language '{req.language}' not supported by current execution engine.")

    # Build Piston Payload
    payload = {
        "language": runtime["language"],
        "version": runtime["version"],
        "files": [
            {
                "content": actual_code
            }
        ],
        "stdin": req.stdin or "",
        "args": req.args or [],
        "compile_timeout": 10000,
        "run_timeout": 3000,
        "compile_memory_limit": -1,
        "run_memory_limit": -1,
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(f"{PISTON_URL}/execute", json=payload)
            
            if resp.status_code != 200:
                return {
                    "stdout": "",
                    "stderr": f"Execution engine error: HTTP {resp.status_code}",
                    "exit_code": 1
                }

            data = resp.json()
            run = data.get("run", {})
            compile_res = data.get("compile", {})

            # Standardize output for LACUNEX frontend
            return {
                "stdout": run.get("stdout", ""),
                "stderr": run.get("stderr", ""),
                "compile_output": compile_res.get("output", ""),
                "exit_code": run.get("code", 0),
                "execution_time": 0, # Piston public doesn't always provide time
                "language": req.language,
                "status_description": "Completed", # Piston doesn't use Judge0 status IDs
                "status": {"id": 3 if run.get("code") == 0 else 4, "description": "Success" if run.get("code") == 0 else "Runtime Error"},
            }

    except Exception as e:
        return {
            "stdout": "",
            "stderr": f"Gateway Error: {str(e)}",
            "exit_code": 1
        }
