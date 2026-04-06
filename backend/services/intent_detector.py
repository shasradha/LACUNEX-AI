"""
LACUNEX AI — Intent Detector (v2 — Advanced)
Instantly classifies user messages to auto-enable Web Search or Reasoning.
Zero API calls. Pure Python. < 1ms latency.

v2 upgrades:
- Temporal awareness (tomorrow, yesterday, next week, tonight, etc.)
- Sports/events intelligence (match, score, result, fixture, etc.)
- Product/service queries (buy, order, price, specs, etc.)
- People/place awareness (president of, capital of, etc.)
- Question-word heuristics (who, what, when, where, which + real-world nouns)
"""

import re


# ── Web Search Trigger Patterns ───────────────────────────────────────────────

_WEB_SEARCH_KEYWORDS = frozenset([
    # Recency / live data
    "latest", "recent", "today", "right now", "currently", "live", "just happened",
    "breaking", "news", "update", "2024", "2025", "2026", "what's going on",
    "this week", "this month", "this year", "ongoing", "happening now",
    
    # Temporal — CRITICAL for smart auto-search
    "tomorrow", "yesterday", "tonight", "last night", "next week", "last week",
    "next month", "last month", "upcoming", "schedule", "scheduled",
    "next year", "last year", "next game", "last game",
    
    # Discovery (with typo support)
    "find me", "show me", "search for", "look up", "google", "fine me", "get me",
    "show pictures", "show images", "find images", "find pictures",
    "show me pictures of", "find me pictures of", "images of", "photos of",
    
    # Real-world data & queries
    "price of", "stock price", "weather", "forecast", "exchange rate",
    "how much is", "what is the price", "how much does", "cost of",
    "salary of", "net worth", "market cap", "inflation",
    
    # Sports & Events — CRITICAL for auto-search
    "match", "score", "result", "fixture", "standings", "ranking",
    "ipl", "world cup", "premier league", "champions league", "la liga",
    "nba", "nfl", "cricket", "football", "soccer", "tennis", "f1",
    "olympics", "tournament", "playoff", "semi final", "final match",
    "man of the match", "player of", "batting", "bowling", "goal",
    "winner", "loser", "draw", "tied", "points table", "league table",
    
    # Current events & knowledge
    "who won", "what happened", "what is happening", "who is", "what is",
    "when did", "where is", "how to", "who wrote", "what was", "where can i",
    "is it open", "opening hours", "can you check",
    "tell me about", "tell about", "info about", "information about",
    "details about", "facts about", "know about",
    
    # People, places, organizations
    "president of", "ceo of", "founder of", "capital of", "population of",
    "located in", "headquartered", "who owns", "who founded", "who created",
    "age of", "birthday of", "born in",
    
    # Products & services
    "buy", "order", "purchase", "specs", "specifications", "release date",
    "launch date", "availability", "where to buy", "discount", "deal",
    "coupon", "offer", "sale",
    
    # Comparisons & Facts
    "best", "top 10", "top 5", "most popular", "highest", "lowest",
    "vs", "versus", "difference between", "compare", "review", "rating",
    "benchmark", "alternative to", "similar to",
    
    # Travel & Local
    "flights", "hotels", "restaurants", "near me", "directions to",
    "distance between", "time zone", "currency of",
    
    # Site / url review
    "how is this website", "review this site", "check this site",
    "is this site safe", "is this website",
])

# Question-word patterns that strongly suggest web search need
_QUESTION_WEB_PATTERNS = [
    # "Who is [person]", "What is [thing]", "Where is [place]"
    re.compile(r"\b(?:who|what|where|when|which|whose)\s+(?:is|are|was|were|will|did|does|do|has|have|had)\s+(?:the\s+)?(?!your|my|this|that|the best way|the difference|a good|an? )", re.I),
    # "How many", "How old", "How far", "How long does it take"  
    re.compile(r"\bhow\s+(?:many|much|old|far|long|tall|big|fast|deep)\b", re.I),
    # "Is [X] open/available/real/true/correct"
    re.compile(r"\bis\s+(?:there|it|he|she|this)\s+(?:true|real|correct|still|open|available|alive|dead)\b", re.I),
    # "Can I / Where can I / How can I [buy/get/find/visit]"
    re.compile(r"\b(?:where|how)\s+can\s+i\s+(?:buy|get|find|visit|watch|stream|download|book|order)\b", re.I),
]

_IMAGE_REQUEST_PATTERNS = [
    re.compile(r"\b(?:show|find|fine|search|get|see|fetch|display|look|look up)(?:\s+me)?(?:\s+some)?\s+.*(?:pictures?|images?|photos?|wallpapers?|wallapapers?|wallpappers?|wallppapers?|pix|pics|backgrounds?|wallp|walls?)\b", re.I),
    re.compile(r"\b(?:pictures?|images?|photos?|wallpapers?|wallapapers?|pix|pics|backgrounds?|wallp|walls?)\s+of\b", re.I),
]

_URL_PATTERN = re.compile(
    r"https?://[^\s]+|www\.[^\s]+\.[a-z]{2,}", re.I
)


# ── MAX OUTPUT Mode Trigger Patterns ──────────────────────────────────────────

_MAX_OUTPUT_KEYWORDS = frozenset([
    # Direct triggers
    "make notes", "make note", "write notes", "write detailed",
    "full explanation", "complete guide", "chapter-wise", "chapterwise",
    "chapter wise", "big answer", "long answer", "detailed notes",
    "explain everything", "in-depth", "in depth", "comprehensive",
    "thoroughly", "elaborate on", "textbook", "study material",
    "revision notes", "complete notes", "full notes", "detailed guide",
    "deep dive", "write a book", "book on", "full report",
    "detailed report", "research paper", "long form", "long-form",
    "exhaustive", "cover everything", "cover all", "all topics",
    "every topic", "complete explanation", "full coverage",
    "detailed analysis", "thorough analysis", "write everything",
    "explain in detail", "explain in depth", "complete overview",
    # Academic / Study
    "class notes", "exam notes", "study guide", "lecture notes",
    "complete syllabus", "all chapters", "every chapter",
    "practice questions", "question bank", "summary notes",
])

_MAX_OUTPUT_PATTERNS = [
    # "make [detailed/complete/full] notes on X"
    re.compile(r"\b(?:make|write|create|prepare|generate)\s+(?:me\s+)?(?:detailed|complete|full|comprehensive|thorough|in-depth|long|big)\s+(?:notes?|guide|report|explanation|document|material)\b", re.I),
    # "explain X in detail / in depth / thoroughly / completely"
    re.compile(r"\b(?:explain|describe|cover|teach|write about)\s+.{3,}\s+(?:in detail|in depth|thoroughly|completely|comprehensively|exhaustively|from scratch)\b", re.I),
    # "give me a complete/full/detailed X"
    re.compile(r"\b(?:give|provide|create|generate|write)\s+(?:me\s+)?(?:a\s+)?(?:complete|full|detailed|comprehensive|thorough|exhaustive)\s+(?:guide|explanation|overview|report|analysis|notes?|document|summary|breakdown)\b", re.I),
    # "chapter by chapter / topic by topic"
    re.compile(r"\b(?:chapter\s+by\s+chapter|topic\s+by\s+topic|section\s+by\s+section|point\s+by\s+point)\b", re.I),
    # "X pages / pages of / multiple pages"
    re.compile(r"\b(?:\d+\s+pages?|multi(?:ple)?\s+pages?|many\s+pages?|lots?\s+of\s+pages?)\b", re.I),
]


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

    # 2. Keyword match (fast frozenset scan)
    if not web_search:
        for kw in _WEB_SEARCH_KEYWORDS:
            if kw in msg_lower:
                web_search = True
                break

    # 3. Question-word patterns (semantic heuristics)
    if not web_search:
        for pat in _QUESTION_WEB_PATTERNS:
            if pat.search(message):
                web_search = True
                break

    # 4. Image request patterns (Aggressive + Typo resistance)
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

    # ── MAX OUTPUT Mode Detection ─────────────────────────────────────────────
    max_output = False

    # 1. Keyword match
    for kw in _MAX_OUTPUT_KEYWORDS:
        if kw in msg_lower:
            max_output = True
            break

    # 2. Pattern match
    if not max_output:
        for pat in _MAX_OUTPUT_PATTERNS:
            if pat.search(message):
                max_output = True
                break

    # MAX OUTPUT always implies reasoning mode for deeper analysis
    if max_output:
        reasoning = True

    return {
        "web_search": web_search,
        "reasoning": reasoning,
        "image_search": image_search,
        "max_output": max_output,
        "url_fetch": url_fetch,
        "detected_url": url_match.group(0) if url_match else None,
    }
