"""
LACUNEX AI — Intent Detector
Instantly classifies user messages to auto-enable Web Search or Reasoning.
Zero API calls. Pure Python. < 1ms latency.
"""

import re


# ── Web Search Trigger Patterns ───────────────────────────────────────────────

_WEB_SEARCH_KEYWORDS = frozenset([
    # Recency / live data
    "latest", "recent", "today", "right now", "currently", "live", "just happened",
    "breaking", "news", "update", "2024", "2025", "2026", "what's going on",
    # Discovery (with typo support)
    "find me", "show me", "search for", "look up", "google", "fine me", "get me",
    "show pictures", "show images", "find images", "find pictures",
    "show me pictures of", "find me pictures of", "images of", "photos of",
    # Real-world data & queries
    "price of", "stock price", "weather", "forecast", "exchange rate",
    "how much is", "what is the price", "how much does", "cost of",
    # Current events & knowledge
    "who won", "what happened", "what is happening", "who is", "what is",
    "when did", "where is", "how to", "who wrote", "what was", "where can i", 
    "is it open", "opening hours", "can you finding", "can you check", 
    # Comparisons & Facts
    "best", "top 10", "most popular", "highest", "lowest", "vs", "versus",
    "difference between", "compare", "review",
    # Site / url review
    "how is this website", "review this site", "check this site",
    "is this site safe", "is this website",
])

_IMAGE_REQUEST_PATTERNS = [
    # Support for find/fine/search/get + wallpapers/wallapapers/wallpappers/pix/pics/images/phtotos
    re.compile(r"\b(?:show|find|fine|search|get|see|fetch|display|look|look up)(?:\s+me)?(?:\s+some)?\s+.*(?:pictures?|images?|photos?|wallpapers?|wallapapers?|wallpappers?|wallppapers?|pix|pics|backgrounds?|wallp|walls?)\b", re.I),
    re.compile(r"\b(?:pictures?|images?|photos?|wallpapers?|wallapapers?|pix|pics|backgrounds?|wallp|walls?)\s+of\b", re.I),
]

_URL_PATTERN = re.compile(
    r"https?://[^\s]+|www\.[^\s]+\.[a-z]{2,}", re.I
)


# ── Reasoning Trigger Patterns ────────────────────────────────────────────────

_REASONING_PATTERNS = [
    # Math & Algorithms
    re.compile(r"\b(?:solve|calculate|compute|prove|derive|integrate|differentiate|equation|algorithm|theorem|formula|math)\b", re.I),
    # Logic & Analysis
    re.compile(r"\b(?:explain|analyze|analyse|critique|evaluate|break down)\s+.*(?:depth|detail|step by step|comprehensively|exactly)\b", re.I),
    re.compile(r"\b(?:compare and contrast|difference between|pros and cons|advantages|disadvantages)\b", re.I),
    # Creative & Academic
    re.compile(r"\bwrite\s+.*(?:essay|report|research|thesis|dissertation|article|summary|review)\b", re.I),
    # Deep Causality
    re.compile(r"\b(?:why does|how does|what causes|impact of|reason for|consequences of)\b", re.I),
    # Coding & complex systems
    re.compile(r"\b(?:code|script|build|develop|debug|architecture|system design|design a)\b", re.I),
    re.compile(r"\b(?:how would you|what is the best way to|design pattern)\b", re.I),
]

_MATH_EXPRESSION = re.compile(
    r"[\d\+\-\*\/\^=<>≤≥∑∫√π]+\s*[\+\-\*\/\^=<>≤≥]+\s*[\d\+\-\*\/\^=<>≤≥∑∫√π]+",
)

_REASONING_COMPLEX_THRESHOLD = 100  # characters


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

    # 3. Image request patterns (Aggressive + Typo resistance)
    for pat in _IMAGE_REQUEST_PATTERNS:
        if pat.search(message):
            web_search = True
            image_search = True
            break
            
    # ── Elite URL Context Detection ───────────────────────────────────────
    url_fetch = False
    url_match = _URL_PATTERN.search(message)
    if url_match:
        url_fetch = True
        web_search = True  # URLs always trigger web context

    # ── Reasoning Detection ───────────────────────────────────────────────────
    reasoning = False

    # 1. Math expression in message
    if _MATH_EXPRESSION.search(message):
        reasoning = True

    # 2. Pattern match
    if not reasoning:
        for pat in _REASONING_PATTERNS:
            if pat.search(message):
                reasoning = True
                break

    # 3. Long complex message
    if not reasoning and msg_len >= _REASONING_COMPLEX_THRESHOLD:
        word_count = len(message.split())
        if word_count >= 18:
            reasoning = True

    return {
        "web_search": web_search,
        "reasoning": reasoning,
        "image_search": image_search,
        "url_fetch": url_fetch,
        "detected_url": url_match.group(0) if url_match else None,
    }
