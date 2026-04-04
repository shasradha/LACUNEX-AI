"""
LACUNEX AI — Intent Detector
Instantly classifies user messages to auto-enable Web Search or Reasoning.
Zero API calls. Pure Python. < 1ms latency.
"""

import re


# ── Web Search Trigger Patterns ───────────────────────────────────────────────

_WEB_SEARCH_KEYWORDS = frozenset([
    # Recency / live data
    "latest", "recent", "today", "right now", "currently", "live",
    "breaking", "news", "update", "2024", "2025", "2026",
    # Discovery
    "find me", "show me", "search for", "look up", "google",
    "show pictures", "show images", "find images", "find pictures",
    "show me pictures of", "find me pictures of", "images of", "photos of",
    # Real-world data
    "price of", "stock price", "weather", "forecast", "exchange rate",
    "how much is", "what is the price", "how much does",
    # Current events
    "who won", "what happened", "what is happening", "who is",
    "is it open", "opening hours",
    # Site / url review
    "how is this website", "review this site", "check this site",
    "is this site safe", "is this website",
])

_IMAGE_REQUEST_PATTERNS = [
    re.compile(r"\bshow\s+me\s+(?:some\s+)?(?:pictures?|images?|photos?)\s+of\b", re.I),
    re.compile(r"\bfind\s+(?:me\s+)?(?:some\s+)?(?:pictures?|images?|photos?)\s+of\b", re.I),
    re.compile(r"\b(?:pictures?|images?|photos?)\s+of\b", re.I),
    re.compile(r"\bwallpaper(?:s)?\s+of\b", re.I),
]

_URL_PATTERN = re.compile(
    r"https?://[^\s]+|www\.[^\s]+\.[a-z]{2,}", re.I
)


# ── Reasoning Trigger Patterns ────────────────────────────────────────────────

_REASONING_KEYWORDS = frozenset([
    # Math / logic
    "solve", "calculate", "compute", "proof", "prove", "derive",
    "integrate", "differentiate", "equation", "algorithm",
    "theorem", "formula", "mathematically",
    # Deep analysis
    "explain in depth", "explain in detail", "break down",
    "analyze", "analyse", "compare and contrast", "critique",
    "why does", "how does", "what causes", "impact of",
    "difference between", "pros and cons",
    # Long-form
    "write an essay", "write a report", "write a research",
    "summarize", "summarise", "step by step", "step-by-step",
    "in detail", "comprehensive",
])

_MATH_EXPRESSION = re.compile(
    r"[\d\+\-\*\/\^=<>≤≥∑∫√π]+\s*[\+\-\*\/\^=<>≤≥]+\s*[\d\+\-\*\/\^=<>≤≥∑∫√π]+",
)

_REASONING_COMPLEX_THRESHOLD = 130  # characters


def detect_intent(message: str) -> dict:
    """
    Classify the user's message intent.
    Returns:
        {
            "web_search": bool,
            "reasoning": bool,
            "image_search": bool,   # subset of web_search
        }
    """
    msg_lower = message.lower().strip()
    msg_len = len(message)

    # ── Web Search Detection ──────────────────────────────────────────────────
    web_search = False
    image_search = False

    # 1. URL in message
    if _URL_PATTERN.search(message):
        web_search = True

    # 2. Keyword match
    if not web_search:
        for kw in _WEB_SEARCH_KEYWORDS:
            if kw in msg_lower:
                web_search = True
                break

    # 3. Image request patterns
    for pat in _IMAGE_REQUEST_PATTERNS:
        if pat.search(message):
            web_search = True
            image_search = True
            break

    # ── Reasoning Detection ───────────────────────────────────────────────────
    reasoning = False

    # 1. Math expression in message
    if _MATH_EXPRESSION.search(message):
        reasoning = True

    # 2. Keyword match
    if not reasoning:
        for kw in _REASONING_KEYWORDS:
            if kw in msg_lower:
                reasoning = True
                break

    # 3. Long complex message
    if not reasoning and msg_len >= _REASONING_COMPLEX_THRESHOLD:
        word_count = len(message.split())
        if word_count >= 25:
            reasoning = True

    return {
        "web_search": web_search,
        "reasoning": reasoning,
        "image_search": image_search,
    }
