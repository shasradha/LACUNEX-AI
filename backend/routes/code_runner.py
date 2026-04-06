"""
LACUNEX AI — Code Runner (Multi-Mirror Piston API)
Execute code in 60+ languages via free Piston API mirrors.
Automatically falls back between multiple public endpoints.
"""

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from models.db_models import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/code", tags=["Code"])

# Multiple Piston API mirrors — try in order until one works
PISTON_MIRRORS = [
    "https://piston.sh/api/v2",
    "https://piston.rce.fi/api/v2",
]

# Language → Piston runtime mapping (version * = latest available)
LANGUAGE_MAP = {
    "python": ("python", "*"),
    "python3": ("python", "*"),
    "py": ("python", "*"),
    "javascript": ("javascript", "*"),
    "js": ("javascript", "*"),
    "typescript": ("typescript", "*"),
    "ts": ("typescript", "*"),
    "java": ("java", "*"),
    "c": ("c", "*"),
    "cpp": ("c++", "*"),
    "c++": ("c++", "*"),
    "csharp": ("csharp", "*"),
    "cs": ("csharp", "*"),
    "go": ("go", "*"),
    "golang": ("go", "*"),
    "rust": ("rust", "*"),
    "rs": ("rust", "*"),
    "php": ("php", "*"),
    "ruby": ("ruby", "*"),
    "rb": ("ruby", "*"),
    "swift": ("swift", "*"),
    "kotlin": ("kotlin", "*"),
    "kt": ("kotlin", "*"),
    "r": ("r", "*"),
    "bash": ("bash", "*"),
    "sh": ("bash", "*"),
    "perl": ("perl", "*"),
    "lua": ("lua", "*"),
    "dart": ("dart", "*"),
    "scala": ("scala", "*"),
    "elixir": ("elixir", "*"),
    "haskell": ("haskell", "*"),
    "sql": ("sqlite3", "*"),
}


class CodeRunRequest(BaseModel):
    code: str
    language: str
    stdin: str = ""


def _parse_piston_response(data: dict, language: str) -> dict:
    """Parse Piston API response into a clean output dict."""
    run_result = data.get("run", {})
    compile_result = data.get("compile", {})

    output_parts = []
    if compile_result.get("stderr"):
        output_parts.append(f"[Compile Error]\n{compile_result['stderr']}")
    if run_result.get("stderr"):
        output_parts.append(f"[Error]\n{run_result['stderr']}")
    if run_result.get("stdout"):
        output_parts.append(run_result["stdout"])

    output = "\n".join(output_parts) if output_parts else "(No output)"

    return {
        "success": not bool(run_result.get("stderr") or compile_result.get("stderr")),
        "output": output.strip()[:5000],
        "language": data.get("language", language),
        "version": data.get("version", ""),
    }


@router.post("/execute")
async def execute_code(
    request: CodeRunRequest,
    current_user: User = Depends(get_current_user),
):
    lang_key = request.language.lower().strip()
    mapping = LANGUAGE_MAP.get(lang_key)

    if not mapping:
        return {
            "success": False,
            "output": f"Language '{request.language}' is not supported.\n\nSupported: Python, JavaScript, Java, C, C++, Go, Rust, PHP, Ruby, Kotlin, Swift, TypeScript, Bash, Lua, Dart, Scala, R, Perl, Haskell, Elixir, SQL",
            "language": request.language,
        }

    runtime, version = mapping
    payload = {
        "language": runtime,
        "version": version,
        "files": [{"name": "main", "content": request.code}],
        "stdin": request.stdin,
        "run_timeout": 10000,
        "compile_timeout": 10000,
    }

    last_error = None

    async with httpx.AsyncClient(timeout=30.0) as client:
        for mirror_url in PISTON_MIRRORS:
            try:
                response = await client.post(
                    f"{mirror_url}/execute",
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )

                if response.status_code == 200:
                    data = response.json()
                    return _parse_piston_response(data, request.language)

                last_error = f"HTTP {response.status_code}"
                print(f"[CodeRunner] {mirror_url} returned {response.status_code}, trying next...")
                continue

            except httpx.TimeoutException:
                last_error = "timeout"
                print(f"[CodeRunner] {mirror_url} timed out, trying next...")
                continue
            except Exception as exc:
                last_error = str(exc)
                print(f"[CodeRunner] {mirror_url} failed: {exc}, trying next...")
                continue

    # All mirrors failed
    return {
        "success": False,
        "output": f"All execution servers are currently busy ({last_error}). Please try again in a moment.",
        "language": request.language,
    }
