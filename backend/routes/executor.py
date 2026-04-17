"""
Execution proxy for LACUNEX Code Studio.
Supports Judge0 CE (Primary), Judge0 API (Fallback), and self-hosted Piston (Future).
"""

import os
import time
import base64
import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from collections import defaultdict

router = APIRouter()

# ── Rate limiting ────────────────────────────────
RATE_LIMIT = 20
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

# ── Configuration ────────────────────────────────
PISTON_URL = os.getenv("PISTON_URL", "")  # Only use Piston if explicitly configured
JUDGE0_HOSTS = [
    "https://ce.judge0.com",     # Primary (free, no key)
    "https://api.judge0.com"      # Fallback
]

# Judge0 Language IDs (v1.13.1 std)
JUDGE0_LANG_MAP = {
    "python": 100,
    "javascript": 102,
    "typescript": 101,
    "c": 103,
    "cpp": 105,
    "java": 91,
    "rust": 108,
    "go": 107,
    "php": 98,
    "ruby": 72,
}

# Piston Language Info
PISTON_LANG_MAP = {
    "python": {"language": "python", "version": "3.10.0"},
    "javascript": {"language": "javascript", "version": "18.15.0"},
    "typescript": {"language": "typescript", "version": "5.0.3"},
    "c": {"language": "c", "version": "10.2.0"},
    "cpp": {"language": "cpp", "version": "10.2.0"},
    "java": {"language": "java", "version": "15.0.2"},
    "rust": {"language": "rust", "version": "1.68.2"},
    "go": {"language": "go", "version": "1.16.2"},
    "php": {"language": "php", "version": "8.2.3"},
    "ruby": {"language": "ruby", "version": "3.0.1"},
}

class ExecuteRequest(BaseModel):
    code: str = ""
    language: str = "python"
    stdin: Optional[str] = ""
    args: Optional[List[str]] = []

def decode_b64(val: str) -> str:
    if not val:
        return ""
    try:
        return base64.b64decode(val).decode("utf-8")
    except Exception:
        return val

@router.post("/execute")
async def execute_code(req: ExecuteRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(client_ip):
        raise HTTPException(429, "Rate limit exceeded.")

    actual_code = req.code or ""
    if not actual_code:
        raise HTTPException(400, "Source code is required.")
    
    lang_key = req.language.lower().strip()

    # FUTURE: Self-hosted Piston path
    if PISTON_URL:
        runtime = PISTON_LANG_MAP.get(lang_key)
        if not runtime:
            raise HTTPException(400, f"Language '{req.language}' not supported by Piston.")
        
        payload = {
            "language": runtime["language"],
            "version": runtime["version"],
            "files": [{"content": actual_code}],
            "stdin": req.stdin or "",
            "args": req.args or []
        }
        
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(f"{PISTON_URL}/execute", json=payload)
                if resp.status_code != 200:
                    return {"stdout": "", "stderr": f"Piston Error: HTTP {resp.status_code}", "exit_code": 1}
                
                data = resp.json()
                run = data.get("run", {})
                compile_res = data.get("compile", {})
                return {
                    "stdout": run.get("stdout", ""),
                    "stderr": run.get("stderr", ""),
                    "compile_output": compile_res.get("output", ""),
                    "exit_code": run.get("code", 0),
                    "execution_time": 0,
                    "status": {"id": 3 if run.get("code") == 0 else 4, "description": "Success" if run.get("code") == 0 else "Error"}
                }
        except Exception as e:
            return {"stdout": "", "stderr": f"Piston Gateway Error: {str(e)}", "exit_code": 1}

    # PRIMARY/FALLBACK: Judge0
    lang_id = JUDGE0_LANG_MAP.get(lang_key)
    if not lang_id:
        raise HTTPException(400, f"Language '{req.language}' not supported by Judge0 engines.")

    payload = {
        "source_code": base64.b64encode(actual_code.encode('utf-8')).decode('utf-8'),
        "language_id": lang_id,
        "stdin": base64.b64encode((req.stdin or "").encode('utf-8')).decode('utf-8') if req.stdin else "",
        "command_line_arguments": " ".join(req.args) if req.args else "",
        "cpu_time_limit": "10",
        "memory_limit": "512000",
        "wall_time_limit": "15"
    }

    last_error = None
    headers = {"Content-Type": "application/json"}
    
    # Notice: NO RapidAPI key logic here. 
    # Just raw requests to community/api endpoints.

    for host in JUDGE0_HOSTS:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{host}/submissions?base64_encoded=true&wait=true",
                    json=payload,
                    headers=headers,
                )

                if resp.status_code == 422:
                    # Minimal payload fallback for restrictive endpoints
                    minimal_payload = {
                        "source_code": payload["source_code"],
                        "language_id": payload["language_id"],
                        "stdin": payload.get("stdin", "")
                    }
                    resp = await client.post(
                        f"{host}/submissions?base64_encoded=true&wait=true",
                        json=minimal_payload,
                        headers=headers,
                    )

                if resp.status_code in (200, 201):
                    try:
                        data = resp.json()
                    except Exception:
                        last_error = f"Malformed JSON response from {host}"
                        continue

                    status = data.get("status", {})
                    stdout = decode_b64(data.get("stdout"))
                    stderr = decode_b64(data.get("stderr"))
                    compile_output = decode_b64(data.get("compile_output"))

                    exit_code = 0 if status.get("id") == 3 else 1
                    
                    return {
                        "stdout": stdout,
                        "stderr": stderr,
                        "compile_output": compile_output,
                        "exit_code": exit_code,
                        "execution_time": data.get("time") or 0,
                        "language": req.language,
                        "status_description": status.get("description"),
                        "time": data.get("time"),
                        "memory": data.get("memory"),
                        "status": status,
                    }
                else:
                    last_error = f"HTTP {resp.status_code} from {host}"
                    continue

        except Exception as e:
            last_error = str(e)
            continue

    return {
        "stdout": "",
        "stderr": f"All execution engines unavailable: {last_error}",
        "exit_code": 1,
        "execution_time": 0,
    }
