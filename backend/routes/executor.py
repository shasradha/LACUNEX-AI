import httpx
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()

# Judge0 Public Instance (as fallback/primary since Piston is dead)
JUDGE0_URL = "https://ce.judge0.com"

# Judge0 Language IDs
JUDGE0_LANG_MAP = {
    "python": 100,      # Python 3.12.5
    "python3": 100,
    "javascript": 102,  # Node.js 22.08.0
    "js": 102,
    "typescript": 101, # TypeScript 5.6.2
    "ts": 101,
    "c": 103,           # GCC 14.1.0
    "cpp": 105,         # G++ 14.1.0
    "c++": 105,
    "csharp": 51,       # Mono 6.6.0.161
    "java": 91,         # Java 17.0.6
    "rust": 108,        # Rust 1.85.0
    "go": 107,          # Go 1.23.5
    "kotlin": 111,      # Kotlin 2.1.10
    "php": 98,          # PHP 8.3.11
    "ruby": 72,         # Ruby 2.7.0
    "bash": 46,         # Bash 5.0.0
    "r": 99,            # R 4.4.1
    "swift": 83,        # Swift 5.2.3
    "sql": 82,          # SQLite 3.27.2
}

class ExecuteRequest(BaseModel):
    code: str
    language: str
    stdin: Optional[str] = ""
    args: Optional[List[str]] = []

import base64

def decode_b64(val: str) -> str:
    if not val:
        return ""
    try:
        return base64.b64decode(val).decode("utf-8")
    except Exception:
        return val

@router.post("/execute")
async def execute_code(req: ExecuteRequest):
    lang_key = req.language.lower().strip()
    lang_id = JUDGE0_LANG_MAP.get(lang_key)
    
    if not lang_id:
        return {
            "stdout": "",
            "stderr": f"Language '{lang_key}' not supported by execution engine.",
            "exit_code": 1,
            "execution_time": 0
        }
    
    # Judge0 Payload (Base64 Encoded)
    payload = {
        "source_code": base64.b64encode(req.code.encode('utf-8')).decode('utf-8'),
        "language_id": lang_id,
        "stdin": base64.b64encode((req.stdin or "").encode('utf-8')).decode('utf-8') if req.stdin else "",
        "command_line_arguments": " ".join(req.args) if req.args else "",
    }
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            # wait=true ensures synchronous execution, base64_encoded=true handles UTF8
            resp = await client.post(
                f"{JUDGE0_URL}/submissions?base64_encoded=true&wait=true", 
                json=payload
            )
            
            if resp.status_code in (200, 201):
                data = resp.json()
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
                    "language": lang_key,
                    "status_description": status.get("description")
                }
            else:
                return {
                    "stdout": "",
                    "stderr": f"Compiler API Error: HTTP {resp.status_code} - {resp.text[:200]}",
                    "exit_code": 1
                }
                
    except Exception as e:
        return {
            "stdout": "",
            "stderr": f"Execution request failed: {str(e)}",
            "exit_code": 1
        }


