"""
Curated model catalog for the frontend selector.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["Models"])

MODEL_CATALOG = {
    "cerebras": {
        "name": "Cerebras",
        "icon": "C",
        "logo": "https://github.com/cerebras.png",
        "color": "#312e81",
        "description": "Wafer-scale AI — fastest inference engine",
        "models": [
            {"id": "qwen-3-235b-a22b-instruct-2507", "name": "Qwen 3 (235B MoE)", "tags": ["ultra-fast", "coding", "default"], "logo": "https://github.com/QwenLM.png"},
            {"id": "llama3.1-70b", "name": "Llama 3.1 70B", "tags": ["ultra-fast", "70b"], "logo": "https://github.com/meta-llama.png"},
            {"id": "llama3.1-8b", "name": "Llama 3.1 8B", "tags": ["ultra-fast", "8b"], "logo": "https://github.com/meta-llama.png"},
        ],
    },
    "groq": {
        "name": "Groq",
        "icon": "G",
        "logo": "https://github.com/groq.png",
        "color": "#f97316",
        "description": "Extreme speed for standard chat",
        "models": [
            {"id": "llama-3.3-70b-versatile", "name": "Llama 3.3 70B", "tags": ["fast", "chat"], "logo": "https://github.com/meta-llama.png"},
            {"id": "llama-3.1-8b-instant", "name": "Llama 3.1 8B Instant", "tags": ["fast", "chat"], "logo": "https://github.com/meta-llama.png"},
        ],
    },
    "qwen": {
        "name": "Qwen",
        "icon": "Q",
        "logo": "https://github.com/QwenLM.png",
        "color": "#8b5cf6",
        "description": "Specialized coding and agentic models",
        "models": [
            {"id": "qwen/qwen3.6-plus-preview:free", "name": "Qwen 3.6 Plus Preview", "tags": ["free", "coding", "agentic"], "logo": "https://github.com/QwenLM.png"},
            {"id": "qwen/qwen3-coder-480b-a35b-instruct:free", "name": "Qwen3 Coder (480B)", "tags": ["free", "coding", "moe"], "logo": "https://github.com/QwenLM.png"},
            {"id": "qwen/qwen3-next-80b-a3b-instruct:free", "name": "Qwen3 Next (80B)", "tags": ["free", "agentic", "fast"], "logo": "https://github.com/QwenLM.png"},
        ],
    },
    "nvidia": {
        "name": "NVIDIA",
        "icon": "NV",
        "logo": "https://github.com/nvidia.png",
        "color": "#10b981",
        "description": "Frontier open models and multimodal reasoning",
        "models": [
            {"id": "nvidia/nemotron-3-super-120b-a12b:free", "name": "Nemotron 3 Super", "tags": ["free", "moe", "accurate"], "logo": "https://github.com/nvidia.png"},
            {"id": "nvidia/nemotron-3-nano-30b-a3b:free", "name": "Nemotron 3 Nano", "tags": ["free", "fast"], "logo": "https://github.com/nvidia.png"},
            {"id": "nvidia/nemotron-nano-2-vl:free", "name": "Nemotron Nano 2 VL", "tags": ["free", "vision", "video"], "logo": "https://github.com/nvidia.png"},
            {"id": "nvidia/nvidia-nemotron-nano-9b-v2:free", "name": "Nemotron Nano 9B V2", "tags": ["free", "reasoning"], "logo": "https://github.com/nvidia.png"},
        ],
    },
    "stepfun": {
        "name": "StepFun",
        "icon": "SF",
        "logo": "https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://stepfun.com&size=128",
        "color": "#3b82f6",
        "description": "High-context reasoning",
        "models": [
            {"id": "stepfun/step-3.5-flash:free", "name": "Step 3.5 Flash", "tags": ["free", "thinking", "256k"], "logo": "https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://stepfun.com&size=128"},
        ],
    },
    "arcee-ai": {
        "name": "Arcee AI",
        "icon": "AA",
        "logo": "https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://www.arcee.ai&size=128",
        "color": "#f43f5e",
        "description": "Frontier-scale open-weight models",
        "models": [
            {"id": "arcee-ai/trinity-large-preview:free", "name": "Trinity Large Preview", "tags": ["free", "preview", "creative"], "logo": "https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://www.arcee.ai&size=128"},
            {"id": "arcee-ai/trinity-mini:free", "name": "Trinity Mini", "tags": ["free", "agentic"], "logo": "https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://www.arcee.ai&size=128"},
        ],
    },
    "z-ai": {
        "name": "Z.ai",
        "icon": "Z",
        "logo": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='18' fill='%23222222'/><path d='M24 28 h52 v14 l-36 16 h36 v14 H24 V58 l36 -16 H24 V28 z' fill='white'/></svg>",
        "color": "#eab308",
        "description": "Agent-centric application models",
        "models": [
            {"id": "z-ai/glm-4.5-air:free", "name": "GLM 4.5 Air", "tags": ["free", "thinking", "agentic"], "logo": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='18' fill='%23222222'/><path d='M24 28 h52 v14 l-36 16 h36 v14 H24 V58 l36 -16 H24 V28 z' fill='white'/></svg>"},
        ],
    },
    "minimax": {
        "name": "MiniMax",
        "icon": "MX",
        "logo": "https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://minimaxi.com&size=128",
        "color": "#06b6d4",
        "description": "SOTA models for productivity",
        "models": [
            {"id": "minimax/minimax-m2.5:free", "name": "MiniMax M2.5", "tags": ["free", "agentic", "productivity"], "logo": "https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://minimaxi.com&size=128"},
        ],
    },
    "meta": {
        "name": "Meta (Llama)",
        "icon": "M",
        "logo": "https://github.com/meta-llama.png",
        "color": "#3b82f6",
        "description": "Powerful instruction-tuned LLMs",
        "models": [
            {"id": "meta-llama/llama-3.3-70b-instruct:free", "name": "Llama 3.3 70B", "tags": ["free", "multilingual", "fast"], "logo": "https://github.com/meta-llama.png"},
        ],
    },
    "mistral": {
        "name": "Mistral",
        "icon": "MS",
        "logo": "https://github.com/mistralai.png",
        "color": "#fdba74",
        "description": "Open frontier models by Mistral AI",
        "models": [
            {"id": "mistralai/mistral-7b-instruct:free", "name": "Mistral 7B", "tags": ["free", "fast"], "logo": "https://github.com/mistralai.png"},
        ],
    },
    "liquid": {
        "name": "Liquid",
        "icon": "L",
        "logo": "https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://liquid.ai&size=128",
        "color": "#ec4899",
        "description": "Reasoning-focused lightweight models",
        "models": [
            {"id": "liquid/lfm2.5-1.2b-thinking:free", "name": "LFM2.5 Thinking", "tags": ["free", "thinking", "nano"], "logo": "https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://liquid.ai&size=128"},
        ],
    },
    "openai": {
        "name": "OpenAI (OSS)",
        "icon": "O",
        "logo": "https://github.com/openai.png",
        "color": "#10b981",
        "description": "Open-weight models by OpenAI",
        "models": [
            {"id": "openai/gpt-oss-20b:free", "name": "GPT-OSS (20B)", "tags": ["free", "moe", "fast"], "logo": "https://github.com/openai.png"},
            {"id": "openai/gpt-oss-120b:free", "name": "GPT-OSS (120B)", "tags": ["free", "moe", "reasoning"], "logo": "https://github.com/openai.png"},
        ],
    },
    "gemini": {
        "name": "Gemini",
        "icon": "GM",
        "logo": "https://github.com/google.png",
        "color": "#8b5cf6",
        "description": "Multimodal reasoning by Google",
        "models": [
            {"id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash", "tags": ["thinking", "chat", "vision"], "logo": "https://github.com/google.png"},
            {"id": "gemini-2.0-flash", "name": "Gemini 2.0 Flash", "tags": ["fast", "chat"], "logo": "https://github.com/google.png"},
        ],
    },
    "openrouter": {
        "name": "OpenRouter",
        "icon": "OR",
        "logo": "https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://openrouter.ai&size=128",
        "color": "#6366f1",
        "description": "Fallback and specialized free router",
        "models": [
            {"id": "openrouter/auto", "name": "Auto (Global)", "tags": ["auto"], "logo": "https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://openrouter.ai&size=128"},
            {"id": "deepseek/deepseek-r1:free", "name": "DeepSeek R1", "tags": ["thinking", "free"], "logo": "https://github.com/deepseek-ai.png"},
        ],
    },
    "ollama": {
        "name": "Ollama",
        "icon": "OL",
        "logo": "https://github.com/ollama.png",
        "color": "#78716c",
        "description": "True local execution on your machine",
        "models": [
            {"id": "llama3.2", "name": "Llama 3.2", "tags": ["local", "chat"], "logo": "https://github.com/ollama.png"},
        ],
    },
}


@router.get("/models")
async def get_models():
    return MODEL_CATALOG
