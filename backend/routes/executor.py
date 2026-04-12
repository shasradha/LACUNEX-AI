import httpx
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()

PISTON_URL = "https://emkc.org/api/v2/piston"

LANGUAGE_VERSIONS = {
    "python": "3.10.0",
    "javascript": "18.15.0",
    "typescript": "5.0.3",
    "c": "10.2.0",
    "cpp": "10.2.0",
    "java": "15.0.2",
    "rust": "1.68.2",
    "go": "1.16.2",
    "csharp": "6.12.0",
    "kotlin": "1.8.20",
    "php": "8.2.3",
    "ruby": "3.0.1",
    "bash": "5.2.0",
    "r": "4.1.1",
    "swift": "5.3.3",
}

class ExecuteRequest(BaseModel):
    code: str
    language: str
    stdin: Optional[str] = ""
    args: Optional[List[str]] = []

@router.post("/execute")
async def execute_code(req: ExecuteRequest):
    lang = req.language.lower().strip()
    version = LANGUAGE_VERSIONS.get(lang)
    
    if not version:
        return {
            "stdout": "",
            "stderr": f"Language '{lang}' not supported. Supported: {list(LANGUAGE_VERSIONS.keys())}",
            "exit_code": 1,
            "execution_time": 0
        }
    
    # Map language aliases
    piston_lang = {
        "cpp": "c++",
        "csharp": "csharp",
        "js": "javascript",
        "ts": "typescript",
    }.get(lang, lang)
    
    payload = {
        "language": piston_lang,
        "version": version,
        "files": [{"name": f"main.{lang}", "content": req.code}],
        "stdin": req.stdin or "",
        "args": req.args or [],
        "compile_timeout": 15000,
        "run_timeout": 10000,
    }
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{PISTON_URL}/execute", json=payload)
            resp.raise_for_status()
            data = resp.json()
            
            run = data.get("run", {})
            compile_info = data.get("compile", {})
            
            return {
                "stdout": run.get("stdout", ""),
                "stderr": run.get("stderr", "") or compile_info.get("stderr", ""),
                "compile_output": compile_info.get("output", ""),
                "exit_code": run.get("code", 0),
                "execution_time": run.get("wall_time", 0),
                "language": lang,
                "signal": run.get("signal")
            }
    except httpx.TimeoutException:
        return {"stdout": "", "stderr": "Execution timed out (10s limit)", "exit_code": 124}
    except Exception as e:
        return {"stdout": "", "stderr": f"Execution error: {str(e)}", "exit_code": 1}
