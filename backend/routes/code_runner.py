"""
LACUNEX AI — Code Runner (Piston API)
Execute code in 60+ languages via the free Piston API.
No authentication required. Supports Python, Java, C++, Go, Rust, PHP, Ruby, JS, and more.
"""

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from models.db_models import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/code", tags=["Code"])

PISTON_URL = "https://emkc.org/api/v2/piston"

# Language → Piston runtime mapping
LANGUAGE_MAP = {
    "python": ("python", "3.10"),
    "python3": ("python", "3.10"),
    "py": ("python", "3.10"),
    "javascript": ("javascript", "18.15.0"),
    "js": ("javascript", "18.15.0"),
    "typescript": ("typescript", "5.0.3"),
    "ts": ("typescript", "5.0.3"),
    "java": ("java", "15.0.2"),
    "c": ("c", "10.2.0"),
    "cpp": ("c++", "10.2.0"),
    "c++": ("c++", "10.2.0"),
    "csharp": ("csharp", "6.12.0"),
    "cs": ("csharp", "6.12.0"),
    "go": ("go", "1.16.2"),
    "golang": ("go", "1.16.2"),
    "rust": ("rust", "1.68.2"),
    "rs": ("rust", "1.68.2"),
    "php": ("php", "8.2.3"),
    "ruby": ("ruby", "3.0.1"),
    "rb": ("ruby", "3.0.1"),
    "swift": ("swift", "5.3.3"),
    "kotlin": ("kotlin", "1.8.20"),
    "kt": ("kotlin", "1.8.20"),
    "r": ("r", "4.1.1"),
    "bash": ("bash", "5.2.0"),
    "sh": ("bash", "5.2.0"),
    "perl": ("perl", "5.36.0"),
    "lua": ("lua", "5.4.4"),
    "dart": ("dart", "2.19.6"),
    "scala": ("scala", "3.2.2"),
    "elixir": ("elixir", "1.14.3"),
    "haskell": ("haskell", "9.0.1"),
    "sql": ("sqlite3", "3.36.0"),
}


class CodeRunRequest(BaseModel):
    code: str
    language: str
    stdin: str = ""


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

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{PISTON_URL}/execute",
                json={
                    "language": runtime,
                    "version": version,
                    "files": [{"name": f"main", "content": request.code}],
                    "stdin": request.stdin,
                    "run_timeout": 10000,  # 10 second execution limit
                    "compile_timeout": 10000,
                },
            )

            if response.status_code != 200:
                return {
                    "success": False,
                    "output": f"Execution service error (HTTP {response.status_code}). Please try again.",
                    "language": request.language,
                }

            data = response.json()
            run_result = data.get("run", {})
            compile_result = data.get("compile", {})

            # Combine compile + run output
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
                "output": output.strip()[:5000],  # Cap at 5KB
                "language": data.get("language", request.language),
                "version": data.get("version", version),
            }

    except httpx.TimeoutException:
        return {
            "success": False,
            "output": "⏱ Execution timed out (10s limit). Try reducing your code's complexity.",
            "language": request.language,
        }
    except Exception as exc:
        return {
            "success": False,
            "output": f"Execution failed: {str(exc)}",
            "language": request.language,
        }
