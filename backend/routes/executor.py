import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/code", tags=["Code-Execution"])

class ExecuteRequest(BaseModel):
    code: str
    language: str
    stdin: str = ""

@router.post("/execute")
async def execute_code(req: ExecuteRequest):
    """
    Executes code securely via Piston API (emkc.org).
    Supports 60+ languages with standard input.
    """
    ALIASES = {
        "python": "python3",
        "py": "python3",
        "js": "javascript",
        "node": "javascript",
        "c++": "cpp",
        "c#": "csharp",
        "java": "java",
        "go": "go",
        "rust": "rust",
        "ruby": "ruby",
        "php": "php",
        "swift": "swift"
    }

    lang = req.language.lower()
    lang = ALIASES.get(lang, lang)

    try:
        async with httpx.AsyncClient() as client:
            # 1. Fetch available runtimes safely to get version
            runtimes_resp = await client.get("https://emkc.org/api/v2/piston/runtimes")
            if runtimes_resp.status_code != 200:
                raise HTTPException(status_code=500, detail="Code compiler service unavailable.")
            
            runtimes = runtimes_resp.json()
            
            # Find closest matching language
            matched_runtime = next((r for r in runtimes if r['language'] == lang or lang in r.get('aliases', [])), None)
            
            if not matched_runtime:
                raise HTTPException(status_code=400, detail=f"Language '{req.language}' not supported.")

            # 2. Execute code
            payload = {
                "language": matched_runtime['language'],
                "version": matched_runtime['version'],
                "files": [
                    {
                        "content": req.code
                    }
                ],
                "stdin": req.stdin or "",
                "compile_timeout": 10000,
                "run_timeout": 5000,
                "compile_memory_limit": -1,
                "run_memory_limit": -1
            }

            resp = await client.post("https://emkc.org/api/v2/piston/execute", json=payload)
            if resp.status_code != 200:
                raise HTTPException(status_code=500, detail="Compilation or execution failed.")
            
            data = resp.json()
            run_data = data.get('run', {})
            compile_data = data.get('compile', {})
            
            return {
                "stdout": run_data.get('stdout', ''),
                "stderr": run_data.get('stderr', ''),
                "output": run_data.get('output', ''),
                "code": run_data.get('code', run_data.get('signal')),
                "compile_output": compile_data.get('output', '') if compile_data else ''
            }
            
    except Exception as e:
        print(f"[Compiler Error]: {e}")
        raise HTTPException(status_code=500, detail=f"Compiler internal error: {str(e)}")
