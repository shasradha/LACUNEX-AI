"""
LACUNEX INTENT DETECTION ENGINE v3.0
The world's most accurate AI intent classifier.
Understands: typos, mixed languages, abbreviations,
emotional context, implied meaning, domain jargon,
regional language mixing (Hinglish, Banglish etc.)
"""

import re
from dataclasses import dataclass
from typing import Optional


@dataclass
class Intent:
    primary: str          # main intent category
    sub_intent: str       # specific sub-type
    confidence: float     # 0.0 to 1.0
    is_academic: bool     # syllabus/notes request
    is_code: bool         # programming request
    is_document: bool     # long-form doc generation
    is_creative: bool     # story/poem/creative writing
    is_casual: bool       # greeting/chat/emotion
    needs_search: bool    # requires real-time data
    needs_image: bool     # image generation request
    language_hint: str    # detected user language mix
    corrected_query: str  # best interpretation of query
    tone: str             # formal/casual/urgent/emotional
    domain: str           # tech/medical/legal/academic/general


# ── Typo & Intent Correction Dictionary ──────────────────
CORRECTION_MAP = {
    # Greetings
    'helo': 'hello', 'hii': 'hi', 'heloo': 'hello',
    'hye': 'hey', 'hwllo': 'hello', 'hlw': 'hello',
    # Common requests
    'explan': 'explain', 'explian': 'explain',
    'crate': 'create', 'mak': 'make', 'maek': 'make',
    'writ': 'write', 'wrte': 'write', 'wriet': 'write',
    'cod': 'code', 'cpde': 'code', 'coed': 'code',
    'websit': 'website', 'wesite': 'website',
    'progarm': 'program', 'programm': 'program',
    'algorythm': 'algorithm', 'algoritm': 'algorithm',
    'machien': 'machine', 'machin': 'machine',
    'enginer': 'engineer', 'engneer': 'engineer',
    'quantom': 'quantum', 'quntum': 'quantum',
    'phyics': 'physics', 'physic': 'physics',
    'mathamatics': 'mathematics', 'maths': 'mathematics',
    'chemestry': 'chemistry', 'chemisty': 'chemistry',
    # Hinglish patterns
    'bana': 'make/create', 'banao': 'make/create',
    'dikhao': 'show me', 'batao': 'tell me/explain',
    'samjhao': 'explain to me', 'likhna': 'write',
    'karo': 'do/make', 'chahiye': 'I need',
    'wala': 'related to', 'ke bare mein': 'about',
    # Banglish patterns
    'bolo': 'tell me', 'dekho': 'show',
    'likho': 'write',
    'shikhao': 'teach me', 'bujhao': 'explain',
    # Common abbreviations
    'pls': 'please', 'plz': 'please', 'thnks': 'thanks',
    'hw': 'how', 'wht': 'what', 'ur': 'your',
    'u': 'you', 'r': 'are', 'n': 'and', 'b4': 'before',
    'asap': 'as soon as possible', 'imo': 'in my opinion',
}

# ── Domain Classifier ─────────────────────────────────────
DOMAIN_PATTERNS = {
    'mechanical_engineering': [
        'shaft', 'torque', 'bearing', 'gear', 'coupling',
        'pulley', 'stress', 'strain', 'torsion', 'bending',
        'keyway', 'wbsctve', 'machine element',
        'lathe', 'milling', 'casting', 'forging', 'n/mm',
        'flange', 'hub', 'rpm', 'power transmission',
    ],
    'computer_science': [
        'code', 'algorithm', 'function', 'class', 'api',
        'database', 'javascript', 'python', 'react', 'sql',
        'debug', 'error', 'compile', 'deploy', 'git',
        'frontend', 'backend', 'server', 'framework',
    ],
    'cybersecurity': [
        'hack', 'pentest', 'vulnerability', 'exploit',
        'burp suite', 'nmap', 'sql injection', 'xss',
        'ctf', 'tryhackme', 'kali', 'payload', 'reverse',
        'malware', 'phishing', 'firewall', 'encryption',
    ],
    'medical': [
        'symptom', 'disease', 'medicine', 'treatment',
        'diagnosis', 'doctor', 'hospital', 'drug', 'dose',
        'surgery', 'infection', 'virus', 'antibiotic',
    ],
    'academic_general': [
        'notes', 'exam', 'syllabus', 'lecture', 'unit',
        'chapter', 'subject', 'topic', 'course', 'study',
        'diploma', 'degree', 'university', 'cbse', 'jee',
        'neet', 'gate', 'upsc', 'board exam', 'semester',
        'assignment', 'project report', 'thesis',
    ],
    'creative': [
        'story', 'poem', 'essay', 'script', 'novel',
        'character', 'plot', 'fiction', 'creative writing',
        'lyrics', 'song', 'haiku', 'dialogue',
    ],
    'business': [
        'business plan', 'marketing', 'revenue', 'startup',
        'investor', 'pitch', 'strategy', 'finance', 'profit',
        'customer', 'product', 'market', 'brand', 'sales',
    ],
}

# ── Real-time Data Triggers ───────────────────────────────
REALTIME_TRIGGERS = {
    'hard': [  # Always search
        'news', 'today', 'right now', 'live score', 'current',
        'latest', 'breaking', 'just happened', 'this week',
        'stock price', 'weather', 'trending', 'recently',
        'new release', 'update', 'just launched', '2025',
        '2026', 'yesterday', 'this morning', 'tonight',
    ],
    'soft': [  # Search only if ambiguous
        'who is', 'what is the current', 'how many now',
        'is still', 'does still', 'what happened to',
    ],
    'never': [  # Never search even if these words appear
        'explain', 'write code', 'make a website',
        'create a function', 'what is (concept)',
        'how does (concept) work', 'give me an example',
        'help me understand', 'generate', 'calculate',
        'design', 'build', 'implement',
    ],
}

# ── Casual / Emotional Patterns ───────────────────────────
CASUAL_PATTERNS = {
    'greeting': [
        'hi', 'hello', 'hey', 'hii', 'helo', 'heyyy',
        'good morning', 'good evening', 'good night',
        'wassup', 'sup', 'yo', 'howdy', 'namaste',
        'namaskar', 'salaam', 'hola', 'bonjour',
        'whats up', "what's up", 'kya haal', 'kemon acho',
    ],
    'farewell': [
        'bye', 'goodbye', 'see ya', 'later', 'take care',
        'cya', 'alvida', 'tata', 'babye',
    ],
    'gratitude': [
        'thanks', 'thank you', 'thx', 'thnx', 'tysm',
        'shukriya', 'dhanyawad', 'dhanybad',
    ],
    'emotional': [
        'sad', 'happy', 'angry', 'depressed', 'lonely',
        'excited', 'bored', 'stressed', 'anxious',
        'frustrated', 'proud', 'worried', "i'm feeling",
    ],
    'identity': [
        'who are you', 'what are you', 'tell me about yourself',
        'introduce yourself', 'what can you do',
        'are you ai', 'are you human', 'who made you',
        'who created you', 'who built you', 'what is lacunex',
        'tum kaun ho', 'apna parichay do',
    ],
}

# ── Academic Board Detection ──────────────────────────────
ACADEMIC_BOARDS = {
    'WBSCTVE': ['wbsctve', 'west bengal state council',
                 'wb diploma', 'wb polytechnic'],
    'CBSE': ['cbse', 'central board', 'class 10', 'class 12'],
    'MSBTE': ['msbte', 'maharashtra state board technical'],
    'GTU': ['gtu', 'gujarat technical university'],
    'AKTU': ['aktu', 'dr. a.p.j. abdul kalam technical'],
    'VTU': ['vtu', 'visvesvaraya technological'],
    'RGPV': ['rgpv', 'rajiv gandhi proudyogiki'],
    'JNTU': ['jntu', 'jawaharlal nehru technological'],
    'GATE': ['gate exam', 'gate preparation', 'gate 2025'],
    'JEE': ['jee main', 'jee advanced', 'iit jee'],
    'NEET': ['neet', 'medical entrance'],
    'UPSC': ['upsc', 'ias', 'civil services'],
}

# ── Image Request Patterns (from v2) ─────────────────────
_IMAGE_REQUEST_PATTERNS = [
    re.compile(r"\b(?:show|find|fine|search|get|see|fetch|display|look|look up)(?:\s+me)?(?:\s+some)?\s+.*(?:pictures?|images?|photos?|wallpapers?|wallapapers?|wallpappers?|wallppapers?|pix|pics|backgrounds?|wallp|walls?)\b", re.I),
    re.compile(r"\b(?:pictures?|images?|photos?|wallpapers?|wallapapers?|pix|pics|backgrounds?|wallp|walls?)\s+of\b", re.I),
]

_URL_PATTERN = re.compile(
    r"https?://[^\s]+|www\.[^\s]+\.[a-z]{2,}", re.I
)

# ── MAX OUTPUT Mode Trigger Patterns (from v2) ────────────
_MAX_OUTPUT_KEYWORDS = frozenset([
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
    "class notes", "exam notes", "study guide", "lecture notes",
    "complete syllabus", "all chapters", "every chapter",
    "practice questions", "question bank", "summary notes",
])

_MAX_OUTPUT_PATTERNS = [
    re.compile(r"\b(?:make|write|create|prepare|generate)\s+(?:me\s+)?(?:detailed|complete|full|comprehensive|thorough|in-depth|long|big)\s+(?:notes?|guide|report|explanation|document|material)\b", re.I),
    re.compile(r"\b(?:explain|describe|cover|teach|write about)\s+.{3,}\s+(?:in detail|in depth|thoroughly|completely|comprehensively|exhaustively|from scratch)\b", re.I),
    re.compile(r"\b(?:give|provide|create|generate|write)\s+(?:me\s+)?(?:a\s+)?(?:complete|full|detailed|comprehensive|thorough|exhaustive)\s+(?:guide|explanation|overview|report|analysis|notes?|document|summary|breakdown)\b", re.I),
    re.compile(r"\b(?:chapter\s+by\s+chapter|topic\s+by\s+topic|section\s+by\s+section|point\s+by\s+point)\b", re.I),
    re.compile(r"\b(?:\d+\s+pages?|multi(?:ple)?\s+pages?|many\s+pages?|lots?\s+of\s+pages?)\b", re.I),
]

# ── Reasoning Patterns (from v2) ─────────────────────────
_REASONING_PATTERNS = [
    re.compile(r"\b(?:solve|calculate|compute|prove|derive|integrate|differentiate|equation|algorithm|theorem|formula|math)\b", re.I),
    re.compile(r"\b(?:explain|analyze|analyse|critique|evaluate|break down)\s+.*(?:depth|detail|step by step|comprehensively|exactly)\b", re.I),
    re.compile(r"\b(?:compare and contrast|difference between|pros and cons|advantages|disadvantages)\b", re.I),
    re.compile(r"\bwrite\s+.*(?:essay|report|research|thesis|dissertation|article|summary|review)\b", re.I),
    re.compile(r"\b(?:why does|how does|what causes|impact of|reason for|consequences of)\b", re.I),
    re.compile(r"\b(?:code|script|build|develop|debug|architecture|system design|design a)\b", re.I),
    re.compile(r"\b(?:how would you|what is the best way to|design pattern)\b", re.I),
]

_MATH_EXPRESSION = re.compile(
    r"[\d\+\-\*\/\^=<>≤≥∑∫√π]+\s*[\+\-\*\/\^=<>≤≥]+\s*[\d\+\-\*\/\^=<>≤≥∑∫√π]+",
)


def detect_intent(message: str) -> Intent:
    """
    Master intent detection function.
    Analyzes message at multiple levels to understand
    true user intent regardless of language quality,
    spelling errors, or vague phrasing.
    """
    original = message
    clean = message.strip().lower()
    words = clean.split()

    # ── Step 1: Correct typos ──────────────────────────────
    corrected_words = []
    for word in words:
        corrected_words.append(
            CORRECTION_MAP.get(word, word)
        )
    corrected = ' '.join(corrected_words)

    # ── Step 2: Detect language mix ───────────────────────
    hinglish_words = sum(1 for w in words
                         if w in CORRECTION_MAP
                         and CORRECTION_MAP[w] in
                         ['make/create', 'tell me/explain',
                          'explain to me', 'write', 'show me'])
    banglish_words = sum(1 for w in words
                         if w in ['bolo', 'likho', 'shikhao',
                                  'bujhao', 'dekho', 'koro'])

    if hinglish_words > 0:
        lang = 'hinglish'
    elif banglish_words > 0:
        lang = 'banglish'
    elif any(ord(c) > 127 for c in message):
        lang = 'non-english'
    else:
        lang = 'english'

    # ── Step 3: Check casual patterns ─────────────────────
    is_casual = False
    casual_type = None
    for ctype, patterns in CASUAL_PATTERNS.items():
        if any(p in clean for p in patterns):
            if len(words) <= 8:  # Short messages only
                is_casual = True
                casual_type = ctype
                break

    # ── Step 4: Detect domain ─────────────────────────────
    domain = 'general'
    domain_score = {}
    for d, keywords in DOMAIN_PATTERNS.items():
        score = sum(1 for kw in keywords if kw in clean)
        if score > 0:
            domain_score[d] = score
    if domain_score:
        domain = max(domain_score, key=domain_score.get)

    # ── Step 5: Academic detection ─────────────────────────
    is_academic = False
    detected_board = None

    # Check for syllabus section numbering (3.1, 4.2, etc.)
    has_section_numbers = bool(
        re.search(r'\b\d+\.\d+\b', message)
    )

    # Check for academic keywords
    academic_keywords = [
        'notes', 'syllabus', 'lecture', 'unit', 'chapter',
        'course', 'exam', 'study material', 'explain topic',
        'lecturer', 'professor', 'teacher', 'student',
        'diploma', 'engineering', 'subject', 'semester',
    ]
    has_academic_kw = any(kw in clean for kw in academic_keywords)

    # Check for board names
    for board, patterns in ACADEMIC_BOARDS.items():
        if any(p in clean for p in patterns):
            detected_board = board
            is_academic = True
            break

    if has_section_numbers or has_academic_kw:
        is_academic = True
        domain = 'academic_' + domain

    # ── Step 6: Code detection ─────────────────────────────
    code_triggers = [
        'write code', 'create code', 'make a function',
        'python script', 'javascript', 'html css', 'react',
        'build an app', 'website', 'api', 'backend',
        'database', 'sql query', 'algorithm', 'class',
        'def ', 'function(', 'const ', 'let ', 'var ',
        'code for', 'code that', 'write a program',
        'implement', 'debug', 'fix this code', 'error in code',
    ]
    is_code = any(t in clean for t in code_triggers)
    # Also detect if message contains code blocks
    is_code = is_code or '```' in message or 'def ' in message

    # ── Step 7: Document/max-output detection ─────────────
    doc_triggers = [
        'complete notes', 'full notes', 'detailed notes',
        'comprehensive', 'make notes', 'generate notes',
        'notes on', 'notes for', 'write notes',
        'study material', 'full guide', 'complete guide',
        'detailed explanation', 'explain in detail',
        'explain everything', 'write an essay',
        'write a report', 'detailed report',
        'research paper', 'project report',
        'full explanation', '60 page', '100 page',
        'complete document', 'detailed document',
        'thorough', 'in-depth', 'exhaustive',
    ]
    is_document = any(t in clean for t in doc_triggers)
    # Academic with section numbers = always document
    if is_academic and has_section_numbers:
        is_document = True

    # ── Step 8: Web search detection ──────────────────────
    needs_search = False

    # Never search for these (even if search keywords appear)
    never_matched = False
    for never_trigger in REALTIME_TRIGGERS['never']:
        parts = never_trigger.replace('(concept)', '').split()
        if any(part in clean for part in parts if part):
            never_matched = True
            break

    if not never_matched:
        # Check hard triggers
        for trigger in REALTIME_TRIGGERS['hard']:
            if trigger in clean:
                needs_search = True
                break
        # Check soft triggers only for longer messages
        if not needs_search and len(words) > 5:
            for trigger in REALTIME_TRIGGERS['soft']:
                if trigger in clean:
                    needs_search = True
                    break

    # NEVER search for casual messages
    if is_casual:
        needs_search = False
    # NEVER search for code or document generation
    if is_code or is_document:
        needs_search = False

    # ── Step 9: Image generation detection ────────────────
    image_triggers = [
        '/imagine', 'generate image', 'create image',
        'draw', 'make image', 'generate a picture',
        'create art', 'make art', 'visualize',
        'generate photo', 'create illustration',
    ]
    needs_image = any(t in clean for t in image_triggers)

    # Also check image search patterns from v2
    image_search = False
    for pat in _IMAGE_REQUEST_PATTERNS:
        if pat.search(message):
            image_search = True
            needs_search = True
            break

    # ── Step 10: Creative detection ────────────────────────
    creative_triggers = [
        'write a story', 'write a poem', 'write a song',
        'create a story', 'write lyrics', 'write a script',
        'write a novel', 'write fiction', 'roleplay',
        'act as', 'pretend you are', 'be a character',
        'write an essay', 'write a creative',
    ]
    is_creative = any(t in clean for t in creative_triggers)

    # ── Step 11: Tone detection ────────────────────────────
    urgent_words = ['urgent', 'asap', 'immediately', 'quick',
                    'fast', 'hurry', 'now', 'emergency']
    emotional_words = ['please', 'help me', "i'm stuck",
                       "i don't understand", 'confused',
                       'struggling', 'desperate']
    formal_words = ['kindly', 'would you', 'could you',
                    'i require', 'i need', 'please provide']

    if any(w in clean for w in urgent_words):
        tone = 'urgent'
    elif any(w in clean for w in emotional_words):
        tone = 'supportive'
    elif any(w in clean for w in formal_words):
        tone = 'formal'
    elif is_casual:
        tone = 'casual'
    else:
        tone = 'neutral'

    # ── Step 12: Confidence calculation ───────────────────
    confidence = 0.5
    if is_casual and casual_type == 'greeting':
        confidence = 0.99
    elif is_academic and has_section_numbers:
        confidence = 0.97
    elif is_code and any(kw in clean for kw in
                         ['python', 'javascript', 'react', 'sql']):
        confidence = 0.95
    elif is_document:
        confidence = 0.90
    elif needs_search and any(t in clean
                               for t in REALTIME_TRIGGERS['hard']):
        confidence = 0.93

    # ── Step 13: Primary intent ────────────────────────────
    if is_casual:
        primary = 'casual_chat'
        sub_intent = casual_type or 'general'
    elif is_academic and is_document:
        primary = 'academic_notes'
        sub_intent = f'board_{detected_board}' if detected_board \
                     else 'general_academic'
    elif is_code:
        primary = 'code_generation'
        sub_intent = domain if domain != 'general' else 'general_code'
    elif is_document:
        primary = 'document_generation'
        sub_intent = domain
    elif is_creative:
        primary = 'creative_writing'
        sub_intent = domain
    elif needs_image:
        primary = 'image_generation'
        sub_intent = 'text_to_image'
    elif needs_search:
        primary = 'web_search'
        sub_intent = domain
    else:
        primary = 'knowledge_qa'
        sub_intent = domain

    # ── Step 14: Detect max_output & reasoning (v2 compat) ──
    msg_lower = clean
    max_output = is_document
    if not max_output:
        for kw in _MAX_OUTPUT_KEYWORDS:
            if kw in msg_lower:
                max_output = True
                break
    if not max_output:
        for pat in _MAX_OUTPUT_PATTERNS:
            if pat.search(message):
                max_output = True
                break
    if is_academic:
        max_output = True

    reasoning = False
    if _MATH_EXPRESSION.search(message):
        reasoning = True
    if not reasoning:
        for pat in _REASONING_PATTERNS:
            if pat.search(message):
                reasoning = True
                break
    if not reasoning and len(message) >= 100 and len(words) >= 18:
        reasoning = True
    if max_output:
        reasoning = True

    # URL detection
    url_match = _URL_PATTERN.search(message)
    url_fetch = bool(url_match)
    if url_fetch:
        needs_search = True

    intent_obj = Intent(
        primary=primary,
        sub_intent=sub_intent,
        confidence=confidence,
        is_academic=is_academic,
        is_code=is_code,
        is_document=is_document or max_output,
        is_creative=is_creative,
        is_casual=is_casual,
        needs_search=needs_search,
        needs_image=needs_image,
        language_hint=lang,
        corrected_query=corrected,
        tone=tone,
        domain=domain,
    )

    # Attach extra fields for backward compatibility
    intent_obj._max_output = max_output
    intent_obj._reasoning = reasoning
    intent_obj._image_search = image_search
    intent_obj._url_fetch = url_fetch
    intent_obj._detected_url = url_match.group(0) if url_match else None

    return intent_obj


def get_system_prompt_injection(intent: Intent) -> str:
    """
    Returns additional system prompt text based on intent.
    This is injected into the AI router's system prompt
    dynamically for each request.
    """
    injections = []

    if intent.is_casual and intent.sub_intent == 'greeting':
        injections.append(
            "The user is greeting you. Respond warmly and briefly. "
            "Be friendly and ask how you can help. "
            "Do NOT search the web. Do NOT generate a document."
        )

    if intent.tone == 'supportive':
        injections.append(
            "The user seems to be struggling or confused. "
            "Be extra patient, encouraging, and supportive. "
            "Break down your explanation into simple steps."
        )

    if intent.tone == 'urgent':
        injections.append(
            "The user needs a quick answer. "
            "Lead with the direct answer first, "
            "then add explanation if needed."
        )

    if intent.language_hint == 'hinglish':
        injections.append(
            "The user is writing in Hinglish (Hindi+English mix). "
            "Respond in clear English but acknowledge their "
            "Indian context. Use relatable Indian examples."
        )

    if intent.language_hint == 'banglish':
        injections.append(
            "The user is writing in Banglish (Bengali+English mix). "
            "Respond in clear English. Use relatable Bengali/WB context."
        )

    if intent.is_academic:
        board_note = ""
        if 'WBSCTVE' in intent.sub_intent:
            board_note = (
                "This is for WBSCTVE Diploma students in West Bengal. "
                "Reference IS codes, use N/mm² units, "
                "include WBSCTVE exam tips. "
                "Use the Given/Find/Solution numerical format. "
                "Adopt a warm lecturer tone: 'Now students...'"
            )
        elif 'CBSE' in intent.sub_intent:
            board_note = (
                "This is for CBSE students. "
                "Align with NCERT syllabus. "
                "Include CBSE board exam tips and marking scheme hints."
            )
        injections.append(board_note or
            "This is an academic notes request. "
            "Follow syllabus strictly. "
            "Include solved numericals. "
            "Use exam-oriented language."
        )

    if intent.domain == 'cybersecurity':
        injections.append(
            "This is a cybersecurity question. "
            "Provide accurate technical details. "
            "Include practical commands where relevant. "
            "Note: assume ethical/educational context."
        )

    return "\n".join(injections)


def intent_to_dict(intent: Intent) -> dict:
    """
    Convert Intent dataclass to backward-compatible dict
    for use in chat.py routes.
    """
    return {
        "web_search": intent.needs_search,
        "reasoning": getattr(intent, '_reasoning', False),
        "image_search": getattr(intent, '_image_search', False),
        "max_output": getattr(intent, '_max_output', False) or intent.is_document,
        "is_academic": intent.is_academic,
        "url_fetch": getattr(intent, '_url_fetch', False),
        "detected_url": getattr(intent, '_detected_url', None),
        # New v3 fields
        "primary": intent.primary,
        "sub_intent": intent.sub_intent,
        "confidence": intent.confidence,
        "is_code": intent.is_code,
        "is_creative": intent.is_creative,
        "is_casual": intent.is_casual,
        "needs_image": intent.needs_image,
        "language_hint": intent.language_hint,
        "corrected_query": intent.corrected_query,
        "tone": intent.tone,
        "domain": intent.domain,
    }


# Backward compatibility: keep the old needs_web_search function
def needs_web_search(message: str) -> bool:
    intent = detect_intent(message)
    return intent.needs_search
