"""
LACUNEX AI — Document Parser (Structured Output Engine)
Converts AI-generated markdown into structured JSON documents.

Pipeline position: Layer 2 (AI Markdown → Structured JSON)
Feeds into: document_renderer.py (Layer 3) and export_service.py (Layer 4)

v2.0 — Added content sanitization, duplicate detection, 
        structure validation, diagram field support
"""

import re
import unicodedata
from datetime import datetime, timezone
from typing import Optional


# ── Markdown Parsing Patterns ─────────────────────────────────────────────────

_HEADING = re.compile(r"^(#{1,6})\s+(.+)$", re.MULTILINE)
_TABLE_ROW = re.compile(r"^\|(.+)\|$")
_TABLE_SEP = re.compile(r"^\|[\s\-:|]+\|$")
_BULLET = re.compile(r"^(\s*)[-*+]\s+(.+)$")
_NUMBERED = re.compile(r"^(\s*)\d+\.\s+(.+)$")
_CODE_FENCE = re.compile(r"^```(\w*)\s*$")
_BOLD = re.compile(r"\*\*(.+?)\*\*")
_HIGHLIGHT_BOX = re.compile(
    r"^>\s*\*\*(?:Note|Tip|Important|Warning|Example|Key Point|Remember|Summary|Definition|Caution)[:\s]*\*\*\s*(.+)$",
    re.I | re.MULTILINE,
)
_HIGHLIGHT_TYPE = re.compile(
    r"^>\s*\*\*(Note|Tip|Important|Warning|Example|Key Point|Remember|Summary|Definition|Caution)[:\s]*\*\*",
    re.I,
)
_PRACTICE_Q = re.compile(
    r"^(?:\d+[\.)\]]\s*|[-*]\s+)?(?:Q[\.)\:]?\s*|Question[\.)\:]?\s*)(.+)$",
    re.I,
)

# Diagram-worthy keywords
_DIAGRAM_KEYWORDS = re.compile(
    r"\b(process|flow|architecture|relationship|hierarchy|lifecycle|stages|"
    r"pipeline|workflow|sequence|steps|phases|layers|components|structure|"
    r"diagram|chart|tree|graph|cycle|model)\b",
    re.I,
)


# ── Content Sanitization ─────────────────────────────────────────────────────

def _sanitize_text(text: str) -> str:
    """
    Deep-clean raw markdown text before parsing.
    Removes invalid chars, fixes encoding, strips artifacts.
    """
    if not text:
        return ""

    # 1. Remove null bytes and control chars (keep newline, tab, carriage return)
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)

    # 2. Normalize Unicode (NFC — composed form)
    text = unicodedata.normalize("NFC", text)

    # 3. Replace broken Unicode surrogate pairs with ?
    text = text.encode("utf-8", errors="replace").decode("utf-8", errors="replace")

    # 4. Fix common encoding artifacts (mojibake from UTF-8 misread as Latin-1)
    replacements = {
        "\u200b": "",   # zero-width space
        "\u200c": "",   # zero-width non-joiner
        "\u200d": "",   # zero-width joiner
        "\ufeff": "",   # BOM
        "\u00a0": " ",  # non-breaking space
    }
    for old, new in replacements.items():
        text = text.replace(old, new)

    # 5. Normalize line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # 6. Collapse excessive blank lines (max 2 consecutive)
    text = re.sub(r"\n{4,}", "\n\n\n", text)

    # 7. Strip trailing whitespace per line
    text = "\n".join(line.rstrip() for line in text.split("\n"))

    # 8. Strip LaTeX notation → plain text
    # Display math: $$...$$ → content
    text = re.sub(r'\$\$(.+?)\$\$', r'\1', text, flags=re.DOTALL)
    # Fractions: \frac{a}{b} → a/b
    text = re.sub(r'\\frac\{([^}]*)\}\{([^}]*)\}', r'\1/\2', text)
    # Square roots: \sqrt{x} → sqrt(x)
    text = re.sub(r'\\sqrt\{([^}]*)\}', r'sqrt(\1)', text)
    # Ket/bra: |\psi\rangle → |psi>
    text = re.sub(r'\|\\([a-zA-Z]+)\\rangle', r'|\1>', text)
    text = re.sub(r'\\langle\\([a-zA-Z]+)\|', r'<\1|', text)
    text = re.sub(r'\\rangle', '>', text)
    text = re.sub(r'\\langle', '<', text)
    # Common LaTeX commands → text
    _latex_map = {
        r'\\alpha': 'α', r'\\beta': 'β', r'\\gamma': 'γ',
        r'\\delta': 'δ', r'\\epsilon': 'ε', r'\\theta': 'θ',
        r'\\lambda': 'λ', r'\\mu': 'μ', r'\\pi': 'π',
        r'\\sigma': 'σ', r'\\phi': 'φ', r'\\psi': 'ψ',
        r'\\omega': 'ω', r'\\infty': '∞',
        r'\\times': '×', r'\\cdot': '·',
        r'\\rightarrow': '→', r'\\leftarrow': '←',
        r'\\Rightarrow': '⇒', r'\\Leftarrow': '⇐',
        r'\\leq': '≤', r'\\geq': '≥', r'\\neq': '≠',
        r'\\approx': '≈', r'\\equiv': '≡',
        r'\\quad': ' ', r'\\qquad': '  ',
    }
    for pattern, repl in _latex_map.items():
        text = re.sub(pattern, repl, text)
    # Remaining \command{arg} → arg
    text = re.sub(r'\\[a-zA-Z]+\{([^}]*)\}', r'\1', text)
    # Remaining \command → ""
    text = re.sub(r'\\[a-zA-Z]+', '', text)
    # Inline math: $...$ → content
    text = re.sub(r'\$([^$]+)\$', r'\1', text)
    # Clean leftover braces
    text = text.replace('{', '').replace('}', '')

    # 9. Fix stray/incomplete markdown fences
    fence_count = text.count("```")
    if fence_count % 2 != 0:
        text += "\n```"

    return text.strip()


def _detect_duplicate_paragraphs(content: str) -> str:
    """Remove duplicate paragraphs (exact or near-exact matches)."""
    if not content:
        return content

    paragraphs = content.split("\n\n")
    seen = set()
    unique = []

    for para in paragraphs:
        # Normalize for comparison: lowercase, strip whitespace, collapse spaces
        normalized = re.sub(r"\s+", " ", para.strip().lower())
        if len(normalized) < 10:
            unique.append(para)
            continue
        if normalized not in seen:
            seen.add(normalized)
            unique.append(para)

    return "\n\n".join(unique)


def _validate_sentence(text: str) -> bool:
    """Check if text contains at least one valid sentence."""
    if not text or not text.strip():
        return False
    stripped = text.strip()
    # Must have at least 3 words
    if len(stripped.split()) < 3:
        return False
    # Must not be just markdown symbols
    clean = re.sub(r"[#*_\-|`>]", "", stripped)
    return len(clean.strip()) > 5


def _is_meaningful_section(section: dict) -> bool:
    """Check if a section has meaningful content (not empty/broken)."""
    heading = (section.get("heading") or "").strip()
    content = (section.get("content") or "").strip()
    subsections = section.get("subsections", [])
    tables = section.get("tables", [])
    code_blocks = section.get("code_blocks", [])
    highlights = section.get("highlights", [])

    # Must have a heading
    if not heading:
        return False

    # Has content OR has sub-elements
    has_content = bool(content) and _validate_sentence(content)
    has_elements = bool(subsections) or bool(tables) or bool(code_blocks) or bool(highlights)

    return has_content or has_elements


def _detect_diagram_candidates(heading: str, content: str) -> bool:
    """Detect if a section is a good candidate for a diagram."""
    combined = f"{heading} {content}".lower()
    matches = _DIAGRAM_KEYWORDS.findall(combined)
    return len(matches) >= 2  # Need at least 2 keyword matches


# ── Table / Code Extraction ───────────────────────────────────────────────────

def _estimate_pages(text: str) -> int:
    """Estimate page count (approx 3000 chars/page for formatted content)."""
    return max(1, len(text) // 3000)


def _extract_tables(lines: list[str], start_idx: int) -> tuple[dict, int]:
    """Extract a markdown table starting at `start_idx`."""
    headers = []
    rows = []
    i = start_idx

    if i < len(lines) and _TABLE_ROW.match(lines[i].strip()):
        header_line = lines[i].strip()
        headers = [cell.strip() for cell in header_line.strip("|").split("|")]
        i += 1

    if i < len(lines) and _TABLE_SEP.match(lines[i].strip()):
        i += 1

    while i < len(lines) and _TABLE_ROW.match(lines[i].strip()):
        row_line = lines[i].strip()
        cells = [cell.strip() for cell in row_line.strip("|").split("|")]
        rows.append(cells)
        i += 1

    return {
        "headers": headers,
        "rows": rows,
        "row_count": len(rows),
        "col_count": len(headers),
    }, i


def _extract_code_block(lines: list[str], start_idx: int) -> tuple[dict, int]:
    """Extract a fenced code block starting at `start_idx`."""
    first_line = lines[start_idx].strip()
    lang_match = _CODE_FENCE.match(first_line)
    language = lang_match.group(1) if lang_match else ""
    i = start_idx + 1
    code_lines = []

    while i < len(lines):
        if lines[i].strip().startswith("```"):
            i += 1
            break
        code_lines.append(lines[i])
        i += 1

    return {
        "language": language,
        "code": "\n".join(code_lines),
        "line_count": len(code_lines),
    }, i


def _parse_inline(text: str) -> str:
    """Clean inline markdown for structured output (preserve for rendering)."""
    return text.strip()


def _detect_section_type(heading: str) -> str:
    """Detect special section types from heading text."""
    h_lower = heading.lower()
    if any(kw in h_lower for kw in ["table of contents", "toc", "contents"]):
        return "toc"
    if any(kw in h_lower for kw in ["summary", "recap", "key takeaway", "conclusion"]):
        return "summary"
    if any(kw in h_lower for kw in ["practice", "exercise", "question", "quiz", "test"]):
        return "practice"
    if any(kw in h_lower for kw in ["revision", "review", "flashcard"]):
        return "revision"
    if any(kw in h_lower for kw in ["example", "case study", "illustration"]):
        return "example"
    if any(kw in h_lower for kw in ["introduction", "overview", "preface"]):
        return "introduction"
    return "content"


def _detect_callout_type(line: str) -> str:
    """Detect the type of callout from a blockquote line."""
    match = _HIGHLIGHT_TYPE.match(line.strip())
    if match:
        type_str = match.group(1).lower().replace(" ", "_")
        type_map = {
            "note": "key_point", "tip": "key_point", "key_point": "key_point",
            "important": "important", "warning": "warning", "caution": "warning",
            "example": "example", "remember": "important",
            "summary": "summary", "definition": "definition",
        }
        return type_map.get(type_str, "key_point")
    return "key_point"


# ── Main Parser ───────────────────────────────────────────────────────────────

def parse_markdown_to_document(
    markdown: str,
    title: Optional[str] = None,
    theme: str = "professional",
) -> dict:
    """
    Convert AI-generated markdown into a structured JSON document.
    Includes full sanitization, duplicate detection, and diagram candidates.
    """
    # ── Sanitize input ────────────────────────────────────────────────────
    markdown = _sanitize_text(markdown)

    lines = markdown.split("\n")
    sections = []
    current_section = None
    current_subsection = None
    content_buffer = []
    tables = []
    code_blocks = []
    highlights = []

    def _flush_content():
        """Flush accumulated content buffer into current section/subsection."""
        nonlocal content_buffer
        text = "\n".join(content_buffer).strip()
        if not text:
            content_buffer = []
            return

        # Deduplicate paragraphs
        text = _detect_duplicate_paragraphs(text)

        if current_subsection is not None:
            current_subsection["content"] += ("\n\n" + text if current_subsection["content"] else text)
        elif current_section is not None:
            current_section["content"] += ("\n\n" + text if current_section["content"] else text)

        content_buffer = []

    def _ensure_section():
        """Ensure we have a current section, create one if needed."""
        nonlocal current_section, current_subsection
        if current_section is None:
            current_section = {
                "heading": title or "Document",
                "level": 1,
                "type": "content",
                "content": "",
                "subsections": [],
                "tables": [],
                "code_blocks": [],
                "highlights": [],
                "diagrams": [],
                "summary": "",
                "practice_questions": [],
                "diagram_candidate": False,
            }

    # Auto-detect title from first H1
    detected_title = title

    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # ── Code fence ────────────────────────────────────────────────────
        if _CODE_FENCE.match(stripped):
            _flush_content()
            _ensure_section()
            code_block, i = _extract_code_block(lines, i)
            code_blocks.append(code_block)
            if current_subsection is not None:
                current_subsection.setdefault("code_blocks", []).append(code_block)
            else:
                current_section["code_blocks"].append(code_block)
            continue

        # ── Table detection ───────────────────────────────────────────────
        if _TABLE_ROW.match(stripped) and i + 1 < len(lines) and _TABLE_SEP.match(lines[i + 1].strip()):
            _flush_content()
            _ensure_section()
            table, i = _extract_tables(lines, i)
            tables.append(table)
            if current_subsection is not None:
                current_subsection.setdefault("tables", []).append(table)
            else:
                current_section["tables"].append(table)
            continue

        # ── Heading detection ─────────────────────────────────────────────
        heading_match = _HEADING.match(stripped)
        if heading_match:
            level = len(heading_match.group(1))
            heading_text = heading_match.group(2).strip()

            # Auto-detect title from first H1
            if level == 1 and detected_title is None:
                detected_title = heading_text

            _flush_content()

            if level <= 2:
                # New top-level section
                if current_subsection is not None and current_section is not None:
                    current_section["subsections"].append(current_subsection)
                    current_subsection = None
                if current_section is not None:
                    sections.append(current_section)

                current_section = {
                    "heading": heading_text,
                    "level": level,
                    "type": _detect_section_type(heading_text),
                    "content": "",
                    "subsections": [],
                    "tables": [],
                    "code_blocks": [],
                    "highlights": [],
                    "diagrams": [],
                    "summary": "",
                    "practice_questions": [],
                    "diagram_candidate": False,
                }
                current_subsection = None
            else:
                # Subsection (H3+)
                _ensure_section()
                if current_subsection is not None:
                    current_section["subsections"].append(current_subsection)

                current_subsection = {
                    "heading": heading_text,
                    "level": level,
                    "type": _detect_section_type(heading_text),
                    "content": "",
                    "tables": [],
                    "code_blocks": [],
                    "highlights": [],
                }

            i += 1
            continue

        # ── Highlight/callout boxes ───────────────────────────────────────
        highlight_match = _HIGHLIGHT_BOX.match(stripped)
        if highlight_match:
            _ensure_section()
            callout_type = _detect_callout_type(stripped)
            highlight = {
                "type": callout_type,
                "text": highlight_match.group(1).strip(),
            }
            highlights.append(highlight)
            if current_subsection is not None:
                current_subsection["highlights"].append(highlight)
            elif current_section is not None:
                current_section["highlights"].append(highlight)
            i += 1
            continue

        # ── Regular content ───────────────────────────────────────────────
        content_buffer.append(line)
        i += 1

    # Flush remaining content
    _flush_content()
    if current_subsection is not None and current_section is not None:
        current_section["subsections"].append(current_subsection)
    if current_section is not None:
        sections.append(current_section)

    # ── Validate sections — remove empty/broken ones ─────────────────────────
    validated_sections = []
    for section in sections:
        if _is_meaningful_section(section):
            # Also validate subsections
            valid_subs = [s for s in section.get("subsections", [])
                          if (s.get("heading") or "").strip()]
            section["subsections"] = valid_subs
            validated_sections.append(section)
    sections = validated_sections

    # ── Detect diagram candidates ────────────────────────────────────────────
    for section in sections:
        content_for_check = section.get("content", "")
        for sub in section.get("subsections", []):
            content_for_check += " " + sub.get("content", "")
        section["diagram_candidate"] = _detect_diagram_candidates(
            section.get("heading", ""), content_for_check
        )

    # ── Enforce structure ordering ───────────────────────────────────────────
    # intro → content → example → practice → summary/conclusion
    type_order = {
        "introduction": 0, "toc": 0,
        "content": 1, "example": 2,
        "practice": 3, "revision": 3,
        "summary": 4,
    }
    sections.sort(key=lambda s: type_order.get(s.get("type", "content"), 1))

    # ── Build Table of Contents ──────────────────────────────────────────────
    toc = []
    for idx, section in enumerate(sections):
        toc_entry = {
            "title": section["heading"],
            "level": section["level"],
            "index": idx,
        }
        sub_entries = []
        for sub_idx, sub in enumerate(section.get("subsections", [])):
            sub_entries.append({
                "title": sub["heading"],
                "level": sub["level"],
                "parent_index": idx,
                "index": sub_idx,
            })
        toc_entry["children"] = sub_entries
        toc.append(toc_entry)

    # ── Extract practice questions (global scan) ─────────────────────────────
    all_practice = []
    for section in sections:
        if section["type"] == "practice":
            for line in section["content"].split("\n"):
                q_match = _PRACTICE_Q.match(line.strip())
                if q_match:
                    all_practice.append(q_match.group(1).strip())
            section["practice_questions"] = all_practice[-len(all_practice):]

    # ── Build final document ─────────────────────────────────────────────────
    final_title = detected_title or title or "Untitled Document"

    document = {
        "type": "document",
        "title": final_title,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "sections": sections,
        "table_of_contents": toc,
        "metadata": {
            "total_sections": len(sections),
            "total_subsections": sum(len(s.get("subsections", [])) for s in sections),
            "total_tables": len(tables),
            "total_code_blocks": len(code_blocks),
            "total_highlights": len(highlights),
            "total_pages_estimate": _estimate_pages(markdown),
            "total_diagram_candidates": sum(1 for s in sections if s.get("diagram_candidate")),
            "theme": theme,
            "character_count": len(markdown),
            "word_count": len(markdown.split()),
        },
    }

    return document


def document_to_flat_markdown(doc: dict) -> str:
    """Convert a structured document JSON back to clean markdown."""
    parts = []
    parts.append(f"# {doc['title']}\n")

    for section in doc.get("sections", []):
        level = section.get("level", 2)
        parts.append(f"\n{'#' * level} {section['heading']}\n")

        if section.get("content"):
            parts.append(section["content"])

        for table in section.get("tables", []):
            if table.get("headers"):
                parts.append("\n| " + " | ".join(table["headers"]) + " |")
                parts.append("| " + " | ".join(["---"] * len(table["headers"])) + " |")
                for row in table.get("rows", []):
                    parts.append("| " + " | ".join(row) + " |")
                parts.append("")

        for sub in section.get("subsections", []):
            sub_level = sub.get("level", 3)
            parts.append(f"\n{'#' * sub_level} {sub['heading']}\n")
            if sub.get("content"):
                parts.append(sub["content"])

            for table in sub.get("tables", []):
                if table.get("headers"):
                    parts.append("\n| " + " | ".join(table["headers"]) + " |")
                    parts.append("| " + " | ".join(["---"] * len(table["headers"])) + " |")
                    for row in table.get("rows", []):
                        parts.append("| " + " | ".join(row) + " |")
                    parts.append("")

    return "\n".join(parts)
