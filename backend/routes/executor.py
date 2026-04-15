"""
Judge0 proxy for Code Studio — keeps API keys server-side.
Adds rate limiting, validation, and abuse prevention.
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
# Max 10 executions per minute per IP
RATE_LIMIT = 10
RATE_WINDOW = 60  # seconds
_rate_store: dict = defaultdict(list)

def check_rate_limit(ip: str) -> bool:
    now = time.time()
    window_start = now - RATE_WINDOW
    # Clean old entries
    _rate_store[ip] = [t for t in _rate_store[ip] if t > window_start]
    if len(_rate_store[ip]) >= RATE_LIMIT:
        return False
    _rate_store[ip].append(now)
    return True

# ── Judge0 config ────────────────────────────────
JUDGE0_HOSTS = [
    "https://ce.judge0.com",           # community edition (primary)
    "https://judge0-ce.p.rapidapi.com", # RapidAPI mirror
]
RAPID_API_KEY = os.getenv("JUDGE0_RAPID_API_KEY", "")

# Judge0 Language IDs — comprehensive mapping
JUDGE0_LANG_MAP = {
    "python": 100,      # Python 3.12.5
    "python3": 100,
    "py": 100,
    "javascript": 102,  # Node.js 22.08.0
    "js": 102,
    "typescript": 101,  # TypeScript 5.6.2
    "ts": 101,
    "c": 103,           # GCC 14.1.0
    "cpp": 105,         # G++ 14.1.0
    "c++": 105,
    "csharp": 51,       # Mono 6.6.0.161
    "cs": 51,
    "java": 91,         # Java 17.0.6
    "rust": 108,        # Rust 1.85.0
    "rs": 108,
    "go": 107,          # Go 1.23.5
    "golang": 107,
    "kotlin": 111,      # Kotlin 2.1.10
    "kt": 111,
    "php": 98,          # PHP 8.3.11
    "ruby": 72,         # Ruby 2.7.0
    "rb": 72,
    "bash": 46,         # Bash 5.0.0
    "sh": 46,
    "r": 99,            # R 4.4.1
    "swift": 83,        # Swift 5.2.3
    "sql": 82,          # SQLite 3.27.2
    "perl": 85,         # Perl 5.28.1
    "lua": 64,          # Lua 5.3.5
    "scala": 81,        # Scala 2.13.2
    "haskell": 61,      # Haskell 8.8.3
    "dart": 90,         # Dart 2.19.2
    "elixir": 57,       # Elixir 1.9.4
}

# All valid Judge0 language IDs for direct ID submission
# Covers both legacy (45-90) and v1.13.1 (91-112+) standards
VALID_LANGUAGE_IDS = set(range(45, 120))


class ExecuteRequest(BaseModel):
    code: str = ""
    language: str = "python"
    stdin: Optional[str] = ""
    args: Optional[List[str]] = []
    # Code Studio can also send language_id directly
    language_id: Optional[int] = None
    source_code: Optional[str] = None


def decode_b64(val: str) -> str:
    if not val:
        return ""
    try:
        return base64.b64decode(val).decode("utf-8")
    except Exception:
        return val


@router.post("/execute")
async def execute_code(req: ExecuteRequest, request: Request):
    # Rate limiting
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(client_ip):
        raise HTTPException(429, "Rate limit exceeded. Max 10 runs/minute.")

    # Support both old format (code + language) and new (source_code + language_id)
    actual_code = req.source_code or req.code or ""

    # Validate code size (prevent massive code bombs)
    if len(actual_code) > 65536:  # 64KB max
        raise HTTPException(400, "Code too large (max 64KB)")

    # Resolve language ID
    if req.language_id and req.language_id in VALID_LANGUAGE_IDS:
        lang_id = req.language_id
    else:
        lang_key = (req.language or "python").lower().strip()
        lang_id = JUDGE0_LANG_MAP.get(lang_key)

    if not lang_id:
        return {
            "stdout": "",
            "stderr": f"Language '{req.language}' not supported by execution engine.",
            "exit_code": 1,
            "execution_time": 0
        }

    # Judge0 Payload (Base64 Encoded for safety)
    # Note: Limits are tuned for public instance (ce.judge0.com) stability
    payload = {
        "source_code": base64.b64encode(actual_code.encode('utf-8')).decode('utf-8'),
        "language_id": lang_id,
        "stdin": base64.b64encode((req.stdin or "").encode('utf-8')).decode('utf-8') if req.stdin else "",
        "command_line_arguments": " ".join(req.args) if req.args else "",
        "cpu_time_limit": "10",
        "memory_limit": "512000",
        "wall_time_limit": "15",
        "max_file_size": "131072", # 128KB - higher values often rejected by public instance
        "stack_size_limit": "128000",
        "max_processes_and_or_threads": "100",
        "enable_per_process_and_thread_memory_limit": False,
        "enable_per_process_and_thread_time_limit": False,
    }

    # Try each Judge0 host with fallback
    last_error = None
    
    # FILTER HOSTS: Only use paywalled mirrors if a key is provided
    # This prevents confusing "401 Unauthorized" errors for users who want the free engine
    active_hosts = []
    for host in JUDGE0_HOSTS:
        if "rapidapi" in host:
            if RAPID_API_KEY:
                active_hosts.append(host)
        else:
            active_hosts.append(host)

    if not active_hosts:
        return {
            "stdout": "",
            "stderr": "No execution engines available. Please set JUDGE0_RAPID_API_KEY for a backup mirror.",
            "exit_code": 1
        }

    for host in active_hosts:
        try:
            headers = {"Content-Type": "application/json"}

            # Add RapidAPI headers if hitting that mirror
            if "rapidapi" in host and RAPID_API_KEY:
                headers["X-RapidAPI-Host"] = "judge0-ce.p.rapidapi.com"
                headers["X-RapidAPI-Key"] = RAPID_API_KEY

                async with httpx.AsyncClient(timeout=30) as client:
                    resp = await client.post(
                        f"{host}/submissions?base64_encoded=true&wait=true",
                        json=payload,
                        headers=headers,
                    )

                    # STRATEGY: If public instance rejects our optimized limits with 422,
                    # retry with a "Minimal Payload" (only code and language) for maximum compatibility.
                    if resp.status_code == 422:
                        minimal_payload = {
                            "source_code": payload["source_code"],
                            "language_id": payload["language_id"],
                            "stdin": payload.get("stdin", ""),
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

                        # Judge0 status IDs: 3 is Accepted, others are errors
                        exit_code = 0 if status.get("id") == 3 else 1

                        return {
                            "stdout": stdout,
                            "stderr": stderr,
                            "compile_output": compile_output,
                            "exit_code": exit_code,
                            "execution_time": data.get("time") or 0,
                            "language": req.language,
                            "status_description": status.get("description"),
                            # Extended fields for Code Studio
                            "time": data.get("time"),
                            "memory": data.get("memory"),
                            "status": status,
                            "token": data.get("token"),
                        }
                    else:
                        if resp.status_code == 429:
                            last_error = "The engine is currently busy (Rate Limit). Please wait a few seconds."
                        elif resp.status_code == 422:
                            # If even the minimal payload fails, get the error detail
                            try:
                                err_data = resp.json()
                                last_error = f"Configuration error: {err_data}"
                            except:
                                last_error = "Engine rejected the request (422). Please verify language/settings."
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
