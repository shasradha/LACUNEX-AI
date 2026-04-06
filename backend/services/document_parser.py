"""
LACUNEX AI — Document Parser (Structured Output Engine)
Converts AI-generated markdown into structured JSON documents.

Pipeline position: Layer 2 (AI Markdown → Structured JSON)
Feeds into: document_renderer.py (Layer 3) and export_service.py (Layer 4)
"""

import re
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
    r"^>\s*\*\*(?:Note|Tip|Important|Warning|Example|Key Point|Remember|Summary|Definition)[:\s]*\*\*\s*(.+)$",
    re.I | re.MULTILINE,
)
_PRACTICE_Q = re.compile(
    r"^(?:\d+[\.\)]\s*|[-*]\s+)?(?:Q[\.\):]?\s*|Question[\.\):]?\s*)(.+)$",
    re.I,
)


def _estimate_pages(text: str) -> int:
    """Estimate page count (approx 3000 chars/page for formatted content)."""
    return max(1, len(text) // 3000)


def _extract_tables(lines: list[str], start_idx: int) -> tuple[dict, int]:
    """
    Extract a markdown table starting at `start_idx`.
    Returns (table_dict, next_line_index).
    """
    headers = []
    rows = []
    i = start_idx

    # Parse header row
    if i < len(lines) and _TABLE_ROW.match(lines[i].strip()):
        header_line = lines[i].strip()
        headers = [cell.strip() for cell in header_line.strip("|").split("|")]
        i += 1

    # Skip separator row
    if i < len(lines) and _TABLE_SEP.match(lines[i].strip()):
        i += 1

    # Parse data rows
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
    """
    Extract a fenced code block starting at `start_idx`.
    Returns (code_dict, next_line_index).
    """
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


def parse_markdown_to_document(
    markdown: str,
    title: Optional[str] = None,
    theme: str = "professional",
) -> dict:
    """
    Convert AI-generated markdown into a structured JSON document.
    
    Returns:
        {
            "type": "document",
            "title": str,
            "generated_at": str,
            "sections": [...],
            "table_of_contents": [...],
            "metadata": {...}
        }
    """
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
                "summary": "",
                "practice_questions": [],
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
                    "summary": "",
                    "practice_questions": [],
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
            highlight = {
                "type": "callout",
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

    # ── Build Table of Contents ───────────────────────────────────────────────
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

    # ── Extract practice questions (global scan) ──────────────────────────────
    all_practice = []
    for section in sections:
        if section["type"] == "practice":
            # Parse questions from content
            for line in section["content"].split("\n"):
                q_match = _PRACTICE_Q.match(line.strip())
                if q_match:
                    all_practice.append(q_match.group(1).strip())
            section["practice_questions"] = all_practice[-len(all_practice):]

    # ── Build final document ──────────────────────────────────────────────────
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
            "theme": theme,
            "character_count": len(markdown),
            "word_count": len(markdown.split()),
        },
    }

    return document


def document_to_flat_markdown(doc: dict) -> str:
    """
    Convert a structured document JSON back to clean markdown.
    Useful for export fallback.
    """
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
