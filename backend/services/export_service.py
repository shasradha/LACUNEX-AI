"""
Ephemeral export service for LACUNEX AI.
Generates .pdf, .docx, and .xlsx files in-memory.
No data is stored or logged.
"""

import io
import re
from datetime import datetime

BRAND_FOOTER = "\u00a9 Generated from Lacunex AI by Shasradha Karmakar"


def _ts() -> str:
    return datetime.utcnow().strftime("%B %d, %Y at %H:%M UTC")


def _clean(text: str) -> str:
    """Normalize line endings and remove null bytes."""
    return text.replace("\x00", "").replace("\r\n", "\n").replace("\r", "\n") if text else ""


def _pdf_safe(text: str) -> str:
    """
    Convert text to ASCII-safe string for FPDF Helvetica (Latin-1 font).
    Maps common Unicode chars to ASCII equivalents, drops the rest.
    """
    replacements = {
        "\u2018": "'", "\u2019": "'",          # smart single quotes
        "\u201c": '"', "\u201d": '"',          # smart double quotes
        "\u2013": "-", "\u2014": "--",         # en-dash, em-dash
        "\u2022": "*", "\u00b7": "*",          # bullet
        "\u2026": "...",                       # ellipsis
        "\u00a9": "(c)", "\u00ae": "(R)",      # copyright, registered
        "\u00b0": "deg", "\u00b1": "+/-",      # degree, plus-minus
        "\u00d7": "x", "\u00f7": "/",          # multiply, divide
        "\u2212": "-", "\u00ac": "not",        # minus sign, not
        "\u2260": "!=", "\u2264": "<=",        # not-equal, leq
        "\u2265": ">=", "\u221e": "inf",       # geq, infinity
        "\u03b1": "alpha", "\u03b2": "beta",   # Greek letters
        "\u03c0": "pi", "\u03bb": "lambda",
        "\u2192": "->", "\u2190": "<-",        # arrows
        "\u2713": "OK", "\u2717": "X",         # check, cross
    }
    out = []
    for ch in text:
        if ch in replacements:
            out.append(replacements[ch])
            continue
        try:
            ch.encode("latin-1")
            out.append(ch)
        except (UnicodeEncodeError, UnicodeDecodeError):
            out.append("?")
    return "".join(out)


_MD_BOLD = re.compile(r"\*{2,3}(.+?)\*{2,3}", re.DOTALL)
_MD_ITALIC = re.compile(r"\*(.+?)\*", re.DOTALL)
_MD_CODE_INLINE = re.compile(r"`([^`]+)`")
_MD_LINK = re.compile(r"\[([^\]]+)\]\([^)]+\)")
_MD_HEADING = re.compile(r"^#{1,6}\s+", re.MULTILINE)
_MD_HR = re.compile(r"^[-*_]{3,}$")


def _strip_md(text: str) -> str:
    """
    Fully strip markdown to produce clean plain text.
    Processes line-by-line for accuracy.
    """
    lines = []
    for line in text.split("\n"):
        # Headings
        line = re.sub(r"^#{1,6}\s+", "", line)
        # Bold/italic markers
        line = _MD_BOLD.sub(r"\1", line)
        line = _MD_ITALIC.sub(r"\1", line)
        # Inline code
        line = _MD_CODE_INLINE.sub(r"\1", line)
        # Links
        line = _MD_LINK.sub(r"\1", line)
        # HR → blank
        if _MD_HR.match(line.strip()):
            line = ""
        # Numbered / unordered lists → keep text cleanly
        line = re.sub(r"^(\s*)[-*]\s+", r"\1", line)
        line = re.sub(r"^(\s*)\d+\.\s+", r"\1", line)
        lines.append(line)
    return "\n".join(lines)


def _parse_blocks(content: str):
    """
    Parse content into a list of block dicts:
      { type: heading|bullet|text|code|blank|hr, level: int, text: str, lines: [...] }
    """
    blocks = []
    lines = content.split("\n")
    i = 0
    while i < len(lines):
        ln = lines[i]
        stripped = ln.strip()

        # Code fence
        if stripped.startswith("```"):
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code_lines.append(lines[i])
                i += 1
            blocks.append({"type": "code", "lines": code_lines})
            i += 1
            continue

        # Blank
        if not stripped:
            blocks.append({"type": "blank"})
            i += 1
            continue

        # HR
        if _MD_HR.match(stripped):
            blocks.append({"type": "hr"})
            i += 1
            continue

        # Heading
        m = re.match(r"^(#{1,4})\s+(.*)", stripped)
        if m:
            blocks.append({"type": "heading", "level": len(m.group(1)), "text": m.group(2).strip()})
            i += 1
            continue

        # Bullet (unordered)
        m = re.match(r"^[-*]\s+(.*)", stripped)
        if m:
            blocks.append({"type": "bullet", "text": m.group(1).strip()})
            i += 1
            continue

        # Numbered list
        m = re.match(r"^(\d+)\.\s+(.*)", stripped)
        if m:
            blocks.append({"type": "numbered", "number": int(m.group(1)), "text": m.group(2).strip()})
            i += 1
            continue

        # Regular text
        blocks.append({"type": "text", "text": stripped})
        i += 1

    return blocks


def _inline_runs(text: str):
    """Split text into runs with bold/italic/code markers parsed."""
    runs = []
    pattern = re.compile(r"(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*|`[^`]+`)")
    last = 0
    for m in pattern.finditer(text):
        if m.start() > last:
            runs.append({"text": text[last:m.start()], "bold": False, "italic": False, "code": False})
        token = m.group(0)
        if token.startswith("***"):
            runs.append({"text": token[3:-3], "bold": True, "italic": True, "code": False})
        elif token.startswith("**"):
            runs.append({"text": token[2:-2], "bold": True, "italic": False, "code": False})
        elif token.startswith("*"):
            runs.append({"text": token[1:-1], "bold": False, "italic": True, "code": False})
        else:
            runs.append({"text": token[1:-1], "bold": False, "italic": False, "code": True})
        last = m.end()
    if last < len(text):
        runs.append({"text": text[last:], "bold": False, "italic": False, "code": False})
    return runs or [{"text": text, "bold": False, "italic": False, "code": False}]


# ─────────────────────────────────────────────────────────────────────────────
#  PDF  — fpdf2, proper Unicode handling
# ─────────────────────────────────────────────────────────────────────────────

def generate_pdf(title: str, messages: list[dict], model_name: str | None = None) -> bytes:
    from fpdf import FPDF

    class LacunexPDF(FPDF):
        def footer(self):
            self.set_y(-15)
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(120, 120, 130)
            self.cell(0, 5, _pdf_safe(BRAND_FOOTER), align="C")

    pdf = LacunexPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    L = 20
    R = 20
    PW = 210 - L - R

    pdf.set_left_margin(L)
    pdf.set_right_margin(R)
    pdf.set_top_margin(20)

    # Title
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(20, 20, 40)
    pdf.multi_cell(PW, 8, _pdf_safe(_clean(title)), align="L")
    pdf.ln(2)

    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(140, 140, 150)
    pdf.cell(PW, 5, _pdf_safe(f"Exported on {_ts()}"), ln=True)

    pdf.set_draw_color(200, 200, 220)
    pdf.ln(4)
    pdf.line(L, pdf.get_y(), 210 - R, pdf.get_y())
    pdf.ln(6)

    for msg in messages:
        role = msg.get("role", "")
        raw = _clean(msg.get("content", ""))
        if not raw:
            continue

        is_user = role == "user"
        ai_label = f"Lacunex AI ({model_name})" if model_name else "Lacunex AI"

        pdf.set_font("Helvetica", "B", 9)
        if is_user:
            pdf.set_text_color(40, 110, 210)
        else:
            pdf.set_text_color(110, 60, 210)
            
        pdf.cell(PW, 6, "You" if is_user else _pdf_safe(ai_label), ln=True)
        pdf.ln(1)

        blocks = _parse_blocks(raw)
        for block in blocks:
            btype = block.get("type")

            if btype == "blank":
                pdf.ln(2)

            elif btype == "hr":
                pdf.set_draw_color(220, 220, 230)
                pdf.line(L, pdf.get_y(), 210 - R, pdf.get_y())
                pdf.ln(3)

            elif btype == "heading":
                lvl = block["level"]
                sizes = {1: 14, 2: 12, 3: 11, 4: 10}
                pdf.set_font("Helvetica", "B", sizes.get(lvl, 10))
                pdf.set_text_color(30, 30, 50)
                pdf.ln(2)
                pdf.multi_cell(PW, 6, _pdf_safe(block["text"]), align="L")
                pdf.ln(1)

            elif btype == "bullet":
                pdf.set_font("Helvetica", "", 10)
                pdf.set_text_color(40, 40, 60)
                clean_text = _strip_md(block["text"])
                
                # Indent bullets by changing margin
                pdf.set_left_margin(L + 6)
                # Render bullet point manually at X = L + 2
                old_x = pdf.get_x()
                pdf.set_x(L + 2)
                pdf.cell(4, 5.5, _pdf_safe("\u2022"))
                pdf.set_x(L + 6)
                pdf.multi_cell(PW - 6, 5.5, _pdf_safe(clean_text), align="L")
                pdf.set_left_margin(L)

            elif btype == "numbered":
                pdf.set_font("Helvetica", "", 10)
                pdf.set_text_color(40, 40, 60)
                clean_text = _strip_md(block["text"])
                num_str = f"{block['number']}."
                
                pdf.set_left_margin(L + 8)
                pdf.set_x(L + 2)
                pdf.cell(6, 5.5, _pdf_safe(num_str))
                pdf.set_x(L + 8)
                pdf.multi_cell(PW - 8, 5.5, _pdf_safe(clean_text), align="L")
                pdf.set_left_margin(L)

            elif btype == "code":
                pdf.set_fill_color(248, 248, 252)
                pdf.set_draw_color(220, 220, 240)
                pdf.set_font("Courier", "", 9)
                pdf.set_text_color(60, 50, 140)
                pdf.ln(2)
                for code_line in block.get("lines", []):
                    safe = _pdf_safe(code_line if code_line else " ")
                    # small indent for code block
                    pdf.set_x(L + 2)
                    pdf.multi_cell(PW - 4, 5, " " + safe, fill=True, border=0, align="L")
                pdf.set_font("Helvetica", "", 10)
                pdf.set_text_color(40, 40, 60)
                pdf.ln(3)

            elif btype == "text":
                clean_text = _strip_md(block["text"])
                pdf.set_font("Helvetica", "", 10)
                pdf.set_text_color(40, 40, 60)
                pdf.multi_cell(PW, 5.5, _pdf_safe(clean_text), align="L")

        pdf.ln(6)
        pdf.set_draw_color(230, 230, 240)
        pdf.line(L, pdf.get_y(), 210 - R, pdf.get_y())
        pdf.ln(6)

    return bytes(pdf.output())


# ─────────────────────────────────────────────────────────────────────────────
#  DOCX  — proper Word styles, no raw markdown
# ─────────────────────────────────────────────────────────────────────────────

def generate_docx(title: str, messages: list[dict], model_name: str | None = None) -> bytes:
    from docx import Document
    from docx.shared import Pt, RGBColor, Inches, Cm
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement

    doc = Document()
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.25)
        section.right_margin = Inches(1.25)

    # ── Helpers ────────────────────────────────────────────────────────────
    def add_hr():
        p = doc.add_paragraph()
        pPr = p._p.get_or_add_pPr()
        pBdr = OxmlElement("w:pBdr")
        bottom = OxmlElement("w:bottom")
        bottom.set(qn("w:val"), "single")
        bottom.set(qn("w:sz"), "4")
        bottom.set(qn("w:space"), "1")
        bottom.set(qn("w:color"), "CCCCDD")
        pBdr.append(bottom)
        pPr.append(pBdr)
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(2)

    def shade_para(p, color_hex: str):
        pPr = p._p.get_or_add_pPr()
        shd = OxmlElement("w:shd")
        shd.set(qn("w:val"), "clear")
        shd.set(qn("w:color"), "auto")
        shd.set(qn("w:fill"), color_hex)
        pPr.append(shd)

    def add_runs(para, text: str, base_size: float = 10.5, base_color=None):
        """Add inline-parsed runs to a paragraph."""
        if base_color is None:
            base_color = RGBColor(22, 22, 45)
        for r in _inline_runs(text):
            run = para.add_run(r["text"])
            run.bold = r["bold"]
            run.italic = r["italic"]
            run.font.size = Pt(base_size)
            if r["code"]:
                run.font.name = "Courier New"
                run.font.size = Pt(9)
                run.font.color.rgb = RGBColor(80, 55, 180)
            else:
                run.font.color.rgb = base_color

    # ── Title ────────────────────────────────────────────────────────────────
    tp = doc.add_paragraph()
    tr = tp.add_run(_clean(title))
    tr.bold = True
    tr.font.size = Pt(22)
    tr.font.color.rgb = RGBColor(12, 12, 38)
    tp.paragraph_format.space_after = Pt(4)

    dp = doc.add_paragraph()
    dr = dp.add_run(f"Exported on {_ts()}")
    dr.font.size = Pt(8.5)
    dr.font.color.rgb = RGBColor(145, 145, 168)
    dr.italic = True
    dp.paragraph_format.space_after = Pt(12)

    add_hr()

    # ── Messages ─────────────────────────────────────────────────────────────
    for msg in messages:
        role = msg.get("role", "")
        raw = _clean(msg.get("content", ""))
        if not raw:
            continue

        is_user = role == "user"

        # Sender label
        ai_label = f"Lacunex AI ({model_name})" if model_name else "Lacunex AI"
        lp = doc.add_paragraph()
        lr = lp.add_run("You" if is_user else ai_label)
        lr.bold = True
        lr.font.size = Pt(8.5)
        lr.font.color.rgb = RGBColor(40, 120, 215) if is_user else RGBColor(100, 65, 215)
        lp.paragraph_format.space_before = Pt(10)
        lp.paragraph_format.space_after = Pt(4)

        # Render blocks
        blocks = _parse_blocks(raw)
        for block in blocks:
            btype = block.get("type")

            if btype == "blank":
                sp = doc.add_paragraph()
                sp.paragraph_format.space_before = Pt(0)
                sp.paragraph_format.space_after = Pt(1)

            elif btype == "hr":
                add_hr()

            elif btype == "heading":
                lvl = block["level"]
                sizes = {1: 15, 2: 13, 3: 12, 4: 11}
                hp = doc.add_paragraph()
                hr_ = hp.add_run(block["text"])
                hr_.bold = True
                hr_.font.size = Pt(sizes.get(lvl, 11))
                hr_.font.color.rgb = RGBColor(14, 14, 40)
                hp.paragraph_format.space_before = Pt(8)
                hp.paragraph_format.space_after = Pt(3)

            elif btype == "bullet":
                bp = doc.add_paragraph(style="List Bullet")
                add_runs(bp, block["text"])
                bp.paragraph_format.space_after = Pt(1)

            elif btype == "numbered":
                np_ = doc.add_paragraph(style="List Number")
                add_runs(np_, block["text"])
                np_.paragraph_format.space_after = Pt(1)

            elif btype == "code":
                for cl in block.get("lines", []):
                    cp = doc.add_paragraph()
                    cr = cp.add_run(cl if cl else " ")
                    cr.font.name = "Courier New"
                    cr.font.size = Pt(9)
                    cr.font.color.rgb = RGBColor(65, 50, 160)
                    cp.paragraph_format.left_indent = Cm(0.5)
                    cp.paragraph_format.right_indent = Cm(0.5)
                    cp.paragraph_format.space_after = Pt(0)
                    shade_para(cp, "F0F0FA")

                gap = doc.add_paragraph()
                gap.paragraph_format.space_after = Pt(4)

            elif btype == "text":
                p = doc.add_paragraph()
                add_runs(p, block["text"])
                p.paragraph_format.space_after = Pt(3)

        add_hr()

    # ── Footer ────────────────────────────────────────────────────────────────
    fp = doc.add_paragraph()
    fr = fp.add_run(BRAND_FOOTER)
    fr.font.size = Pt(7.5)
    fr.font.color.rgb = RGBColor(155, 155, 175)
    fr.italic = True
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    fp.paragraph_format.space_before = Pt(16)

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────────────────────
#  XLSX  — markdown-free, structured
# ─────────────────────────────────────────────────────────────────────────────

def generate_xlsx(title: str, messages: list[dict], model_name: str | None = None) -> bytes:
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

    wb = Workbook()
    ws = wb.active
    ws.title = "Conversation"

    # Title row
    ws.merge_cells("A1:D1")
    ws["A1"] = _clean(title)
    ws["A1"].font = Font(bold=True, size=14, color="0A0A22")
    ws["A1"].alignment = Alignment(horizontal="left", vertical="center")

    # Subtitle row
    ws.merge_cells("A2:D2")
    ws["A2"] = f"Exported on {_ts()}"
    ws["A2"].font = Font(size=9, color="8282A0", italic=True)
    ws["A2"].alignment = Alignment(horizontal="left")

    ws.append([])  # spacer

    # Headers
    ws.append(["#", "Sender", "Message", "Timestamp"])
    hdr_row = ws.max_row
    hdr_fill = PatternFill("solid", fgColor="4A3FBF")
    for col in range(1, 5):
        cell = ws.cell(row=hdr_row, column=col)
        cell.font = Font(bold=True, color="FFFFFF", size=10)
        cell.fill = hdr_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")

    # Data
    thin = Side(style="thin", color="E0E0EE")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    user_fill = PatternFill("solid", fgColor="EEF3FF")
    ai_fill = PatternFill("solid", fgColor="F2EEFF")
    now = datetime.utcnow().isoformat()

    for idx, msg in enumerate(messages, start=1):
        role = msg.get("role", "user")
        # IMPORTANT: Strip all markdown to clean plain text for Excel
        raw_content = _clean(msg.get("content", ""))
        content = _strip_md(raw_content)
        if not content.strip():
            continue

        ai_label = f"Lacunex AI ({model_name})" if model_name else "Lacunex AI"
        sender = "You" if role == "user" else ai_label
        fill = user_fill if role == "user" else ai_fill
        ts = msg.get("created_at") or now

        ws.append([idx, sender, content, ts])
        data_row = ws.max_row
        for col in range(1, 5):
            cell = ws.cell(row=data_row, column=col)
            cell.fill = fill
            cell.border = border
            cell.alignment = Alignment(vertical="top", wrap_text=True)
            cell.font = Font(
                bold=(col == 2),
                size=9 if col == 2 else (8 if col == 4 else 10),
                color="828296" if col == 4 else "0A0A22",
            )

    ws.column_dimensions["A"].width = 5
    ws.column_dimensions["B"].width = 13
    ws.column_dimensions["C"].width = 85
    ws.column_dimensions["D"].width = 24
    ws.freeze_panes = "A5"

    ws.append([])
    ws.append(["", "", BRAND_FOOTER])
    footer_cell = ws.cell(row=ws.max_row, column=3)
    footer_cell.font = Font(size=8, color="9090B0", italic=True)

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────────────────────
#  DOCUMENT-MODE EXPORTS — from structured JSON (document_parser output)
# ─────────────────────────────────────────────────────────────────────────────

def _doc_flatten_content(section: dict, depth: int = 0) -> list[dict]:
    """Flatten a section tree into a list of renderable blocks for export."""
    blocks = []
    level = section.get("level", 2)
    heading = section.get("heading", "")

    if heading:
        blocks.append({"type": "heading", "level": level, "text": heading})

    if section.get("content"):
        for line in section["content"].split("\n"):
            stripped = line.strip()
            if not stripped:
                blocks.append({"type": "blank"})
            elif re.match(r"^[-*+]\s+", stripped):
                blocks.append({"type": "bullet", "text": re.sub(r"^[-*+]\s+", "", stripped)})
            elif re.match(r"^\d+\.\s+", stripped):
                m = re.match(r"^(\d+)\.\s+(.*)", stripped)
                blocks.append({"type": "numbered", "number": int(m.group(1)), "text": m.group(2)})
            else:
                blocks.append({"type": "text", "text": stripped})

    for table in section.get("tables", []):
        blocks.append({"type": "table", "data": table})

    for code in section.get("code_blocks", []):
        blocks.append({"type": "code", "lines": code.get("code", "").split("\n"), "language": code.get("language", "")})

    for highlight in section.get("highlights", []):
        blocks.append({"type": "callout", "text": highlight.get("text", "")})

    for sub in section.get("subsections", []):
        blocks.extend(_doc_flatten_content(sub, depth + 1))

    return blocks


def generate_document_pdf(doc_json: dict, theme: str = "professional") -> bytes:
    """Generate a themed PDF from structured document JSON."""
    from fpdf import FPDF
    from services.document_renderer import THEMES

    t = THEMES.get(theme, THEMES["professional"])
    title = doc_json.get("title", "Untitled Document")
    sections = doc_json.get("sections", [])
    toc = doc_json.get("table_of_contents", [])
    metadata = doc_json.get("metadata", {})

    class DocPDF(FPDF):
        def footer(self):
            self.set_y(-15)
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(120, 120, 130)
            self.cell(0, 5, _pdf_safe(BRAND_FOOTER), align="C")
            self.cell(0, 5, f"Page {self.page_no()}", align="R")

    pdf = DocPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=20)

    L, R = 20, 20
    PW = 210 - L - R

    pdf.set_left_margin(L)
    pdf.set_right_margin(R)
    pdf.set_top_margin(25)

    # ── Title Page ────────────────────────────────────────────────────────
    pdf.add_page()
    pdf.ln(50)
    pdf.set_font("Helvetica", "B", 28)
    pdf.set_text_color(15, 23, 42)
    pdf.multi_cell(PW, 12, _pdf_safe(_clean(title)), align="C")
    pdf.ln(8)

    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(100, 116, 139)
    subtitle = f"{metadata.get('total_sections', 0)} Sections | ~{metadata.get('total_pages_estimate', 1)} Pages"
    pdf.cell(PW, 6, _pdf_safe(subtitle), align="C", ln=True)
    pdf.ln(4)
    pdf.set_font("Helvetica", "I", 9)
    pdf.cell(PW, 5, _pdf_safe(f"Generated on {_ts()}"), align="C", ln=True)
    pdf.ln(8)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(37, 99, 235)
    pdf.cell(PW, 5, "LACUNEX AI", align="C", ln=True)
    pdf.set_text_color(15, 23, 42)

    # ── Table of Contents ─────────────────────────────────────────────────
    if toc:
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 18)
        pdf.cell(PW, 10, "Table of Contents", ln=True)
        pdf.ln(4)
        pdf.set_draw_color(200, 200, 220)
        pdf.line(L, pdf.get_y(), 210 - R, pdf.get_y())
        pdf.ln(6)

        for idx, entry in enumerate(toc):
            pdf.set_font("Helvetica", "B", 11)
            pdf.set_text_color(37, 99, 235)
            pdf.cell(8, 6, f"{idx + 1}.")
            pdf.set_text_color(15, 23, 42)
            pdf.cell(PW - 8, 6, _pdf_safe(entry.get("title", "")), ln=True)

            for child in entry.get("children", []):
                pdf.set_font("Helvetica", "", 9)
                pdf.set_text_color(100, 116, 139)
                pdf.cell(16, 5, "")
                pdf.cell(PW - 16, 5, _pdf_safe(child.get("title", "")), ln=True)

            pdf.ln(2)

        pdf.set_text_color(15, 23, 42)

    # ── Content Sections ──────────────────────────────────────────────────
    for section in sections:
        blocks = _doc_flatten_content(section)

        for block in blocks:
            btype = block.get("type")

            if btype == "blank":
                pdf.ln(2)

            elif btype == "heading":
                lvl = block.get("level", 2)
                sizes = {1: 18, 2: 14, 3: 12, 4: 10}
                pdf.ln(4)
                pdf.set_font("Helvetica", "B", sizes.get(lvl, 10))
                pdf.set_text_color(15, 23, 42)
                pdf.multi_cell(PW, 7, _pdf_safe(block["text"]), align="L")
                if lvl <= 2:
                    pdf.set_draw_color(200, 200, 220)
                    pdf.line(L, pdf.get_y() + 1, 210 - R, pdf.get_y() + 1)
                pdf.ln(3)

            elif btype == "bullet":
                pdf.set_font("Helvetica", "", 10)
                pdf.set_text_color(40, 40, 60)
                clean_text = _strip_md(block["text"])
                pdf.set_left_margin(L + 6)
                pdf.set_x(L + 2)
                pdf.cell(4, 5.5, _pdf_safe("\u2022"))
                pdf.set_x(L + 6)
                pdf.multi_cell(PW - 6, 5.5, _pdf_safe(clean_text), align="L")
                pdf.set_left_margin(L)

            elif btype == "numbered":
                pdf.set_font("Helvetica", "", 10)
                pdf.set_text_color(40, 40, 60)
                clean_text = _strip_md(block["text"])
                num_str = f"{block.get('number', '.')}."
                pdf.set_left_margin(L + 8)
                pdf.set_x(L + 2)
                pdf.cell(6, 5.5, _pdf_safe(num_str))
                pdf.set_x(L + 8)
                pdf.multi_cell(PW - 8, 5.5, _pdf_safe(clean_text), align="L")
                pdf.set_left_margin(L)

            elif btype == "text":
                clean_text = _strip_md(block["text"])
                pdf.set_font("Helvetica", "", 10)
                pdf.set_text_color(40, 40, 60)
                pdf.multi_cell(PW, 5.5, _pdf_safe(clean_text), align="L")
                pdf.ln(1)

            elif btype == "code":
                pdf.set_fill_color(241, 245, 249)
                pdf.set_draw_color(200, 200, 220)
                pdf.set_font("Courier", "", 8)
                pdf.set_text_color(60, 50, 140)
                pdf.ln(2)
                for code_line in block.get("lines", []):
                    safe = _pdf_safe(code_line if code_line else " ")
                    pdf.set_x(L + 2)
                    pdf.multi_cell(PW - 4, 4.5, " " + safe, fill=True, border=0, align="L")
                pdf.set_font("Helvetica", "", 10)
                pdf.set_text_color(40, 40, 60)
                pdf.ln(3)

            elif btype == "callout":
                pdf.set_fill_color(239, 246, 255)
                pdf.set_draw_color(59, 130, 246)
                pdf.set_font("Helvetica", "I", 9)
                pdf.set_text_color(30, 64, 175)
                pdf.ln(2)
                pdf.set_x(L + 4)
                pdf.multi_cell(PW - 8, 5, _pdf_safe(block.get("text", "")), fill=True, align="L")
                pdf.set_text_color(40, 40, 60)
                pdf.ln(3)

            elif btype == "table":
                table = block.get("data", {})
                headers = table.get("headers", [])
                rows = table.get("rows", [])
                if headers:
                    col_count = len(headers)
                    col_w = max(PW / col_count, 20)
                    pdf.ln(3)

                    # Header
                    pdf.set_font("Helvetica", "B", 8)
                    pdf.set_fill_color(30, 64, 175)
                    pdf.set_text_color(255, 255, 255)
                    for h in headers:
                        pdf.cell(col_w, 6, _pdf_safe(h[:25]), border=1, fill=True, align="C")
                    pdf.ln()

                    # Rows
                    pdf.set_font("Helvetica", "", 8)
                    pdf.set_text_color(40, 40, 60)
                    for ri, row in enumerate(rows):
                        if ri % 2 == 1:
                            pdf.set_fill_color(241, 245, 249)
                        else:
                            pdf.set_fill_color(255, 255, 255)
                        for ci, cell in enumerate(row):
                            pdf.cell(col_w, 5.5, _pdf_safe(str(cell)[:30]), border=1, fill=True, align="L")
                        pdf.ln()
                    pdf.ln(3)

    return bytes(pdf.output())


def generate_document_docx(doc_json: dict, theme: str = "professional") -> bytes:
    """Generate a themed DOCX from structured document JSON."""
    from docx import Document
    from docx.shared import Pt, RGBColor, Inches, Cm
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement

    doc = Document()
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.25)
        section.right_margin = Inches(1.25)

    title = doc_json.get("title", "Untitled Document")
    sections = doc_json.get("sections", [])
    toc = doc_json.get("table_of_contents", [])
    metadata = doc_json.get("metadata", {})

    def add_hr():
        p = doc.add_paragraph()
        pPr = p._p.get_or_add_pPr()
        pBdr = OxmlElement("w:pBdr")
        bottom = OxmlElement("w:bottom")
        bottom.set(qn("w:val"), "single")
        bottom.set(qn("w:sz"), "4")
        bottom.set(qn("w:space"), "1")
        bottom.set(qn("w:color"), "CCCCDD")
        pBdr.append(bottom)
        pPr.append(pBdr)

    def shade_para(p, color_hex: str):
        pPr = p._p.get_or_add_pPr()
        shd = OxmlElement("w:shd")
        shd.set(qn("w:val"), "clear")
        shd.set(qn("w:color"), "auto")
        shd.set(qn("w:fill"), color_hex)
        pPr.append(shd)

    # ── Title Page ────────────────────────────────────────────────────────
    tp = doc.add_paragraph()
    tp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    tp.paragraph_format.space_before = Pt(120)
    tr = tp.add_run(_clean(title))
    tr.bold = True
    tr.font.size = Pt(28)
    tr.font.color.rgb = RGBColor(15, 23, 42)

    sp = doc.add_paragraph()
    sp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sr = sp.add_run(f"{metadata.get('total_sections', 0)} Sections | ~{metadata.get('total_pages_estimate', 1)} Pages")
    sr.font.size = Pt(11)
    sr.font.color.rgb = RGBColor(100, 116, 139)

    dp = doc.add_paragraph()
    dp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    dr = dp.add_run(f"Generated on {_ts()}")
    dr.font.size = Pt(9)
    dr.font.color.rgb = RGBColor(148, 163, 184)
    dr.italic = True

    bp = doc.add_paragraph()
    bp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    br = bp.add_run("LACUNEX AI")
    br.bold = True
    br.font.size = Pt(10)
    br.font.color.rgb = RGBColor(37, 99, 235)

    doc.add_page_break()

    # ── Table of Contents ─────────────────────────────────────────────────
    if toc:
        tcp = doc.add_paragraph()
        tcr = tcp.add_run("Table of Contents")
        tcr.bold = True
        tcr.font.size = Pt(18)
        tcr.font.color.rgb = RGBColor(15, 23, 42)
        tcp.paragraph_format.space_after = Pt(12)
        add_hr()

        for idx, entry in enumerate(toc):
            ep = doc.add_paragraph()
            nr = ep.add_run(f"{idx + 1}. ")
            nr.bold = True
            nr.font.size = Pt(11)
            nr.font.color.rgb = RGBColor(37, 99, 235)
            er = ep.add_run(entry.get("title", ""))
            er.font.size = Pt(11)
            er.font.color.rgb = RGBColor(15, 23, 42)
            ep.paragraph_format.space_after = Pt(4)

            for child in entry.get("children", []):
                cp = doc.add_paragraph()
                cp.paragraph_format.left_indent = Cm(1)
                cr = cp.add_run(f"   {child.get('title', '')}")
                cr.font.size = Pt(9)
                cr.font.color.rgb = RGBColor(100, 116, 139)
                cp.paragraph_format.space_after = Pt(2)

        doc.add_page_break()

    # ── Content ───────────────────────────────────────────────────────────
    for section in sections:
        blocks = _doc_flatten_content(section)

        for block in blocks:
            btype = block.get("type")

            if btype == "heading":
                lvl = block.get("level", 2)
                sizes = {1: 18, 2: 15, 3: 13, 4: 11}
                hp = doc.add_paragraph()
                hr_ = hp.add_run(block["text"])
                hr_.bold = True
                hr_.font.size = Pt(sizes.get(lvl, 11))
                hr_.font.color.rgb = RGBColor(15, 23, 42)
                hp.paragraph_format.space_before = Pt(12)
                hp.paragraph_format.space_after = Pt(6)
                if lvl <= 2:
                    add_hr()

            elif btype == "bullet":
                bp = doc.add_paragraph(style="List Bullet")
                for r in _inline_runs(block["text"]):
                    run = bp.add_run(r["text"])
                    run.bold = r["bold"]
                    run.italic = r["italic"]
                    run.font.size = Pt(10.5)
                bp.paragraph_format.space_after = Pt(2)

            elif btype == "numbered":
                np_ = doc.add_paragraph(style="List Number")
                for r in _inline_runs(block["text"]):
                    run = np_.add_run(r["text"])
                    run.bold = r["bold"]
                    run.italic = r["italic"]
                    run.font.size = Pt(10.5)
                np_.paragraph_format.space_after = Pt(2)

            elif btype == "text":
                p = doc.add_paragraph()
                for r in _inline_runs(block["text"]):
                    run = p.add_run(r["text"])
                    run.bold = r["bold"]
                    run.italic = r["italic"]
                    run.font.size = Pt(10.5)
                    run.font.color.rgb = RGBColor(22, 22, 45)
                p.paragraph_format.space_after = Pt(4)

            elif btype == "code":
                for cl in block.get("lines", []):
                    cp = doc.add_paragraph()
                    cr = cp.add_run(cl if cl else " ")
                    cr.font.name = "Courier New"
                    cr.font.size = Pt(9)
                    cr.font.color.rgb = RGBColor(60, 50, 140)
                    cp.paragraph_format.left_indent = Cm(0.5)
                    cp.paragraph_format.space_after = Pt(0)
                    shade_para(cp, "F1F5F9")

            elif btype == "callout":
                cp = doc.add_paragraph()
                cr = cp.add_run(block.get("text", ""))
                cr.italic = True
                cr.font.size = Pt(10)
                cr.font.color.rgb = RGBColor(30, 64, 175)
                cp.paragraph_format.left_indent = Cm(0.5)
                shade_para(cp, "EFF6FF")

            elif btype == "table":
                table_data = block.get("data", {})
                headers = table_data.get("headers", [])
                rows = table_data.get("rows", [])
                if headers:
                    tbl = doc.add_table(rows=1 + len(rows), cols=len(headers))
                    tbl.style = "Table Grid"
                    # Headers
                    for ci, h in enumerate(headers):
                        cell = tbl.rows[0].cells[ci]
                        cell.text = h
                        for p in cell.paragraphs:
                            for r in p.runs:
                                r.bold = True
                                r.font.size = Pt(9)
                                r.font.color.rgb = RGBColor(255, 255, 255)
                        shd = OxmlElement("w:shd")
                        shd.set(qn("w:val"), "clear")
                        shd.set(qn("w:color"), "auto")
                        shd.set(qn("w:fill"), "1E40AF")
                        cell._tc.get_or_add_tcPr().append(shd)
                    # Rows
                    for ri, row in enumerate(rows):
                        for ci, val in enumerate(row):
                            if ci < len(tbl.columns):
                                cell = tbl.rows[ri + 1].cells[ci]
                                cell.text = str(val)
                                for p in cell.paragraphs:
                                    for r in p.runs:
                                        r.font.size = Pt(9)

            elif btype == "blank":
                doc.add_paragraph()

    # ── Footer ────────────────────────────────────────────────────────────
    add_hr()
    fp = doc.add_paragraph()
    fr = fp.add_run(BRAND_FOOTER)
    fr.font.size = Pt(8)
    fr.font.color.rgb = RGBColor(148, 163, 184)
    fr.italic = True
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def generate_document_xlsx(doc_json: dict, theme: str = "professional") -> bytes:
    """Generate a themed XLSX from structured document JSON — extracts all tables."""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

    wb = Workbook()
    title = doc_json.get("title", "Untitled Document")
    sections = doc_json.get("sections", [])

    # Remove default sheet
    wb.remove(wb.active)

    thin = Side(style="thin", color="CBD5E1")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    header_fill = PatternFill("solid", fgColor="1E40AF")
    stripe_fill = PatternFill("solid", fgColor="F1F5F9")

    table_count = 0

    def process_section_tables(section, sheet_prefix=""):
        nonlocal table_count
        sec_name = section.get("heading", "Section")

        for table in section.get("tables", []):
            table_count += 1
            headers = table.get("headers", [])
            rows = table.get("rows", [])
            if not headers:
                continue

            # Create a sheet for each table
            safe_name = re.sub(r"[^\w\s]", "", sec_name)[:25].strip()
            sheet_name = f"{safe_name}_{table_count}" if safe_name else f"Table_{table_count}"
            ws = wb.create_sheet(title=sheet_name)

            # Title row
            ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(headers))
            ws.cell(row=1, column=1, value=sec_name)
            ws.cell(row=1, column=1).font = Font(bold=True, size=12, color="0F172A")
            ws.cell(row=1, column=1).alignment = Alignment(horizontal="left")

            # Headers
            for ci, h in enumerate(headers, 1):
                cell = ws.cell(row=3, column=ci, value=h)
                cell.font = Font(bold=True, color="FFFFFF", size=10)
                cell.fill = header_fill
                cell.alignment = Alignment(horizontal="center", vertical="center")
                cell.border = border

            # Data rows
            for ri, row in enumerate(rows, 4):
                for ci, val in enumerate(row, 1):
                    cell = ws.cell(row=ri, column=ci, value=str(val))
                    cell.border = border
                    cell.alignment = Alignment(vertical="top", wrap_text=True)
                    cell.font = Font(size=10)
                    if (ri - 4) % 2 == 1:
                        cell.fill = stripe_fill

            # Auto-width
            for ci in range(1, len(headers) + 1):
                max_len = max(len(str(headers[ci - 1])), *[len(str(r[ci - 1])) if ci - 1 < len(r) else 0 for r in rows]) if rows else len(str(headers[ci - 1]))
                ws.column_dimensions[ws.cell(row=3, column=ci).column_letter].width = min(max_len + 4, 50)

        # Recurse into subsections
        for sub in section.get("subsections", []):
            process_section_tables(sub)

    for section in sections:
        process_section_tables(section)

    # If no tables found, create a summary sheet
    if table_count == 0:
        ws = wb.create_sheet(title="Document Summary")
        ws.cell(row=1, column=1, value=title)
        ws.cell(row=1, column=1).font = Font(bold=True, size=14)
        ws.cell(row=3, column=1, value="Section")
        ws.cell(row=3, column=2, value="Content Preview")
        ws.cell(row=3, column=1).font = Font(bold=True, color="FFFFFF")
        ws.cell(row=3, column=2).font = Font(bold=True, color="FFFFFF")
        ws.cell(row=3, column=1).fill = header_fill
        ws.cell(row=3, column=2).fill = header_fill

        for idx, section in enumerate(sections, 4):
            ws.cell(row=idx, column=1, value=section.get("heading", ""))
            ws.cell(row=idx, column=1).font = Font(bold=True, size=10)
            content_preview = (section.get("content", "")[:200] + "...") if section.get("content") else ""
            ws.cell(row=idx, column=2, value=content_preview)
            ws.cell(row=idx, column=2).alignment = Alignment(wrap_text=True)

        ws.column_dimensions["A"].width = 30
        ws.column_dimensions["B"].width = 80

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()

